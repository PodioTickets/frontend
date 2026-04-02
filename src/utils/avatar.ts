import { getApiClient } from "@/services/base/ApiClient";

/**
 * Retorna a URL completa do avatar do usuário.
 * Se o avatarUrl já for uma URL completa (começa com http:// ou https://),
 * retorna diretamente. Caso contrário, concatena com a URL base da API.
 */
export function getAvatarUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl || avatarUrl.trim() === "") {
    return ""
  }

  // Se já é uma URL completa (começa com http:// ou https://), usa diretamente
  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
    return avatarUrl;
  }

  // Caso contrário, concatena com a URL base da API
  return `${getApiClient().getBaseURL()}${avatarUrl}`;
}

