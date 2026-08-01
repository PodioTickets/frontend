// Tipos e contratos do dominio de usuario/auth.
// Extraido de UserService.ts (refactor Bloco 3, 2026-06-18) — re-exportado por
// UserService.ts via `export *`, entao imports existentes seguem validos.

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
  /** Token do Cloudflare Turnstile — verificado pelo backend no /register. */
  turnstileToken?: string;
}

export interface RegisterResponse {
  message?: string;
  success?: boolean;
  data?: {
    access_token?: string;
    refresh_token?: string;
    user: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      documentNumber?: string;
      role: string;
      accountType?: string;
      isActive?: boolean;
      avatarUrl?: string;
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
  /** Para exibir erro no input do cadastro. */
  formFieldErrors?: Partial<Record<"cpf" | "email", string>>;
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
