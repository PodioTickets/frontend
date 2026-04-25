import type { Organization } from "@/services/organizer/OrganizerService";

/** Verifica se o usuário logado é o OWNER da organização (via lista `members` do GET /organizations/me). */
export function isCurrentUserOrganizationOwner(
  organization: Organization | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  if (!organization || !currentUserId) return false;
  const currentMember = organization.members?.find((m) => {
    const memberId = m.userId || m.user?.id;
    return Boolean(memberId && String(memberId) === String(currentUserId));
  });
  if (!currentMember) return false;
  return String(currentMember.role ?? "").toUpperCase() === "OWNER";
}
