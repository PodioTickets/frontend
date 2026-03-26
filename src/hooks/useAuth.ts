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
  firstName: string;
  lastName: string;
  documentNumber: string;
  documentType: string;
  gender: string;
  phone: string;
  dateOfBirth: string;
  country: string;
  state: string;
  city: string;
  role: string;
  avatarUrl: string;
  hasPassword?: boolean;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  refetchUser: () => Promise<User | null>;
  isLoading: boolean;
  error: any;
  login: (data: { emailOrCpf: string; password: string; accountType?: "USER" | "ORGANIZER" }) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  complete_name: string;
  acceptedTerms: boolean;
  acceptedPrivacyPolicy: boolean;
  // Campos opcionais
  gender?: string;
  phone?: string;
  reserve_phone?: string;
  dateOfBirth?: string | Date;
  country?: string;
  state?: string;
  city?: string;
  documentType?: string;
  documentNumber?: string;
  sex?: string;
  receiveCalendarEvents?: boolean;
  receivePartnerPromos?: boolean;
  language?: string;
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
      const hasToken = userService.isAuthenticated();
      
      // Se não há token, tenta restaurar do cache
      if (!hasToken) {
        try {
          const cachedUser = localStorage.getItem("user");
          if (cachedUser) {
            const user = JSON.parse(cachedUser);
            // Verifica se o cache não está muito antigo (30 dias)
            const cacheAge = Date.now() - (user._cachedAt || 0);
            if (cacheAge < 30 * 24 * 60 * 60 * 1000) {
              setUser(user);
              return;
            }
          }
        } catch (e) {
          console.warn("Failed to restore user from cache:", e);
        }
        return;
      }

      // Se há token, tenta buscar o perfil
      try {
        const { data: profile } = await userService.getProfile();
        const userWithCache = { ...profile, _cachedAt: Date.now() };
        localStorage.setItem("user", JSON.stringify(userWithCache));
        setUser(profile);
      } catch (profileError: any) {
        console.error("Profile fetch failed:", profileError);
        
        // Se o erro não for 401/403, tenta usar cache
        if (profileError?.response?.status !== 401 && profileError?.response?.status !== 403) {
          try {
            const cachedUser = localStorage.getItem("user");
            if (cachedUser) {
              const user = JSON.parse(cachedUser);
              setUser(user);
              return;
            }
          } catch (parseError) {
            console.warn("Failed to restore from cache after profile error");
          }
        }
        
        // Erro de autenticação no /auth/profile (ex.: JWT só de organizador)
        if ((profileError?.response?.status === 401 || profileError?.response?.status === 403)) {
          const apiClient = (userService as any).apiClient;
          const refreshToken = apiClient?.getRefreshToken?.();
          if (!refreshToken) {
            clearAuthData();
          } else {
            try {
              const cachedUser = localStorage.getItem("user");
              if (cachedUser) {
                setUser(JSON.parse(cachedUser));
              }
            } catch {
              /* ignore */
            }
          }
        }
      }
    };

    checkAuth();

    // Refresh automático do token a cada 12 horas para manter sessão ativa
    const refreshInterval = setInterval(async () => {
      try {
        const apiClient = (userService as any).apiClient;
        const refreshToken = apiClient?.getRefreshToken?.();
        if (refreshToken && userService.isAuthenticated()) {
          const response = await userService.refreshToken(refreshToken);
          if (response?.access_token) {
            apiClient.setAccessToken(response.access_token);
            if (response.refresh_token) {
              apiClient.setRefreshToken(response.refresh_token);
            }
          }
        }
      } catch (error) {
        console.error("Automatic token refresh failed:", error);
        // Não limpa tokens em caso de erro de rede ou temporário
      }
    }, 12 * 60 * 60 * 1000); // 12 horas

    return () => clearInterval(refreshInterval);
  }, []);

  const clearAuthData = () => {
    localStorage.removeItem("user");
    const apiClient = (userService as any).apiClient;
    if (apiClient && apiClient.clearTokens) {
      apiClient.clearTokens();
    }
    setUser(null);
    setError(null);
  };

  const refetchUser = async () => {
    try {
      const { data } = await userService.getProfile();
      const userWithCache = { ...data, _cachedAt: Date.now() };
      localStorage.setItem("user", JSON.stringify(userWithCache));
      setUser(data);
      return data;
    } catch (error: any) {
      console.error("Error refetching user:", error);
      
      // Só limpa dados se for erro de autenticação (401/403)
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        clearAuthData();
      } else {
        // Para outros erros, tenta usar cache
        try {
          const cachedUser = localStorage.getItem("user");
          if (cachedUser) {
            const user = JSON.parse(cachedUser);
            setUser(user);
            return user;
          }
        } catch (parseError) {
          console.warn("Failed to restore from cache");
        }
      }
      throw error;
    }
  };

  const login = async (data: { emailOrCpf: string; password: string; accountType?: "USER" | "ORGANIZER" }) => {
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
        const userWithCache = { ...user, _cachedAt: Date.now() };
        localStorage.setItem("user", JSON.stringify(userWithCache));
        // JWT de organizador não deve chamar /auth/profile (participante): 401/403 limpa sessão em refetchUser.
        if (data.accountType === "ORGANIZER") {
          setUser(user as User);
        } else {
          await refetchUser();
        }
      } else {
        const errorMessage =
          response.error || "Erro ao fazer login. Tente novamente.";
        setError(errorMessage as any);
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error("Login error:", err);
      const errorMessage =
        err.message || "Erro ao fazer login. Tente novamente.";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    setError(null);
    try {
      const registerRequest: any = {
        email: data.email,
        password: data.password,
        complete_name: data.complete_name,
        acceptedTerms: data.acceptedTerms,
        acceptedPrivacyPolicy: data.acceptedPrivacyPolicy,
      };

      // Campos opcionais
      if (data.gender) registerRequest.gender = data.gender;
      if (data.phone) registerRequest.phone = data.phone;
      if (data.reserve_phone)
        registerRequest.reserve_phone = data.reserve_phone;
      if (data.dateOfBirth) {
        // Converte Date para string no formato YYYY-MM-DD
        if (typeof data.dateOfBirth === "string") {
          registerRequest.dateOfBirth = data.dateOfBirth;
        } else if (data.dateOfBirth instanceof Date) {
          const year = data.dateOfBirth.getFullYear();
          const month = String(data.dateOfBirth.getMonth() + 1).padStart(
            2,
            "0"
          );
          const day = String(data.dateOfBirth.getDate()).padStart(2, "0");
          registerRequest.dateOfBirth = `${year}-${month}-${day}`;
        }
      }
      if (data.country) registerRequest.country = data.country;
      if (data.state) registerRequest.state = data.state;
      if (data.city) registerRequest.city = data.city;
      if (data.documentType) registerRequest.documentType = data.documentType;
      if (data.documentNumber)
        registerRequest.documentNumber = data.documentNumber;
      if (data.sex) registerRequest.sex = data.sex;
      if (data.receiveCalendarEvents !== undefined)
        registerRequest.receiveCalendarEvents = data.receiveCalendarEvents;
      if (data.receivePartnerPromos !== undefined)
        registerRequest.receivePartnerPromos = data.receivePartnerPromos;
      if (data.language) registerRequest.language = data.language;

      const user = await userService.register(registerRequest);

      if (!user) {
        throw new Error("Erro ao realizar cadastro: usuário não retornado");
      }

      const loginData = {
        emailOrCpf: data.email,
        password: data.password,
      };

      try {
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
          const userWithCache = { ...loggedUser, _cachedAt: Date.now() };
          localStorage.setItem("user", JSON.stringify(userWithCache));
          setUser(loggedUser);
        } else {
          // Se o login automático falhar, ainda consideramos o registro como sucesso
          // mas não fazemos login automático
          const errorMessage =
            response.error ||
            "Cadastro realizado, mas o login automático falhou. Faça login manualmente.";
          console.warn("Login automático após registro falhou:", errorMessage);
          // Não lança erro aqui, apenas avisa
          setError(errorMessage);
        }
      } catch (loginError: any) {
        // Se o login automático falhar, ainda consideramos o registro como sucesso
        console.warn("Erro no login automático após registro:", loginError);
        const errorMessage =
          loginError.message ||
          "Cadastro realizado, mas o login automático falhou. Faça login manualmente.";
        setError(errorMessage);
        // Não relança o erro para não quebrar o fluxo de registro
      }
    } catch (err: unknown) {
      console.error("Registration error:", err);
      const e = err as Error;
      const errorMessage =
        e?.message || "Erro ao realizar cadastro. Tente novamente.";
      setError(errorMessage as any);
      if (e instanceof Error) {
        throw e;
      }
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
