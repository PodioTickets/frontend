import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import Cookies from "js-cookie";

// Tipos base para respostas de API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T | any;
  error?: string;
  message?: string;
  timestamp?: string;
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
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
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
              throw new Error("No refresh token available");
            }

            const response = await this.refreshToken(refreshToken);
            console.log("response", response);
            const { access_token } = response as any;

            this.setAccessToken(access_token);
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
  ): Promise<AxiosResponse<{ access_token: string }>> {
    try {
      const response = await this.client.post("api/v1/auth/refresh", {
        refreshToken,
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  async getToken(): Promise<any | null> {
    try {
      const response = await this.client.get<ApiResponse<{ data: any }>>(
        "/api/v1/auth/csrf-token",
        { withCredentials: true }
      );
      return response.data.data || null;
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
    return Cookies.get("access_token") || null;
  }

  getRefreshToken(): string | null {
    return Cookies.get("refresh_token") || null;
  }

  setAccessToken(token: string): void {
    Cookies.set("access_token", token, {
      expires: 60 / (24 * 60),
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
  }

  setRefreshToken(token: string): void {
    Cookies.set("refresh_token", token, {
      expires: 7, // 7 days
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
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    const response = await this.client.request<ApiResponse<T>>(config);
    return response;
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.request<T>({
      ...config,
      method: "patch",
      url,
      data,
    });
    return response.data;
  }

  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.request<T>({ ...config, method: "get", url });
    return response.data;
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.request<T>({
      ...config,
      method: "post",
      url,
      data,
    });
    return response.data;
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.request<T>({
      ...config,
      method: "put",
      url,
      data,
    });
    return response.data;
  }

  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.request<T>({
      ...config,
      method: "delete",
      url,
    });
    return response.data;
  }
}
