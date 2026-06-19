import type { ApiClient } from "../base/ApiClient";
import type { AuthError } from "./UserService.types";

/**
 * Base da cadeia de servicos de usuario. Segura o `apiClient` (protected, herdado
 * por AuthService e UserService) e os helpers de tratamento de erro de auth
 * compartilhados pelos dois dominios.
 */
export class UserServiceBase {
  constructor(protected apiClient: ApiClient) {}

  /** Mensagens conhecidas da API em inglês → texto exibido ao usuário (toast / input). */
  protected mapAuthErrorMessageToPtBr(
    message: string,
    httpStatus?: number
  ): string {
    const m = message.trim();
    if (
      /user\s+with\s+this\s+document\s+number\s+already\s+exists/i.test(m)
    ) {
      return "Já existe um usuário cadastrado com este documento.";
    }
    if (
      httpStatus === 409 &&
      /document/i.test(m) &&
      /already\s+exists|already registered/i.test(m)
    ) {
      return "Já existe um usuário cadastrado com este documento.";
    }
    if (
      httpStatus === 409 &&
      /email/i.test(m) &&
      /already\s+exists|already registered|already\s+in\s+use/i.test(m)
    ) {
      return "Este e-mail já está cadastrado.";
    }
    return message;
  }

  protected parseAuthErrorPayload(error: any): AuthError {
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

      const formFieldErrors: Partial<Record<"cpf" | "email", string>> = {};
      if (data.field === "documentNumber" && localized) {
        formFieldErrors.cpf = localized;
      }
      for (const m of stringMessages) {
        if (/document|cpf|cnpj/i.test(m)) {
          formFieldErrors.cpf = this.mapAuthErrorMessageToPtBr(m, statusCode);
          break;
        }
      }
      if (data.field === "email" || (statusCode === 409 && /email/i.test(messageStr) && /already/i.test(messageStr))) {
        formFieldErrors.email = this.mapAuthErrorMessageToPtBr(messageStr, statusCode);
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

  protected handleError(error: any): never {
    const p = this.parseAuthErrorPayload(error);
    const err = new Error(p.message) as Error & AuthError;
    err.code = p.code;
    err.field = p.field;
    err.formFieldErrors = p.formFieldErrors;
    err.name = "AuthError";
    throw err;
  }
}
