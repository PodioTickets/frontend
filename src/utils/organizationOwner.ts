import type { Organization } from "@/services/organizer/OrganizerService";

/** Verifica se o usuário logado é o OWNER da organização (via lista `members` do GET /organizations/me). */
export function isCurrentUserOrganizationOwner(
  organization: Organization | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  if (!organization || !currentUserId) return false;
  const ownerMember = organization.members?.find(
    (m) => String(m.role ?? "").toUpperCase() === "OWNER",
  );
  if (!ownerMember) return false;
  const ownerId = ownerMember.userId || ownerMember.user?.id;
  return Boolean(ownerId && String(ownerId) === String(currentUserId));
}
