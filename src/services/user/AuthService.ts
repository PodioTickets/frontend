import { UserServiceBase } from "./UserServiceBase";
import type {
  RegisterRequest,
  RegisterResponse,
  RefreshTokenResponse,
  DocumentAvailabilityResult,
} from "./UserService.types";
import { userCacheKey, LEGACY_USER_CACHE_KEY } from "@/lib/authSurface";

/**
 * Dominio de autenticacao: login/MFA/Google, registro, refresh/logout, reset de
 * senha, troca de email/senha, 2FA e checagem de disponibilidade. Estende
 * UserServiceBase (apiClient + helpers de erro).
 */
export class AuthService extends UserServiceBase {
  async login(data: { emailOrCpf: string; password: string; accountType?: "USER" | "ORGANIZER"; turnstileToken?: string }): Promise<{
    success: boolean;
    mfaRequired?: boolean;
    mfaToken?: string;
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

      const payload = {
        emailOrCpf: data.emailOrCpf,
        password: data.password,
        ...(data.turnstileToken ? { turnstileToken: data.turnstileToken } : {}),
      };

      const response = await this.apiClient.post<any>(endpoint, payload);
      const responseBody = response.data as any;

      // Verificação em duas etapas requerida
      if (responseBody?.mfaRequired === true && responseBody?.mfaToken) {
        return { success: true, mfaRequired: true, mfaToken: responseBody.mfaToken };
      }

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
        throw new Error("Resposta do servidor não contém dados de login válidos");
      }

      return { success: true, data: loginData };
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

