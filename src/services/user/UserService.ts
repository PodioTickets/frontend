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
  /** Para exibir erro no input do cadastro (CPF ↔ documentNumber na API). */
  formFieldErrors?: Partial<Record<"cpf", string>>;
}

export type DocumentAvailabilityResult = {
  available: boolean;
  message?: string;
};

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

  async login(data: { emailOrCpf: string; password: string; accountType?: "USER" | "ORGANIZER" }): Promise<{
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
      const endpoint = data.accountType === "ORGANIZER" 
        ? "/api/v1/auth/login/organizer"
        : "/api/v1/auth/login";
      
      // Remover accountType do payload se usar endpoint específico
      const payload = data.accountType === "ORGANIZER"
        ? { emailOrCpf: data.emailOrCpf, password: data.password }
        : data;
      
      const response = await this.apiClient.post<LoginResponse>(
        endpoint,
        payload
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
      const handled = this.parseAuthErrorPayload(error);
      const fallback = "Erro ao fazer login. Tente novamente.";
      return {
        success: false,
        error:
          handled.message && handled.message !== "An error occurred"
            ? handled.message
            : error?.message && !String(error.message).includes("No refresh token")
              ? error.message
              : fallback,
        data: undefined,
      };
    }
  }

  async checkDocumentNumberAvailability(
    documentNumber: string,
    options?: { excludeUserId?: string }
  ): Promise<DocumentAvailabilityResult> {
    const digits = documentNumber.replace(/\D/g, "");
    if (digits.length !== 11) {
      return { available: true };
    }
    try {
      const { data } = await this.apiClient.get("/api/v1/auth/document/availability", {
        params: {
          documentNumber: digits,
          ...(options?.excludeUserId
            ? { excludeUserId: options.excludeUserId }
            : {}),
        },
      });
      const raw = (data as { data?: unknown })?.data ?? data;
      const r = raw as Record<string, unknown>;

      let available = true;
      if (typeof r?.available === "boolean") available = r.available;
      else if (typeof r?.inUse === "boolean") available = !r.inUse;
      else if (typeof r?.exists === "boolean") available = !r.exists;

      const msg = r?.message != null ? String(r.message) : undefined;
      if (!available) {
        return {
          available: false,
          message: this.mapAuthErrorMessageToPtBr(
            msg || "Este CPF já está cadastrado",
            undefined
          ),
        };
      }
      return { available: true };
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: unknown } };
      const status = err.response?.status;
      if (status === 404) {
        return { available: true };
      }
      const data = err.response?.data as Record<string, unknown> | undefined;
      if (status === 409 || status === 400) {
        const m =
          data?.message ?? data?.error ?? "Este CPF já está cadastrado";
        const text = Array.isArray(m)
          ? m.filter((x) => typeof x === "string").join(" ")
          : String(m);
        return {
          available: false,
          message: this.mapAuthErrorMessageToPtBr(text, status),
        };
      }
      this.handleError(error);
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

  async validateGoogleCode(code: string, redirectUri: string): Promise<{
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
        "/api/v1/auth/google/validate",
        { code, redirectUri }
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
      let errorMessage = "Erro ao fazer login com Google. Tente novamente.";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      return {
        success: false,
        error: errorMessage,
      };
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

  async forgotPassword(data: {
    email: string;
    accountType?: "USER" | "ORGANIZER";
  }): Promise<{ success?: boolean; message?: string }> {
    try {
      const payload = {
        email: data.email,
        accountType: data.accountType ?? "USER",
      };
      const response = await this.apiClient.post(
        "/api/v1/auth/forgot-password",
        payload
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async verifyResetCode(data: { email: string; code: string; accountType?: "USER" | "ORGANIZER" }): Promise<{ token: string }> {
    try {
      const payload = {
        email: data.email,
        code: data.code,
        ...(data.accountType && { accountType: data.accountType }),
      };
      const response = await this.apiClient.post(
        "/api/v1/auth/verify-reset-code",
        payload
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async resendResetCode(data: {
    email: string;
    accountType?: "USER" | "ORGANIZER";
  }): Promise<{ success?: boolean; message?: string }> {
    try {
      const payload = {
        email: data.email,
        accountType: data.accountType ?? "USER",
      };
      const response = await this.apiClient.post(
        "/api/v1/auth/resend-reset-code",
        payload
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  isAuthenticated(): boolean {
    return !!this.apiClient.getAccessToken();
  }

  /**
   * Remove tokens e cache de usuário no cliente sem chamar a API.
   * Usado ao entrar no fluxo de auth do organizador para não misturar sessão de participante
   * (evita corrida com getProfile do AuthProvider).
   */
  clearLocalSession(): void {
    try {
      localStorage.removeItem("user");
    } catch {
      /* ignore */
    }
    this.apiClient.clearTokens();
  }

  async resetPassword(data: {
    token: string;
    password: string;
  }): Promise<{ success?: boolean; message?: string }> {
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

  async changePassword(data: {
    currentPassword?: string;
    newPassword: string;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      const payload: Record<string, string> = { newPassword: data.newPassword };
      if (data.currentPassword) payload.currentPassword = data.currentPassword;
      const response = await this.apiClient.post("/api/v1/auth/change-password", payload);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async removeAvatar(): Promise<void> {
    try {
      await this.apiClient.delete("/api/v1/user/avatar");
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await this.apiClient.post<{ avatarUrl: string }>(
        "/api/v1/user/avatar",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getMyTickets(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{
    registrations: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const { page = 1, limit = 20, status } = params || {};
      const response = await this.apiClient.get("/api/v1/registrations/me", {
        params: {
          page,
          limit,
          ...(status && { status }),
        },
      });
      return (
        response.data.data || {
          registrations: [],
          pagination: { page, limit, total: 0, totalPages: 1 },
        }
      );
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getMyRegistrationById(registrationId: string): Promise<any> {
    try {
      const response = await this.apiClient.get(`/api/v1/registrations/me/${registrationId}`);
      return response.data.data?.registration || response.data.registration || response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getLinkedUsers(): Promise<{
    users: Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      documentNumber: string;
      phone: string;
      dateOfBirth: string;
      gender: string;
      isMainUser?: boolean;
    }>;
  }> {
    try {
      const response = await this.apiClient.get("/api/v1/user/linked-users");
      return response.data.data || { users: [] };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async createOrLinkUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    documentNumber: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
  }): Promise<{
    success: boolean;
    data?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      documentNumber: string;
      phone: string;
      dateOfBirth: string;
      gender: string;
      wasCreated: boolean;
      wasLinked: boolean;
    };
    error?: string;
  }> {
    try {
      const response = await this.apiClient.post<{
        success: boolean;
        data?: {
          id: string;
          firstName: string;
          lastName: string;
          email: string;
          documentNumber: string;
          phone: string;
          dateOfBirth: string;
          gender: string;
          wasCreated: boolean;
          wasLinked: boolean;
        };
        error?: string;
      }>("/api/v1/user/linked-users", data);
      
      return response.data;
    } catch (error: any) {
      let errorMessage = "Erro ao salvar usuário. Tente novamente.";
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /** Mensagens conhecidas da API em inglês → texto exibido ao usuário (toast / input). */
  private mapAuthErrorMessageToPtBr(
    message: string,
    httpStatus?: number
  ): string {
    const m = message.trim();
    if (
      /user\s+with\s+this\s+document\s+number\s+already\s+exists/i.test(m)
    ) {
      return "Já existe um usuário cadastrado com este CPF.";
    }
    if (
      httpStatus === 409 &&
      /document/i.test(m) &&
      /already\s+exists|already registered/i.test(m)
    ) {
      return "Já existe um usuário cadastrado com este CPF.";
    }
    return message;
  }

  private parseAuthErrorPayload(error: any): AuthError {
    if (error.response?.data) {
      const data = error.response.data;
      const statusCode: number | undefined = error.response.status;
      const rawMsg =
        data.message ??
        data.error ??
        data.errors?.message ??
        (Array.isArray(data.errors) && data.errors[0]?.message) ??
        (typeof data === "string" ? data : null);

      let messageStr = "An error occurred";
      const stringMessages: string[] = [];

      if (Array.isArray(rawMsg)) {
        for (const x of rawMsg) {
          if (typeof x === "string") stringMessages.push(x);
        }
        messageStr = stringMessages.join(" ") || messageStr;
      } else if (typeof rawMsg === "string") {
        messageStr = rawMsg;
        stringMessages.push(rawMsg);
      }

      const localized = this.mapAuthErrorMessageToPtBr(messageStr, statusCode);

      const formFieldErrors: Partial<Record<"cpf", string>> = {};
      if (data.field === "documentNumber" && localized) {
        formFieldErrors.cpf = localized;
      }
      for (const m of stringMessages) {
        if (/document|cpf|cnpj/i.test(m)) {
          formFieldErrors.cpf = this.mapAuthErrorMessageToPtBr(m, statusCode);
          break;
        }
      }

      return {
        message: localized,
        code: data.code,
        field: data.field,
        formFieldErrors:
          Object.keys(formFieldErrors).length > 0 ? formFieldErrors : undefined,
      };
    }

    if (error.request) {
      return {
        message: "Network error. Please check your connection.",
        code: "NETWORK_ERROR",
      };
    }

    return {
      message: error?.message || "An unexpected error occurred",
      code: "UNKNOWN_ERROR",
    };
  }

  private handleError(error: any): never {
    const p = this.parseAuthErrorPayload(error);
    const err = new Error(p.message) as Error & AuthError;
    err.code = p.code;
    err.field = p.field;
    err.formFieldErrors = p.formFieldErrors;
    err.name = "AuthError";
    throw err;
  }
}
