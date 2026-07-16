"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { adminService, userService } from "@/services";
import { userCacheKey, LEGACY_USER_CACHE_KEY } from "@/lib/authSurface";

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
  mfaEnabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  refetchUser: () => Promise<User | null>;
  isLoading: boolean;
  error: any;
  login: (data: { emailOrCpf: string; password: string; accountType?: "USER" | "ORGANIZER" | "ADMIN_PODIO_STAFF"; turnstileToken?: string }) => Promise<{ mfaRequired: true; mfaToken: string } | void>;
  finishLoginMfa: (mfaToken: string, code: string, accountType?: "USER" | "ORGANIZER") => Promise<void>;
  register: (data: RegisterData) => Promise<{ id: string; email: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  complete_name: string;
  gender: string;
  phone: string;
  dateOfBirth: string;
  country: string;
  documentType: string;
  documentNumber: string;
  acceptedTerms: boolean;
  acceptedPrivacyPolicy: boolean;
  // Campos opcionais
  reserve_phone?: string;
  state?: string;
  city?: string;
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

      // Sem session hint da superfície ATUAL = deslogado nesta superfície. NÃO
      // restaura cache: isso é o que evita o vazamento entre superfícies (logar no
      // organizador não pode mostrar o storefront logado). O cache só é usado como
      // resiliência offline QUANDO há hint mas o /profile falha por rede (abaixo).
      if (!hasToken) {
        setUser(null);
        return;
      }

      // Se há token, tenta buscar o perfil
      try {
        const { data: profile } = await userService.getProfile();
        const userWithCache = { ...profile, _cachedAt: Date.now() };
        localStorage.setItem(userCacheKey(), JSON.stringify(userWithCache));
        setUser(profile);
      } catch (profileError: any) {
        console.error("Profile fetch failed:", profileError);

        const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

        // Se o erro não for 401/403, tenta usar cache
        if (profileError?.response?.status !== 401 && profileError?.response?.status !== 403) {
          try {
            const cachedUser = localStorage.getItem(userCacheKey());
            if (cachedUser) {
              const user = JSON.parse(cachedUser);
              if (user._cachedAt && Date.now() - user._cachedAt > CACHE_TTL_MS) {
                localStorage.removeItem(userCacheKey());
              } else {
                setUser(user);
                return;
              }
            }
          } catch (parseError) {
            console.warn("Failed to restore from cache after profile error");
          }
        }

        // Erro de autenticação no /auth/profile (ex.: JWT só de organizador).
        // Sem dica de sessão → realmente deslogado, limpa. Com dica → mantém o
        // cache (o interceptor do ApiClient já tentou refresh por cookie).
        if ((profileError?.response?.status === 401 || profileError?.response?.status === 403)) {
          if (!userService.isAuthenticated()) {
            clearAuthData();
          } else {
            try {
              const cachedUser = localStorage.getItem(userCacheKey());
              if (cachedUser) {
                const parsed = JSON.parse(cachedUser);
                if (parsed._cachedAt && Date.now() - parsed._cachedAt > CACHE_TTL_MS) {
                  localStorage.removeItem(userCacheKey());
                } else {
                  setUser(parsed);
                }
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
        // Auth por cookie httpOnly: refresh lê/escreve cookies no backend.
        // Nada de token em JS — só dispara se a dica de sessão estiver presente.
        if (userService.isAuthenticated()) {
          await userService.refreshToken();
        }
      } catch (error) {
        console.error("Automatic token refresh failed:", error);
        // Não limpa tokens em caso de erro de rede ou temporário
      }
    }, 12 * 60 * 60 * 1000); // 12 horas

    return () => clearInterval(refreshInterval);
  }, []);

  const clearAuthData = () => {
    localStorage.removeItem(userCacheKey());
    localStorage.removeItem(LEGACY_USER_CACHE_KEY); // limpa o cache global pré-isolamento
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
      localStorage.setItem(userCacheKey(), JSON.stringify(userWithCache));
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
          const cachedUser = localStorage.getItem(userCacheKey());
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

  const login = async (data: { emailOrCpf: string; password: string; accountType?: "USER" | "ORGANIZER" | "ADMIN_PODIO_STAFF"; turnstileToken?: string }): Promise<{ mfaRequired: true; mfaToken: string } | void> => {
    setIsLoading(true);
    setError(null);
    try {
      let response = null;
      if (data.accountType === "ADMIN_PODIO_STAFF") {
        response = await adminService.login({ emailOrCpf: data.emailOrCpf, password: data.password, turnstileToken: data.turnstileToken });
      } else {
        response = await userService.login({ emailOrCpf: data.emailOrCpf, password: data.password, accountType: data.accountType as any, turnstileToken: data.turnstileToken });
      }

      // 2FA requerido: repassa ao caller para exibir o passo OTP
      if (response.success && (response as any).mfaRequired) {
        return { mfaRequired: true, mfaToken: (response as any).mfaToken };
      }

      if (response.success && response.data?.user) {
        const user = response.data.user;
        const userWithCache = { ...user, _cachedAt: Date.now() };
        localStorage.setItem(userCacheKey(), JSON.stringify(userWithCache));
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
      const errorMessage =
        err.message || "Erro ao fazer login. Tente novamente.";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const finishLoginMfa = async (mfaToken: string, code: string, accountType?: "USER" | "ORGANIZER") => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await userService.verifyLoginMfa(mfaToken, code);
      if (response.success && response.data?.user) {
        const user = response.data.user;
        const userWithCache = { ...user, _cachedAt: Date.now() };
        localStorage.setItem(userCacheKey(), JSON.stringify(userWithCache));
        if (accountType === "ORGANIZER") {
          setUser(user as User);
        } else {
          await refetchUser();
        }
      } else {
        const errorMessage = response.error || "Código inválido. Tente novamente.";
        setError(errorMessage as any);
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Código inválido. Tente novamente.";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<{ id: string; email: string }> => {
    setIsLoading(true);
    setError(null);
    try {
      const createdUser = await userService.register({
        email: data.email,
        password: data.password,
        complete_name: data.complete_name,
        gender: data.gender,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth,
        country: data.country,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        acceptedTerms: data.acceptedTerms,
        acceptedPrivacyPolicy: data.acceptedPrivacyPolicy,
        reserve_phone: data.reserve_phone,
        state: data.state,
        city: data.city,
        sex: data.sex,
        receiveCalendarEvents: data.receiveCalendarEvents,
        receivePartnerPromos: data.receivePartnerPromos,
        language: data.language,
      });

      if (!createdUser) {
        throw new Error("Erro ao realizar cadastro: usuário não retornado");
      }

      /* Estabelece a SESSÃO httpOnly pós-cadastro.
       * Auth é por cookie httpOnly: o front não grava mais token em JS
       * (`setAccessToken` é no-op). O `/auth/register` devolve os tokens no BODY
       * mas — diferente do `/auth/login` — NÃO seta os cookies de sessão. Sem isto,
       * o usuário recém-criado fica "logado" no React (via `setUser` abaixo) porém
       * SEM cookie → a 1ª chamada autenticada (reserve do checkout, um `fetch` cru
       * que só usa o cookie) volta 401 "não autorizado".
       *
       * Fix: trocamos o `refresh_token` recém-emitido pela sessão httpOnly via
       * `/auth/refresh` (aceita o token no body como fallback e responde com
       * Set-Cookie dos tokens + hint da superfície). `withCredentials` grava o
       * cookie; não precisa de turnstile (já validado no cadastro). Gate por
       * `isAuthenticated()`: se o backend um dia passar a estabelecer a sessão no
       * próprio /register, pulamos a chamada redundante. */
      if (createdUser.refresh_token && !userService.isAuthenticated()) {
        try {
          await userService.refreshToken(createdUser.refresh_token);
        } catch (sessionErr) {
          // Falha aqui = sessão não estabelecida → o checkout cairia em 401.
          // Propaga pra o fluxo de cadastro tratar (toast) em vez de seguir com
          // uma sessão fantasma.
          console.error("Falha ao estabelecer sessão pós-cadastro:", sessionErr);
          throw new Error(
            "Conta criada, mas houve um problema ao iniciar sua sessão. Faça login para continuar.",
          );
        }
      }

      /* Inclui `country`, `documentType` e demais campos a partir do form —
       * sem isso o user fica com country vazio até o `refetchUser` background
       * terminar, e o checkout (que lê `user.country` pra escolher CPF vs
       * PASSPORT) pode disparar antes, caindo no fallback "Brasil" pra um
       * estrangeiro. Backend pode não devolver esses campos no /register.  */
      const userObj = {
        id: createdUser.id,
        email: createdUser.email,
        firstName: createdUser.firstName ?? "",
        lastName: createdUser.lastName ?? "",
        documentNumber: createdUser.documentNumber ?? data.documentNumber ?? "",
        documentType: data.documentType ?? "",
        country: data.country ?? "",
        phone: data.phone ?? "",
        dateOfBirth: data.dateOfBirth ?? "",
        gender: data.gender ?? "",
        role: createdUser.role,
        accountType: createdUser.accountType ?? "USER",
        avatarUrl: createdUser.avatarUrl ?? "",
      };
      localStorage.setItem(userCacheKey(), JSON.stringify({ ...userObj, _cachedAt: Date.now() }));
      setUser(userObj as any);

      // Busca o perfil completo em background para popular todos os campos do User
      refetchUser().catch(() => { });

      return { id: createdUser.id, email: createdUser.email };
    } catch (err: unknown) {
      console.error("Registration error:", err);
      const e = err as Error;
      const errorMessage = e?.message || "Erro ao realizar cadastro. Tente novamente.";
      setError(errorMessage as any);
      if (e instanceof Error) throw e;
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
    finishLoginMfa,
    register,
    logout,
    clearError,
    refetchUser,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};
