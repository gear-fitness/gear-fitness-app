import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  storeTokens,
  clearAuthTokens,
  hasStoredTokens,
  getRefreshToken,
} from "../utils/auth";
import { getCurrentUserProfile } from "../api/userService";
import { UserProfile } from "../api/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logoutFromServer } from "../api/authService";

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
  }, []);

  /**
   * Initialize authentication state
   * Checks if token exists and fetches user profile
   */
  const initializeAuth = async () => {
    try {
      setAuthError(null); // Reset error state
      const hasTokens = await hasStoredTokens();

      if (hasTokens) {
        try {
          const userProfile = await getCurrentUserProfile();
          setUser(userProfile);
        } catch (profileError) {
          console.error("Failed to fetch user profile:", profileError);
          await clearAuthTokens();
          setUser(null);
          setAuthError("Session expired. Please login again.");
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
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await logoutFromServer(refreshToken);
      }
      await clearAuthTokens();
      setUser(null);
      // Clear any in-progress workout
      await AsyncStorage.removeItem("@workout_state");
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
