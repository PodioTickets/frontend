/**
 * Fluxo de "completar perfil" (CPF, nascimento, etc.) é só para participante.
 * Organizadores não devem ver esse modal.
 */
export function skipsParticipantProfileFlow(
  user: unknown,
  pathname?: string | null,
): boolean {
  if (typeof pathname === "string" && (pathname.startsWith("/organizer") || pathname.startsWith("/admin"))) {
    return true;
  }
  const u = user as { role?: string } | null;
  if (!u?.role) return false;
  const r = String(u.role).toUpperCase();
  return r.includes("ORGANIZER") || r.includes("ADMIN") || r.includes("PODIOGO_STAFF");
}

/**
 * Verifica se o perfil do usuário está completo com todos os campos obrigatórios
 * @param user - Objeto do usuário
 * @returns true se o cadastro estiver completo, false caso contrário
 */
export function isProfileComplete(user: any | null): boolean {
  if (!user) return false;

  // Verifica campos obrigatórios
  const hasDocumentNumber = !!user?.documentNumber?.trim();
  const hasDateOfBirth = !!user?.dateOfBirth?.trim();
  const hasPhone = !!user?.phone?.trim();
  const hasGender = !!(user?.gender?.trim() || user?.sex?.trim());

  return hasDocumentNumber && hasDateOfBirth && hasPhone && hasGender;
}
