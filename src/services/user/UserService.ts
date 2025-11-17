import type { ApiClient } from "../base/ApiClient";

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    username: string;
    email: string;
    emailVerified: boolean;
    avatar: string;
    firstName: string;
    lastName: string;
    balance: number;
  };
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterResponse {
  user: {
    id: string;
    username: string;
    email: string;
    emailVerified: boolean;
    firstName: string;
    lastName: string;
    balance: number;
  };
}

export interface BalanceTransaction {
  id: string;
  userId: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
}

export interface AuthError {
  message: string;
  code?: string;
  field?: string;
}

export interface UserItem {
  id: string;
  quantity: number;
  source: string;
  acquiredAt: string;
  item: {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    type: string;
    rarity: string;
    value: 0.5;
    metadata: {
      size: string;
      color: string;
    };
    isActive: boolean;
  };
}

export class UserService {
  constructor(private apiClient: ApiClient) {}

  async login(data: { email: string; password: string }) {
    try {
      const result = await this.apiClient.post<LoginResponse>(
        "/api/v1/auth/login/email",
        data
      );
      return result;
    } catch (error) {
      return {
        success: false,
        error: "Error on login",
        data: null,
      };
    }
  }

  async register(data: RegisterRequest) {
    try {
      const response = await this.apiClient.post<RegisterResponse>(
        "/api/v1/auth/register",
        data
      );
      return response.data?.user ?? null;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = this.apiClient.getRefreshToken();
      if (refreshToken) {
        await this.apiClient.post(
          "/api/v1/auth/logout",
          {},
          { headers: { "x-refresh-token": refreshToken } }
        );
      }
    } catch (error: any) {
      console.error("Logout error:", error);
    } finally {
      this.apiClient.clearTokens();
    }
  }

  async getProfile(): Promise<any> {
    try {
      const response = await this.apiClient.get("/api/v1/auth/profile");
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async updateUser(id: string, data: any): Promise<any> {
    try {
      const response = await this.apiClient.patch(`/api/v1/user/${id}`, data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async forgotPassword(data: { email: string }): Promise<{ message: string }> {
    try {
      const response = await this.apiClient.post(
        "/api/v1/auth/forgot-password",
        data
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  isAuthenticated(): boolean {
    return !!this.apiClient.getAccessToken();
  }

  async resetPassword(data: {
    token: string;
    password: string;
  }): Promise<{ message: string }> {
    try {
      const response = await this.apiClient.post(
        "/api/v1/auth/reset-password",
        data
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): AuthError {
    if (error.response?.data) {
      return {
        message: error.response.data.message || "An error occurred",
        code: error.response.data.code,
        field: error.response.data.field,
      };
    }

    if (error.request) {
      return {
        message: "Network error. Please check your connection.",
        code: "NETWORK_ERROR",
      };
    }

    return {
      message: error.message || "An unexpected error occurred",
      code: "UNKNOWN_ERROR",
    };
  }
}
