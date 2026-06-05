import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import Cookies from "js-cookie";
import { getActivitySessionId } from "@/lib/activityTelemetry";

// Tipos base para respostas de API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T | any;
  error?: string;
  message?: string;
  timestamp?: string;
}

export function getApiClient() {
  return new ApiClient(
    (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333").replace(/\/$/, "")
  );
}

// Classe base para cliente HTTP
export class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 15000,
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  getBaseURL(): string {
    return this.client.defaults.baseURL || "";
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        if (config.method?.toLowerCase() === "get") {
          config.params = { ...config.params };
        }

        if (this.needsCsrfProtection(config)) {
          const csrfToken = await this.getToken();
          if (csrfToken) {
            config.headers["x-csrf-token"] = csrfToken;
          } else {
            console.warn(
              "Token CSRF não encontrado para requisição protegida:",
              config.url
            );
          }
        }
        const token = this.getAccessToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;

        // Identidade de telemetria: o backend usa este header pra costurar a
        // jornada (page view anônimo ↔ checkout autenticado) nos registros de
        // UserActivityLog. Null no SSR/storage bloqueado → header omitido.
        const activitySid = getActivitySessionId();
        if (activitySid) config.headers["x-session-id"] = activitySid;

        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Organização inativa — deslogar imediatamente sem tentar refresh
        if (
          error.response?.status === 401 &&
          originalRequest.url?.includes("/organizations/me") &&
          error.response?.data?.message === "Organization is inactive"
        ) {
          this.clearTokens();
          if (typeof window !== "undefined") {
            window.location.href = "/organizer/login";
          }
          return Promise.reject(error);
        }

        const isAuthRoute =
          originalRequest.url?.includes("/auth/login") ||
          originalRequest.url?.includes("/auth/register") ||
          originalRequest.url?.includes("/auth/refresh") ||
          originalRequest.url?.includes("/auth/change-password");

        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !isAuthRoute
        ) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.client(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = this.getRefreshToken();
            if (!refreshToken) {
              // Se não há refresh token, limpa tokens e rejeita com o erro original
              this.clearTokens();
              return Promise.reject(error);
            }

            const response = await this.refreshToken(refreshToken);
            const body = response as any;
            // Backend devolve { message, data: { access_token, refresh_token } }.
            // Lê do nível `data` (com fallback plano por segurança). Ler errado
            // resultava em access_token=undefined e envenenava o cookie.
            const access_token = body?.data?.access_token ?? body?.access_token;
            const newRefreshToken =
              body?.data?.refresh_token ?? body?.refresh_token;

            if (!access_token) {
              // Refresh sem token válido: NÃO sobrescreve o cookie (senão grava
              // "undefined" e derruba a sessão boa). Trata como falha de refresh.
              throw new Error("Refresh response sem access_token");
            }

            this.setAccessToken(access_token);
            if (newRefreshToken) {
              this.setRefreshToken(newRefreshToken);
            }
            this.processQueue(null, access_token);

            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return this.client(originalRequest);
          } catch (refreshError: any) {
            console.error("Token refresh failed:", refreshError);
            if (
              refreshError?.response?.status === 401 ||
              refreshError?.response?.status === 403
            ) {
              this.clearTokens();
            }
            this.processQueue(refreshError, null);
            throw refreshError;
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async refreshToken(
    refreshToken: string
  ): Promise<AxiosResponse<{ access_token: string; refresh_token: string }>> {
    try {
      const response = await this.client.post("/api/v1/auth/refresh", {
        refresh_token: refreshToken,
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  async getToken(): Promise<string | null> {
    try {
      const response = await this.client.get("/api/v1/auth/csrf-token", {
        withCredentials: true,
      });
      return response.data || null;
    } catch (error) {
      console.error("Erro ao obter token CSRF:", error);
      return null;
    }
  }

  private processQueue(error: any, token: string | null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });

    this.failedQueue = [];
  }

  getAccessToken(): string | null {
    return this.readToken("access_token");
  }

  getRefreshToken(): string | null {
    return this.readToken("refresh_token");
  }

  // Lê o cookie tratando os literais "undefined"/"null" (de sessões antigas
  // envenenadas pelo bug de refresh) como ausência de token.
  private readToken(name: string): string | null {
    const v = Cookies.get(name);
    if (!v || v === "undefined" || v === "null") return null;
    return v;
  }

  setAccessToken(token: string): void {
    // Nunca grava valor vazio/undefined — evita cookie "undefined" e o consequente
    // "Bearer undefined" que derruba a sessão.
    if (!token) return;
    Cookies.set("access_token", token, {
      expires: 30, // 30 days
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
  }

  setRefreshToken(token: string): void {
    if (!token) return;
    Cookies.set("refresh_token", token, {
      expires: 90, // 90 days
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
  }

  clearTokens(): void {
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
  }

  private needsCsrfProtection(config: AxiosRequestConfig): boolean {
    const protectedMethods = ["post", "put", "patch", "delete"];
    const protectedEndpoints = ["/lootbox", "/purchases"];

    return (
      protectedMethods.includes(config.method?.toLowerCase() || "") &&
      protectedEndpoints.some((endpoint) => config.url?.includes(endpoint))
    );
  }

  async request<T = any>(
    config: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const response = await this.client.request<T>(config);
    return response;
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const response = await this.request<T>({
      ...config,
      method: "patch",
      url,
      data,
    });
    return response;
  }

  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const response = await this.request<T>({ ...config, method: "get", url });
    return response;
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const response = await this.request<T>({
      ...config,
      method: "post",
      url,
      data,
    });
    return response;
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const response = await this.request<T>({
      ...config,
      method: "put",
      url,
      data,
    });
    return response;
  }

  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const response = await this.request<T>({
      ...config,
      method: "delete",
      url,
    });
    return response;
  }
}
