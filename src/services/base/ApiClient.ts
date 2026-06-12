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

    this.clearLegacyJsTokens();
    this.setupInterceptors();
  }

  /**
   * Remove cookies de token LEGÍVEIS por JS (`access_token`/`refresh_token`) —
   * resquício da era pré-httpOnly (quando o front os gravava via js-cookie).
   * Pós-migração, um token visível ao JS é sempre obsoleto (o válido é httpOnly,
   * invisível) e pode "sombrear" o cookie httpOnly novo → o backend lê o velho
   * inválido e responde 401. `Cookies.remove` não afeta o cookie httpOnly (o
   * browser ignora escrita via document.cookie em httpOnly) nem o hint
   * `pt_authed`. Roda 1× na criação do singleton (no-op no SSR).
   */
  private clearLegacyJsTokens(): void {
    if (typeof document === "undefined") return;
    if (Cookies.get("access_token") || Cookies.get("refresh_token")) {
      Cookies.remove("access_token");
      Cookies.remove("refresh_token");
    }
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
          originalRequest.url?.includes("/auth/logout") ||
          originalRequest.url?.includes("/auth/change-password");

        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !isAuthRoute &&
          // Só tenta refresh se há indício de sessão (cookie-dica `pt_authed`).
          // Sem isso, um 401 de usuário deslogado (ex.: logout/getProfile antes
          // do login) dispararia /auth/refresh à toa → "Refresh token ausente".
          this.hasSessionHint()
        ) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then(() => {
                // Auth por cookie httpOnly: nada de Authorization manual — o
                // cookie renovado já viaja com withCredentials. Só repete.
                return this.client(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            // O refresh_token vive em cookie httpOnly (invisível ao JS). O backend
            // o lê do cookie e responde com Set-Cookie dos tokens renovados —
            // não há token pra ler/passar aqui. withCredentials envia o cookie.
            await this.client.post("/api/v1/auth/refresh");
            this.processQueue(null, null);
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

  // Dica de sessão (cookie `pt_authed`, não-httpOnly, sem segredo) setada pelo
  // backend no login. Permite saber "provavelmente logado" sem expor o token —
  // o access_token httpOnly NÃO é legível por JS de propósito.
  hasSessionHint(): boolean {
    return Cookies.get("pt_authed") === "1";
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

  // Auth agora é por cookie httpOnly setado pelo BACKEND no login/refresh — o
  // front NÃO grava mais o token (js-cookie não faz httpOnly, então gravar aqui
  // recriaria um cookie legível por JS, reabrindo o vetor de roubo via XSS).
  // Mantidos como no-op para não quebrar os chamadores do fluxo de login.
  setAccessToken(_token: string): void {
    // intencionalmente vazio — ver comentário acima.
  }

  setRefreshToken(_token: string): void {
    // intencionalmente vazio — ver comentário acima.
  }

  // Remove qualquer cookie legado legível por JS (sessões anteriores à migração
  // httpOnly). O cookie httpOnly real só é limpo pelo endpoint POST /auth/logout.
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
