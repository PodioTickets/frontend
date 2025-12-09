import type { ApiClient } from "../base/ApiClient";

export interface LoginResponse {
  message?: string;
  success?: boolean;
  data?: {
    access_token: string;
    refresh_token: string;
    user: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      documentNumber?: string;
      role: string;
    };
  };
  access_token?: string;
  refresh_token?: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    documentNumber?: string;
    role: string;
  };
}

export interface RegisterRequest {
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

export interface RegisterResponse {
  message?: string;
  data?: {
    user: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      complete_name?: string;
      phone?: string;
      documentNumber?: string;
      role: string;
      isActive?: boolean;
    };
  };
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
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

  async login(data: { emailOrCpf: string; password: string }): Promise<{
    success: boolean;
    data?: {
      access_token: string;
      refresh_token: string;
      user: {
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
        documentNumber?: string;
        role: string;
      };
    };
    error?: string;
  }> {
    try {
      const response = await this.apiClient.post<LoginResponse>(
        "/api/v1/auth/login",
        data
      );
      const responseBody = response.data as LoginResponse;
      let loginData: {
        access_token: string;
        refresh_token: string;
        user: {
          id: string;
          email: string;
          firstName?: string;
          lastName?: string;
          documentNumber?: string;
          role: string;
        };
      } | null = null;

      if (responseBody?.data?.access_token && responseBody?.data?.user) {
        loginData = {
          access_token: responseBody.data.access_token,
          refresh_token: responseBody.data.refresh_token,
          user: responseBody.data.user,
        };
      } else if (responseBody?.access_token && responseBody?.user) {
        loginData = {
          access_token: responseBody.access_token,
          refresh_token: responseBody.refresh_token || "",
          user: responseBody.user,
        };
      }

      if (!loginData || !loginData.access_token || !loginData.user) {
        throw new Error(
          "Resposta do servidor não contém dados de login válidos"
        );
      }

      return {
        success: true,
        data: loginData,
      };
    } catch (error: any) {
      // Extrai a mensagem de erro da resposta da API
      let errorMessage = "Erro ao fazer login. Tente novamente.";

      if (error.response?.data) {
        // Tenta várias formas de obter a mensagem de erro
        errorMessage =
          error.response.data.message ||
          error.response.data.error ||
          error.response.data.errors?.message ||
          (typeof error.response.data === "string"
            ? error.response.data
            : errorMessage);
      } else if (error.message && !error.message.includes("No refresh token")) {
        // Usa a mensagem do erro, mas ignora mensagens de refresh token
        errorMessage = error.message;
      }

      const handledError = this.handleError(error);
      return {
        success: false,
        error: handledError.message || errorMessage,
        data: undefined,
      };
    }
  }

  async register(data: RegisterRequest) {
    try {
      // Prepara os dados conforme o formato esperado pelo servidor (EmailRegisterDto)
      const registerData: any = {
        email: data.email,
        password: data.password,
        complete_name: data.complete_name,
        acceptedTerms: data.acceptedTerms ?? true,
        acceptedPrivacyPolicy: data.acceptedPrivacyPolicy ?? true,
      };

      // Campos opcionais
      if (data.gender) registerData.gender = data.gender;
      if (data.phone) registerData.phone = data.phone.replace(/\D/g, ""); // Remove formatação
      if (data.reserve_phone)
        registerData.reserve_phone = data.reserve_phone.replace(/\D/g, ""); // Remove formatação
      if (data.dateOfBirth) {
        // Garante que dateOfBirth seja uma string no formato YYYY-MM-DD
        if (typeof data.dateOfBirth === "string") {
          registerData.dateOfBirth = data.dateOfBirth;
        } else {
          // Se não é string, assume que é Date
          const date = data.dateOfBirth as Date;
          registerData.dateOfBirth = date.toISOString().split("T")[0]; // Formato YYYY-MM-DD
        }
      }
      if (data.country) registerData.country = data.country;
      if (data.state) registerData.state = data.state;
      if (data.city) registerData.city = data.city;
      if (data.documentType) registerData.documentType = data.documentType;
      if (data.documentNumber)
        registerData.documentNumber = data.documentNumber.replace(/\D/g, ""); // Remove formatação
      if (data.sex) registerData.sex = data.sex;
      if (data.receiveCalendarEvents !== undefined)
        registerData.receiveCalendarEvents = data.receiveCalendarEvents;
      if (data.receivePartnerPromos !== undefined)
        registerData.receivePartnerPromos = data.receivePartnerPromos;
      if (data.language) registerData.language = data.language;

      const response = await this.apiClient.post<RegisterResponse>(
        "/api/v1/auth/register",
        registerData
      );

      console.log("response", response);
      const responseBody = response.data as RegisterResponse;
      const user = responseBody?.data?.user;

      if (!user) {
        throw new Error("Resposta do servidor não contém dados do usuário");
      }

      return user;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      // O logout requer autenticação JWT, então o token será enviado automaticamente pelo interceptor
      await this.apiClient.post("/api/v1/auth/logout", {});
    } catch (error: any) {
      console.error("Logout error:", error);
      // Mesmo se houver erro, limpa os tokens localmente
    } finally {
      this.apiClient.clearTokens();
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      const response = await this.apiClient.post<RefreshTokenResponse>(
        "/api/v1/auth/refresh",
        { refresh_token: refreshToken }
      );
      return response.data as RefreshTokenResponse;
    } catch (error: any) {
      throw this.handleError(error);
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
      const data = error.response.data;
      const message =
        data.message ||
        data.error ||
        data.errors?.message ||
        (Array.isArray(data.errors) && data.errors[0]?.message) ||
        (typeof data === "string" ? data : null) ||
        "An error occurred";

      return {
        message,
        code: data.code,
        field: data.field,
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
