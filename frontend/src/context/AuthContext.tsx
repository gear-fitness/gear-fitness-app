import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  storeTokens,
  clearAuthTokens,
  hasStoredTokens,
  getRefreshToken,
} from "../utils/auth";
import { getCurrentUserProfile } from "../api/userService";
import { UserProfile } from "../api/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { notificationService } from "../api/notificationService";
import { logoutFromServer } from "../api/authService";
import {
  isNetworkError,
  isOnline,
  probeNetwork,
  subscribeOnlineStatus,
} from "../utils/network";
import { getAllExercises, getAllExerciseHistory } from "../api/exerciseService";
import { getUserRoutines } from "../api/routineService";
import { getUserPersonalRecords, getUserWorkouts } from "../api/workoutService";
import {
  CACHE_KEYS,
  clearCache,
  readCache,
  setActiveUserId,
  writeCache,
} from "../utils/offlineCache";
import { flushWorkoutQueue } from "../utils/workoutQueue";
import { flushRoutineQueue } from "../utils/routineQueue";
import {
  cacheProfilePicture,
  loadProfilePictureCache,
} from "../utils/profilePictureCache";

export type User = UserProfile;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  authError: string | null;
  retryAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Initialize auth state on app start
  useEffect(() => {
    initializeAuth();
    // Warm the in-memory profile picture cache map so Avatars rendering on
    // first paint can resolve cached file URIs synchronously.
    loadProfilePictureCache().catch((err) => {
      console.error("Failed to load profile picture cache map:", err);
    });
  }, []);

  // Flush any workouts that were saved while offline. Run once on mount for
  // the case where the device was already online at launch, and again on
  // every offline→online transition. Sign-out drops the queue, so this is a
  // no-op when there's no active user.
  useEffect(() => {
    const tryFlush = async () => {
      try {
        const posted = await flushWorkoutQueue();
        if (posted > 0) {
          // Refresh the profile so the user sees new workout stats reflected,
          // and pull a fresh profile snapshot into the cache.
          try {
            await refreshUser();
          } catch {
            // Ignore — the flush succeeded; profile will refresh on next open.
          }
        }
      } catch (err) {
        console.error("Failed to flush offline workout queue:", err);
      }
      try {
        await flushRoutineQueue();
      } catch (err) {
        console.error("Failed to flush offline routine queue:", err);
      }
    };
    tryFlush();
    const unsubscribe = subscribeOnlineStatus((online) => {
      if (online) tryFlush();
    });

    // Probe the API when the app comes back to the foreground. Without this,
    // a device that's offline at launch and never makes any other request
    // would never notice connectivity returning, leaving queued workouts
    // stuck until the user manually triggers a refresh.
    const probe = () => {
      probeNetwork();
    };
    probe();
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") probe();
    });

    return () => {
      unsubscribe();
      sub.remove();
    };
  }, []);

  /**
   * Fire-and-forget the per-user cache fills so a first-time user who goes
   * offline before browsing still has the exercise catalog, routines, history
   * and PRs available. Each call is detached and isolated so one slow or
   * failing endpoint can't block the others or surface in the auth UI. Only
   * runs while online — offline would just thrash failing requests.
   */
  const prewarmOfflineCaches = (
    userId: string,
    profilePictureUrl?: string | null,
  ) => {
    if (!isOnline()) return;
    getAllExercises().catch((err) => {
      console.error("Pre-warm exercises failed:", err);
    });
    getUserRoutines().catch((err) => {
      console.error("Pre-warm routines failed:", err);
    });
    getUserWorkouts(userId).catch((err) => {
      console.error("Pre-warm workouts failed:", err);
    });
    getUserPersonalRecords(userId).catch((err) => {
      console.error("Pre-warm personal records failed:", err);
    });
    getAllExerciseHistory().catch((err) => {
      console.error("Pre-warm exercise history failed:", err);
    });
    if (profilePictureUrl) {
      cacheProfilePicture(profilePictureUrl).catch((err) => {
        console.error("Pre-warm profile picture failed:", err);
      });
    }
  };

  const registerPushToken = async () => {
    if (!Device.isDevice) return;

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("Failed to get push token permissions!");
      return;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    if (!projectId) return;

    try {
      const token = (await Notifications.getExpoPushTokenAsync({ projectId }))
        .data;
      await notificationService.registerToken(token);
    } catch (e) {
      console.error("Failed to register push token:", e);
    }
  };

  /**
   * Initialize authentication state
   * Checks if token exists and fetches user profile
   */
  const initializeAuth = async () => {
    try {
      setAuthError(null); // Reset error state
      const hasTokens = await hasStoredTokens();

      if (hasTokens) {
        // Paint from the cached profile first so the app is usable offline
        // without waiting for the network round-trip. The last-known user id
        // is used to scope per-user caches (routines, pending workouts).
        const lastUserId = await readCache<string>(CACHE_KEYS.lastUserId);
        let paintedFromCache = false;
        if (lastUserId) {
          const cachedProfile = await readCache<UserProfile>(
            CACHE_KEYS.userProfile(lastUserId),
          );
          if (cachedProfile) {
            setUser(cachedProfile);
            paintedFromCache = true;
          }
        }

        try {
          const userProfile = await getCurrentUserProfile();
          setUser(userProfile);
          await setActiveUserId(userProfile.userId);
          await writeCache(
            CACHE_KEYS.userProfile(userProfile.userId),
            userProfile,
          );
          await registerPushToken();
          prewarmOfflineCaches(
            userProfile.userId,
            userProfile.profilePictureUrl,
          );
        } catch (profileError: any) {
          if (isNetworkError(profileError)) {
            // Offline at launch — keep the tokens and the cached profile so
            // the user stays signed in. If we had no cached profile, fall
            // through to a soft error that lets retryAuth re-attempt later.
            if (!paintedFromCache) {
              setAuthError("You're offline. Connect to sign in.");
            }
          } else {
            console.error("Failed to fetch user profile:", profileError);
            await clearAuthTokens();
            await setActiveUserId(null);
            setUser(null);
            setAuthError("Session expired. Please login again.");
          }
        }
      }
    } catch (error) {
      console.error("Failed to initialize auth:", error);
      await clearAuthTokens();
      setUser(null);
      setAuthError("Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login user with JWT token
   * Stores token and fetches user profile
   */
  const login = async (accessToken: string, refreshToken: string) => {
    try {
      setIsLoading(true);
      await storeTokens(accessToken, refreshToken);
      const userProfile = await getCurrentUserProfile();
      setUser(userProfile);
      await setActiveUserId(userProfile.userId);
      await writeCache(CACHE_KEYS.userProfile(userProfile.userId), userProfile);
      await registerPushToken();
      prewarmOfflineCaches(userProfile.userId, userProfile.profilePictureUrl);
    } catch (error) {
      console.error("Login failed:", error);
      await clearAuthTokens();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout user
   * Clears token and user state
   */
  const logout = async () => {
    const currentUserId = user?.userId ?? null;
    try {
      await notificationService.unregisterToken();
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await logoutFromServer(refreshToken);
      }
      await clearAuthTokens();
      setUser(null);
      // Clear any in-progress workout
      await AsyncStorage.removeItem("@workout_state");
      // Drop the per-user offline caches so the next sign-in starts clean.
      if (currentUserId) {
        await clearCache(CACHE_KEYS.userProfile(currentUserId));
        await clearCache(CACHE_KEYS.routines(currentUserId));
        await clearCache(CACHE_KEYS.pendingWorkouts(currentUserId));
        await clearCache(CACHE_KEYS.pendingRoutines(currentUserId));
      }
      await setActiveUserId(null);
    } catch (error) {
      console.error("Logout failed:", error);
      // Still clear local state even if server call fails
      await clearAuthTokens();
      setUser(null);
      throw error;
    }
  };

  /**
   * Refresh user profile
   * Useful after profile updates
   */
  const refreshUser = async () => {
    try {
      const userProfile = await getCurrentUserProfile();
      setUser(userProfile);
      await setActiveUserId(userProfile.userId);
      await writeCache(CACHE_KEYS.userProfile(userProfile.userId), userProfile);
      if (userProfile.profilePictureUrl) {
        cacheProfilePicture(userProfile.profilePictureUrl).catch((err) => {
          console.error("Refresh profile picture cache failed:", err);
        });
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
      throw error;
    }
  };

  /**
   * Retry authentication initialization
   * Useful after network errors
   */
  const retryAuth = async () => {
    setIsLoading(true);
    await initializeAuth();
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    logout,
    refreshUser,
    authError,
    retryAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to access auth context
 * Must be used within AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