  async verifyLoginMfa(mfaToken: string, code: string): Promise<{
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
      const response = await this.apiClient.post<any>("/api/v1/auth/2fa/verify-login", { mfaToken, code });
      const responseBody = response.data as any;

      let loginData: {
        access_token: string;
        refresh_token: string;
        user: { id: string; email: string; firstName?: string; lastName?: string; documentNumber?: string; role: string };
      } | null = null;

      if (responseBody?.data?.access_token && responseBody?.data?.user) {
        loginData = {
          access_token: responseBody.data.access_token,
          refresh_token: responseBody.data.refresh_token,
          user: responseBody.data.user,
        };
      }

      if (!loginData) throw new Error("Resposta inválida do servidor");

      return { success: true, data: loginData };
    } catch (error: any) {
      const handled = this.parseAuthErrorPayload(error);
      return {
        success: false,
        error: handled.message && handled.message !== "An error occurred"
          ? handled.message
          : error?.message || "Código inválido. Tente novamente.",
      };
    }
  }

  async checkEmailAvailability(
    email: string
  ): Promise<DocumentAvailabilityResult> {
    if (!email || !email.includes("@")) {
      return { available: true };
    }
    try {
      const { data } = await this.apiClient.get("/api/v1/auth/email/availability", {
        params: { email },
      });
      const raw = (data as { data?: unknown })?.data ?? data;
      const r = raw as Record<string, unknown>;

      let available = true;
      if (typeof r?.available === "boolean") available = r.available;
      else if (typeof r?.inUse === "boolean") available = !r.inUse;
      else if (typeof r?.exists === "boolean") available = !r.exists;

      if (!available) {
        return { available: false, message: "Este e-mail já está cadastrado." };
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
        const m = data?.message ?? data?.error ?? "Este e-mail já está cadastrado.";
        const text = Array.isArray(m)
          ? m.filter((x) => typeof x === "string").join(" ")
          : String(m);
        return {
          available: false,
          message: this.mapAuthErrorMessageToPtBr(text, status),
        };
      }
      // Em caso de erro de rede ou servidor, deixa passar (não bloqueia o fluxo)
      return { available: true };
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

  async register(data: RegisterRequest): Promise<{
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    documentNumber?: string;
    role: string;
    accountType?: string;
    avatarUrl?: string;
    access_token?: string;
    refresh_token?: string;
  }> {
    try {
      /* Brasileiros: strip de máscara (CPF clean — backend espera 11 dígitos).
       * Estrangeiros: documento cru — passaporte/RNE preserva letras. Strip
       * incondicional zerava o doc quando o passaporte não tinha dígitos. */
      const documentNumberForBackend =
        data.documentType === "PASSPORT"
          ? data.documentNumber.trim()
          : data.documentNumber.replace(/\D/g, "");

      const registerData: any = {
        email: data.email,
        password: data.password,
        complete_name: data.complete_name,
        gender: data.gender,
        phone: data.phone.replace(/\D/g, ""),
        dateOfBirth: data.dateOfBirth,
        country: data.country,
        documentType: data.documentType,
        documentNumber: documentNumberForBackend,
        acceptedTerms: data.acceptedTerms ?? true,
        acceptedPrivacyPolicy: data.acceptedPrivacyPolicy ?? true,
      };

      if (data.reserve_phone) registerData.reserve_phone = data.reserve_phone.replace(/\D/g, "");
      if (data.state) registerData.state = data.state;
      if (data.city) registerData.city = data.city;
      if (data.sex) registerData.sex = data.sex;
      if (data.receiveCalendarEvents !== undefined) registerData.receiveCalendarEvents = data.receiveCalendarEvents;
      if (data.receivePartnerPromos !== undefined) registerData.receivePartnerPromos = data.receivePartnerPromos;
      if (data.language) registerData.language = data.language;

      const response = await this.apiClient.post<RegisterResponse>("/api/v1/auth/register", registerData);
      const responseBody = response.data as RegisterResponse;
      const user = responseBody?.data?.user;

      if (!user) {
        throw new Error("Resposta do servidor não contém dados do usuário");
      }

      return {
        ...user,
        access_token: responseBody.data?.access_token,
        refresh_token: responseBody.data?.refresh_token,
      };
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

  async refreshToken(refreshToken?: string): Promise<RefreshTokenResponse> {
    try {
      // Auth por cookie httpOnly: sem `refreshToken` explícito, o backend lê o
      // refresh_token do cookie. Token no body é só fallback legado.
      const response = await this.apiClient.post<any>(
        "/api/v1/auth/refresh",
        refreshToken ? { refresh_token: refreshToken } : {}
      );
      // Backend: { message, data: { access_token, refresh_token } }. Desembrulha
      // o `data` (com fallback plano) — antes retornava o wrapper e o caller lia
      // access_token=undefined.
      const body = response.data as any;
      return (body?.data ?? body) as RefreshTokenResponse;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async validateGoogleCode(code: string, redirectUri: string): Promise<{
    success: boolean;
    mfaRequired?: boolean;
    mfaToken?: string;
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
      const response = await this.apiClient.post<any>(
        "/api/v1/auth/google/validate",
        { code, redirectUri }
      );
      const responseBody = response.data as any;

      // Verificação em duas etapas requerida
      if (responseBody?.mfaRequired === true && responseBody?.mfaToken) {
        return { success: true, mfaRequired: true, mfaToken: responseBody.mfaToken };
      }

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

  async forgotPassword(data: {
    email?: string;
    cpf?: string;
    accountType?: "USER" | "ORGANIZER";
  }): Promise<{ success?: boolean; message?: string; maskedEmail?: string }> {
    try {
      // Identificador exclusivo: envia apenas email OU cpf (contrato do backend)
      const payload = {
        ...(data.email ? { email: data.email } : {}),
        ...(data.cpf ? { cpf: data.cpf } : {}),
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

  async verifyResetCode(data: { email?: string; cpf?: string; code: string; accountType?: "USER" | "ORGANIZER" }): Promise<{ token: string }> {
    try {
      const payload = {
        ...(data.email ? { email: data.email } : {}),
        ...(data.cpf ? { cpf: data.cpf } : {}),
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
    email?: string;
    cpf?: string;
    accountType?: "USER" | "ORGANIZER";
  }): Promise<{ success?: boolean; message?: string }> {
    try {
      const payload = {
        ...(data.email ? { email: data.email } : {}),
        ...(data.cpf ? { cpf: data.cpf } : {}),
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
    // Lê o cookie-dica (não o token, que é httpOnly e invisível ao JS).
    return this.apiClient.hasSessionHint();
  }

  /**
   * Remove tokens e cache de usuário no cliente sem chamar a API.
   * Usado ao entrar no fluxo de auth do organizador para não misturar sessão de participante
   * (evita corrida com getProfile do AuthProvider).
   */
  clearLocalSession(): void {
    try {
      localStorage.removeItem(userCacheKey());
      localStorage.removeItem(LEGACY_USER_CACHE_KEY); // chave global pré-isolamento
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

  async changeEmail(data: {
    newEmail: string;
    currentPassword: string;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await this.apiClient.patch("/api/v1/auth/change-email", data);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async verifyEmailChange(code: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await this.apiClient.post("/api/v1/auth/verify-email-change", { code });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async send2FACode(): Promise<void> {
    try {
      await this.apiClient.post('/api/v1/auth/2fa/send-code', {});
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async enable2FA(code: string): Promise<void> {
    try {
      await this.apiClient.post('/api/v1/auth/2fa/enable', { code });
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async disable2FA(code: string): Promise<void> {
    try {
      await this.apiClient.post('/api/v1/auth/2fa/disable', { code });
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Exclui (soft-delete/anonimiza) a conta do usuário autenticado.
   * Exige o código de segurança enviado por e-mail (mesmo canal do 2FA).
   * O backend preserva inscrições/histórico para os organizadores e invalida
   * a sessão; o front deve limpar o auth local e redirecionar após o sucesso.
   */
  async deleteAccount(code: string): Promise<void> {
    try {
      await this.apiClient.post('/api/v1/auth/account/delete', { code });
    } catch (error: any) {
      // Código incorreto/expirado ou outra falha: NÃO limpa a sessão (o usuário
      // segue logado para tentar de novo).
      throw this.handleError(error);
    }
    // Sucesso: o backend invalidou a sessão e limpou os cookies; espelha local.
    this.apiClient.clearTokens();
  }
}
