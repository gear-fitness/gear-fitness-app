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

export type User = UserProfile;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      const authenticated = await isAuthenticated();

      if (authenticated) {
        // Token exists, fetch user profile
        const userProfile = await getCurrentUserProfile();
        setUser(userProfile);
      }
    } catch (error) {
      console.error("Failed to initialize auth:", error);
      // If profile fetch fails, clear token (might be expired)
      await clearAuthToken();
      setUser(null);
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

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    logout,
    refreshUser,
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
