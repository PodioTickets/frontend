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
  const hasGender = !!user?.gender?.trim();

  return hasDocumentNumber && hasDateOfBirth && hasPhone && hasGender;
}
