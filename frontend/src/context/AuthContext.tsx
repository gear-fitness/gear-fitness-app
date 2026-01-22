import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { storeToken, clearAuthToken, isAuthenticated } from "../utils/auth";
import { getCurrentUserProfile } from "../api/userService";
import { UserProfile } from "../api/types";
import AsyncStorage from '@react-native-async-storage/async-storage';

export type User = UserProfile;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => Promise<void>;
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
      const authenticated = await isAuthenticated();

      if (authenticated) {
        // Token exists, fetch user profile
        try {
          const userProfile = await getCurrentUserProfile();
          setUser(userProfile);
        } catch (profileError) {
          console.error("Failed to fetch user profile:", profileError);

          // Check if it's a 401 (expired token) vs network error
          if (
            profileError instanceof Error &&
            profileError.message.includes("401")
          ) {
            // Token expired or invalid
            await clearAuthToken();
            setUser(null);
            setAuthError("Session expired. Please login again.");
          } else {
            // Network error - keep token but show error
            setAuthError(
              "Unable to load profile. Please check your connection."
            );
            // Don't clear user or token - allow retry
          }
        }
      }
    } catch (error) {
      console.error("Failed to initialize auth:", error);
      await clearAuthToken();
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
  const login = async (token: string) => {
    try {
      setIsLoading(true);

      // Store token in SecureStore
      await storeToken(token);

      // Fetch and store user profile
      const userProfile = await getCurrentUserProfile();
      setUser(userProfile);
    } catch (error) {
      console.error("Login failed:", error);
      await clearAuthToken();
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
      await clearAuthToken();
      setUser(null);

      // Clear any in-progress workout
      await AsyncStorage.removeItem('@workout_state');
    } catch (error) {
      console.error("Logout failed:", error);
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
