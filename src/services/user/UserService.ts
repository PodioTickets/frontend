import { AuthService } from "./AuthService";
import type { CouponPreviewResult } from "@/lib/orderCouponDiscount";
import type { AgeCouponEligibility } from "@/lib/ageCoupon";
import { normalizeNationality } from "@/utils/nationality";

/**
 * Dominio de dados do usuario (perfil, ingressos/pedidos, cupom/voucher preview,
 * usuarios vinculados, avatar). Topo da cadeia Base -> Auth -> User; preserva
 * 100%% a API publica `userService.x` (instancia unica em services/index.ts).
 */
export class UserService extends AuthService {
  async getProfile(): Promise<any> {
    try {
      const response = await this.apiClient.get("/api/v1/auth/profile");
      const payload = response.data;
      /* Backend pode persistir gentílico/legado ("Brasileira"/"Brazil"/"BR") em
       * `country`. Normaliza no boundary (igual `getUserByCpf`/`createOrLinkUser`)
       * pro valor canônico do select — senão o checkout trata brasileiro como
       * estrangeiro (CEP/UF/bairro) e exibe documento/telefone errados. O user
       * vem em `payload.data` (useAuth lê `const { data } = getProfile()`). */
      if (payload?.data?.country) {
        payload.data.country = normalizeNationality(payload.data.country) ?? payload.data.country;
      }
      return payload;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Preview de cupom sem reservar order — usado no `/checkout/ingressos`
   * pra exibir "(X% OFF)" antes do user confirmar a seleção. Retorna `null`
   * em qualquer erro (cupom inválido, endpoint indisponível) pra não bloquear
   * o fluxo: o cupom de verdade só será aplicado no `patchCoupon` do
   * `handleNext`, e lá os erros sobem normalmente.
   */
  async previewCoupon(
    eventId: string,
    code: string,
  ): Promise<CouponPreviewResult | null> {
    try {
      const { data: response } = await this.apiClient.get<{ data: any }>(
        `/api/v1/coupons/events/${eventId}/preview`,
        { params: { code } },
      );
      const d = response.data;
      if (!d) return null;

      // Voucher: 100% OFF sobre uma lista de ingressos. `appliesTo` chega como
      // string JSON (ex.: '["id1","id2"]') ou já como array — normalizamos.
      if (d.kind === "voucher") {
        let appliesTo: string[] = [];
        const raw = d.appliesTo;
        if (Array.isArray(raw)) {
          appliesTo = raw.filter((x: unknown): x is string => typeof x === "string");
        } else if (typeof raw === "string") {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              appliesTo = parsed.filter((x: unknown): x is string => typeof x === "string");
            }
          } catch {
            /* string malformada — voucher sem ingressos aplicáveis */
          }
        }
        return { kind: "voucher", code: String(d.code ?? code), appliesTo };
      }

      // Cupom tradicional (backend pode ou não enviar `kind: "coupon"`).
      // `appliesTo` espelha o ramo do voucher: "all"/ausente → null (todos);
      // array OU string JSON ('["id1","id2"]') → lista de ticketIds.
      // `minCartValue`/`minQuantity` chegam só quando não-nulos (o
      // ResponseCompressionInterceptor remove null/""/undefined) → ausência =
      // "sem condição".
      let couponAppliesTo: string[] | null = null;
      const rawApplies = d.appliesTo;
      if (Array.isArray(rawApplies)) {
        const ids = rawApplies.filter(
          (x: unknown): x is string => typeof x === "string",
        );
        couponAppliesTo = ids.length ? ids : null;
      } else if (typeof rawApplies === "string" && rawApplies !== "all") {
        try {
          const parsed = JSON.parse(rawApplies);
          if (Array.isArray(parsed)) {
            const ids = parsed.filter(
              (x: unknown): x is string => typeof x === "string",
            );
            couponAppliesTo = ids.length ? ids : null;
          }
        } catch {
          /* não-JSON (ex.: "all" ou string solta) → sem restrição */
        }
      }
      // [DIAGNÓSTICO TEMPORÁRIO] confirma o que o backend devolve no preview do
      // cupom — remover após validar o appliesTo. Se `rawAppliesTo` vier
      // undefined/null, o cupom é tratado como "todos" e desconta ingressos não
      // cobertos (sintoma reportado).
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-console
        console.warn("[coupon-preview]", {
          code: d.code,
          rawAppliesTo: d.appliesTo,
          parsedAppliesTo: couponAppliesTo,
          minCartValue: d.minCartValue,
          minQuantity: d.minQuantity,
        });
      }
      return {
        kind: "coupon",
        code: String(d.code ?? code),
        value: Number(d.value) || 0,
        type: d.type === "FIXED" ? "FIXED" : "PERCENTAGE",
        couponType: d.couponType,
        applyToProducts: d.applyToProducts,
        appliesTo: couponAppliesTo,
        minCartValue:
          typeof d.minCartValue === "number" ? d.minCartValue : null,
        minQuantity: typeof d.minQuantity === "number" ? d.minQuantity : null,
      };
    } catch {
      return null;
    }
  }

  /**
   * Valida o voucher do LINK (`?voucher=`) no `/checkout/ingressos`. O preview
   * (`previewCoupon`) devolve `null` pra voucher usado/expirado SEM o motivo —
   * por design ele nunca lança. O motivo real vem do GET de produtos com
   * `?voucher=`, que o backend valida ANTES de listar e responde 422 tipado
   * (VOUCHER_ALREADY_USED / VOUCHER_EXPIRED / VOUCHER_NOT_FOUND).
   *
   * Só o 422 é tratado como "inusável"; rede/5xx/401 devolvem `usable: true`
   * pra nunca alarmar com falso negativo — quem decide de verdade é o apply
   * (`patchCoupon`) e o `/pay`.
   */
  async validateVoucherLink(
    eventId: string,
    code: string,
  ): Promise<
    | { usable: true }
    | { usable: false; code: string | null; message: string }
  > {
    try {
      // `limit: 1` minimiza o payload — só interessa a validação do voucher
      await this.apiClient.get(`/api/v1/products/events/${eventId}`, {
        params: { voucher: code, limit: 1 },
      });
      return { usable: true };
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      if (status === 422) {
        return {
          usable: false,
          code: typeof data?.code === "string" ? data.code : null,
          message:
            typeof data?.message === "string" && data.message
              ? data.message
              : "Voucher inválido ou não encontrado.",
        };
      }
      return { usable: true };
    }
  }

  /**
   * Elegibilidade do cupom AUTOMÁTICO de idade pro usuário logado, já em
   * `/checkout/ingressos`. `OptionalJwtAuthGuard`: anônimo / sem dateOfBirth
   * recebe `applicable: false` (não 401). `age` = idade na data do EVENTO.
   * Retorna `null` em qualquer erro pra não quebrar a tela.
   */
  async getAgeCouponEligibility(
    eventId: string,
  ): Promise<AgeCouponEligibility | null> {
    try {
      const { data: response } = await this.apiClient.get<{ data: any }>(
        `/api/v1/coupons/events/${eventId}/age-eligibility`,
      );
      const d = response.data;
      if (!d) return null;
      const c = d.appliedCoupon;
      return {
        applicable: !!d.applicable,
        age: typeof d.age === "number" ? d.age : null,
        eventDate: d.eventDate ?? null,
        appliedCoupon: c
          ? {
            id: String(c.id),
            couponType: "AGE",
            type: c.type === "FIXED" ? "FIXED" : "PERCENTAGE",
            value: Number(c.value) || 0,
            ageRule: c.ageRule ?? null,
            ageValue: c.ageValue ?? null,
            minAge: c.minAge ?? null,
            maxAge: c.maxAge ?? null,
            appliesTo: c.appliesTo ?? null,
            minCartValue: c.minCartValue ?? null,
            applyToProducts: !!c.applyToProducts,
            note: c.note ?? null,
          }
          : null,
      };
    } catch {
      return null;
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

  async updateRegistrationProductVariation(
    registrationId: string,
    productId: string,
    variationId: string
  ): Promise<any> {
    try {
      const response = await this.apiClient.patch(
        `/api/v1/registrations/${registrationId}/products/${productId}/variation`,
        { variationId }
      );
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
    orders: any[];
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
          orders: [],
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

  async getOrderDetails(orderId: string): Promise<any> {
    try {
      const response = await this.apiClient.get(`/api/v1/orders/${orderId}/details`);
      return response.data.data || response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getUserByCpf(cpf: string): Promise<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    documentNumber: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
    country?: string;
    documentType?: string;
  } | null> {
    try {
      const response = await this.apiClient.get(`/api/v1/user/by-cpf/${cpf}`);
      const data = response.data?.data ?? null;
      if (!data) return null;
      /* Backend pode persistir gentílico ("Brasileira") em vez do nome do
       * país ("Brasil"). Normaliza no boundary pra qualquer consumidor já
       * receber o valor canônico do select de nacionalidade. */
      if (data.country) data.country = normalizeNationality(data.country);
      return data;
    } catch (error: any) {
      if (error?.response?.status === 404) return null;
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
      country?: string;
      // Domínio: documento é sempre CPF ou PASSPORT (estreitado p/ casar com
      // `LinkedUser` no hook `useLinkedUsers` — evita TS2322).
      documentType?: "CPF" | "PASSPORT";
      isMainUser?: boolean;
    }>;
  }> {
    try {
      const response = await this.apiClient.get("/api/v1/user/linked-users");
      const body = response.data.data || { users: [] };
      /* Normaliza gentílico/legado em `country` por usuário (igual
       * `getUserByCpf`/`createOrLinkUser`) — senão selecionar um usuário
       * vinculado com country não-canônico quebra o select de nacionalidade,
       * tira a máscara do CPF e envia documentType errado no submit. */
      if (Array.isArray(body.users)) {
        body.users = body.users.map((u: { country?: string }) => ({
          ...u,
          country: u.country ? (normalizeNationality(u.country) ?? u.country) : u.country,
        }));
      }
      return body;
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
    /** Nacionalidade canônica (nome do país no `COUNTRIES_PT_BR`). Sem isso o
     *  backend salva como "Brasil" por default, ignorando estrangeiros. */
    country?: string;
    /** "CPF" pra brasileiro, "PASSPORT" pra estrangeiro — backend usa pra
     *  normalizar documentNumber via cleanDocumentNumber. */
    documentType?: "CPF" | "PASSPORT";
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
      country?: string;
      documentType?: string;
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
          country?: string;
          documentType?: string;
          wasCreated: boolean;
          wasLinked: boolean;
        };
        error?: string;
      }>("/api/v1/user/linked-users", data);

      // Normaliza gentílico → nome canônico (igual `getUserByCpf`) pra qualquer
      // consumidor já receber o valor pronto pro select de nacionalidade.
      if (response.data.data?.country) {
        response.data.data.country = normalizeNationality(response.data.data.country);
      }

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

  async removeLinkedUser(linkedUserId: string): Promise<void> {
    try {
      await this.apiClient.delete(`/api/v1/user/linked-users/${linkedUserId}`);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }
}

export * from "./UserService.types";
