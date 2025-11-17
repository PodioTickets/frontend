"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { userService } from "@/services";

interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  balance: number;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  refetchUser: () => void;
  isLoading: boolean;
  error: any;
  login: (data: { email: string; password: string }) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        const hasToken = userService.isAuthenticated();
        if (hasToken && storedUser) {
          try {
            const cachedUser = JSON.parse(storedUser);
            const cacheAge = Date.now() - (cachedUser._cachedAt || 0);
            if (cacheAge < 5 * 60 * 1000) {
              setUser(cachedUser);
              return;
            }
          } catch (parseError) {
            console.warn("Failed to parse cached user data");
          }
        }

        if (hasToken) {
          try {
            const profile = await userService.getProfile();
            const userWithCache = { ...profile, _cachedAt: Date.now() };
            localStorage.setItem("user", JSON.stringify(userWithCache));
            setUser(profile);
          } catch (profileError) {
            console.error("Profile fetch failed:", profileError);
            if (storedUser) {
              try {
                const cachedUser = JSON.parse(storedUser);
                setUser(cachedUser);
              } catch (parseError) {
                console.warn(
                  "Failed to restore from cache after profile error"
                );
                clearAuthData();
              }
            }
          }
        } else if (storedUser) {
          clearAuthData();
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        clearAuthData();
      }
    };

    checkAuth();
  }, []);

  const clearAuthData = () => {
    localStorage.removeItem("user");
    userService.logout();
    setUser(null);
    setError(null);
  };

  const refetchUser = async () => {
    const profile = await userService.getProfile();
    localStorage.setItem("user", JSON.stringify(profile));
    setUser(profile);
  };

  const login = async (data: { email: string; password: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await userService.login(data);
      if (response.success && response.data?.user) {
        const user = response.data.user;
        if (response.data.access_token) {
          const apiClient = (userService as any).apiClient;
          if (apiClient && apiClient.setAccessToken) {
            apiClient.setAccessToken(response.data.access_token);
            if (response.data.refresh_token) {
              apiClient.setRefreshToken(response.data.refresh_token);
            }
          }
        }
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);
      } else {
        const errorMessage =
          response.error || "Login failed. Please try again.";
        setError(errorMessage as any);
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error("Login error:", err);
      const errorMessage = err.message || "Login failed. Please try again.";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await userService.register(data);

      if (user) {
        const loginData = { email: data.email, password: data.password };
        const response: any = await userService.login(loginData);
        if (response.success && response.data?.user) {
          const loggedUser = response.data.user;
          if (response.data.access_token) {
            const apiClient = (userService as any).apiClient;
            if (apiClient && apiClient.setAccessToken) {
              apiClient.setAccessToken(response.data.access_token);
              if (response.data.refresh_token) {
                apiClient.setRefreshToken(response.data.refresh_token);
              }
            }
          }
          localStorage.setItem("user", JSON.stringify(loggedUser));
          setUser(loggedUser);
        } else {
          const errorMessage =
            response.error || "Registration successful but auto-login failed";
          setError(errorMessage);
          throw new Error(errorMessage);
        }
      } else {
        throw new Error("Registration failed");
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      const errorMessage =
        err.message || "Registration failed. Please try again.";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await userService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearAuthData();
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    setUser,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
    refetchUser,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};
