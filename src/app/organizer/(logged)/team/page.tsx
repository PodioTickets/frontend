"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { organizerService } from "@/services";
import { Button } from "@/components/Button";
import { LoadingAnimation } from "@/components/Loading";
import toast from "react-hot-toast";
import type { OrganizationMember } from "@/services/organizer/OrganizerService";
import { CollaboratorDrawer } from "@/components/Organizer/TeamMemberModals";
import { SystemAuditLogTab } from "@/components/Organizer/SystemAuditLogTab";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { cn } from "@/utils/cn";
import { isCurrentUserOrganizationOwner } from "@/utils/organizationOwner";
import { formatDateBRT, formatTimeBRT } from "@/utils/datetimeBR";
import { UserAvatar } from "@/components/UserAvatar";

const ITEMS_PER_PAGE = 8;

function formatLastAccess(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  // Último acesso é INSTANTE real → exibe no fuso de Brasília (BRT), não UTC.
  const date = formatDateBRT(iso, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = formatTimeBRT(iso, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} • ${time}`;
}

function memberInitials(m: OrganizationMember) {
  const a = m.user.firstName?.[0] ?? "";
  const b = m.user.lastName?.[0] ?? "";
  const s = `${a}${b}`.toUpperCase();
  return s || "?";
}

function TeamPaginationBar({
  totalPages,
  safePage,
  onPageChange,
  variant,
}: {
  totalPages: number;
  safePage: number;
  onPageChange: (page: number) => void;
  variant: "mobile" | "desktop";
}) {
  if (totalPages <= 1) return null;

  const isMobile = variant === "mobile";
  const navBtn = isMobile
    ? "size-8 shrink-0 rounded-lg border border-gray-6 bg-gray-4/80 hover:bg-gray-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
    : "size-8 rounded-full border border-gray-6 bg-gray-1 hover:bg-gray-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors";
  const pageBtn = (active: boolean) =>
    cn(
      "size-8 shrink-0 border text-sm font-medium font-family-dm-sans transition-colors",
      isMobile ? "rounded-lg" : "rounded-full",
      active
        ? "bg-primary-11 text-gray-1 border-primary-11"
        : isMobile
          ? "bg-gray-4 text-gray-12 border-transparent hover:bg-gray-5"
          : "bg-gray-1 border-gray-6 text-gray-12 hover:bg-gray-2"
    );

  return (
    <div
      className={cn(
        "flex items-center gap-2 min-w-0",
        isMobile &&
        "justify-center w-full max-w-full overflow-x-auto py-4 [&::-webkit-scrollbar]:hidden",
        !isMobile && "justify-end px-4 py-5 border-t border-gray-6"
      )}
      style={
        isMobile
          ? { scrollbarWidth: "none", msOverflowStyle: "none" }
          : undefined
      }
    >
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, safePage - 1))}
        disabled={safePage <= 1}
        className={navBtn}
        aria-label="Página anterior"
      >
        <ChevronLeft
          className={cn("size-4", isMobile ? "text-gray-12" : "text-gray-11")}
        />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange(p)}
          className={pageBtn(safePage === p)}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
        disabled={safePage >= totalPages}
        className={navBtn}
        aria-label="Próxima página"
      >
        <ChevronRight
          className={cn("size-4", isMobile ? "text-gray-12" : "text-gray-11")}
        />
      </button>
    </div>
  );
}

export default function OrganizerTeamPage() {
  const orgNav = useOrganizerNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"team" | "audit">("team");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editMember, setEditMember] = useState<OrganizationMember | null>(null);

  const loadMembers = useCallback(
    async (opts?: { silent?: boolean }) => {
      const uid = user?.id;
      if (!uid) return;
      if (!opts?.silent) setLoading(true);
      try {
        const { organization: org } = await organizerService.getOrganization();
        if (!isCurrentUserOrganizationOwner(org, uid)) {
          orgNav.replace("/organizer/events");
          return;
        }
        const list = await organizerService.getOrganizationMembers();
        setMembers(list);
      } catch (e: any) {
        console.error(e);
        toast.error("Erro ao carregar equipe.");
      } finally {
        setLoading(false);
      }
    },
    [user?.id, orgNav],
  );

  useEffect(() => {
    if (authLoading || !user?.id) return;
    void loadMembers();
  }, [authLoading, user?.id, loadMembers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const name =
        `${m.user.firstName} ${m.user.lastName}`.toLowerCase();
      const email = (m.user.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [members, search]);

  useEffect(() => {
    setPage(1);
  }, [search, members.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, safePage]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  if (authLoading || (loading && members.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-2 pb-10 pt-4 md:pt-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1222px] mx-auto w-full">
        {/* Header row */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-4 md:mb-6">
          <div>
            <h1
              className={cn(
                "text-gray-12 tracking-tight",
                tab === "audit"
                  ? "text-2xl font-extrabold font-manrope leading-[1.1]"
                  : "font-manrope font-extrabold text-base leading-[1.1] md:text-2xl md:font-family-dm-sans"
              )}
            >
              {tab === "audit"
                ? "Log Geral do Sistema"
                : "Equipe"}
            </h1>
            <p
              className={cn(
                "mt-2 md:mt-1 text-gray-11 font-family-dm-sans leading-[1.3]",
                tab === "team" ? "text-base md:text-sm" : "text-sm"
              )}
            >
              {tab === "audit"
                ? "Histórico completo de atividades de todos os usuários do sistema."
                : "Gerencie os acessos à sua organização"}
            </p>
          </div>
          {tab === "team" && (
            <Button
              type="button"
              className="shrink-0 font-bold w-full md:w-auto h-11 font-family-dm-sans"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="size-4 shrink-0" />
              Adicionar colaborador
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-6 md:gap-8 border-b border-gray-6 mb-4 md:mb-6 overflow-x-auto [&::-webkit-scrollbar]:hidden -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setTab("team")}
            className={cn(
              "pb-3 text-sm font-semibold font-family-dm-sans transition-colors relative shrink-0",
              tab === "team"
                ? "text-primary-11"
                : "text-gray-11 hover:text-gray-12"
            )}
          >
            Equipe
            {tab === "team" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary-11" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("audit")}
            className={cn(
              "pb-3 text-sm font-semibold font-family-dm-sans transition-colors relative shrink-0",
              tab === "audit"
                ? "text-primary-11"
                : "text-gray-11 hover:text-gray-12"
            )}
          >
            Log do sistema
            {tab === "audit" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary-11" />
            )}
          </button>
        </div>

        {tab === "audit" ? (
          <SystemAuditLogTab />
        ) : (
          <>
            <div className="rounded-xl border border-gray-6 bg-gray-1 p-3 md:p-4 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] mb-4 md:mb-5">
              <h2 className="text-base font-bold text-gray-12 font-manrope leading-[1.1] mb-3 md:hidden">
                Lista de colaboradores
              </h2>
              <div className="relative w-full flex-1 min-w-0">
                <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 size-5 text-gray-11 pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome, email..."
                  className="w-full h-12 pl-11 md:pl-12 pr-4 rounded-lg border border-gray-6 bg-gray-1 text-base md:text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] outline-none focus-visible:border-gray-4 focus-visible:ring-[3px] focus-visible:ring-gray-4/50"
                />
              </div>
            </div>

            {/* Mobile: cards */}
            <div className="md:hidden flex flex-col gap-3">
              {pageSlice.length === 0 ? (
                <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] px-4">
                  {search
                    ? "Nenhum membro encontrado."
                    : "Nenhum colaborador na organização."}
                </div>
              ) : (
                pageSlice.map((m) => {
                  const name =
                    `${m.user.firstName} ${m?.user?.lastName ? m?.user?.lastName : " "}`.trim();
                  const last = formatLastAccess(
                    m.user.lastLoginAt ?? m.updatedAt
                  );
                  return (
                    <div
                      key={m.id}
                      className="rounded-xl border border-gray-6 bg-gray-1 p-4 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <UserAvatar
                          avatarUrl={m.user.avatarUrl}
                          name={name}
                          initials={memberInitials(m)}
                          shape="lg"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-bold text-gray-12 font-family-dm-sans leading-[1.3] wrap-break-word">
                            {name || "—"}
                          </p>
                          <p className="mt-0.5 text-sm text-gray-11 font-family-dm-sans wrap-break-word">
                            {m.user.email || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-gray-6 px-3 py-2.5">
                        <span className="text-sm font-medium text-gray-12 font-family-dm-sans shrink-0">
                          Último acesso:
                        </span>
                        <span className="text-sm font-medium text-gray-12 font-family-dm-sans text-right">
                          {last}
                        </span>
                      </div>
                      {m.role !== "OWNER" ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-3 h-11 w-full border-gray-6 text-gray-12 font-semibold font-family-dm-sans"
                          onClick={() => setEditMember(m)}
                        >
                          Editar
                        </Button>
                      ) : (
                        <p className="mt-3 text-center text-xs text-gray-11 font-family-dm-sans py-2">
                          Proprietário
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <TeamPaginationBar
              totalPages={totalPages}
              safePage={safePage}
              onPageChange={setPage}
              variant="mobile"
            />

            {/* Desktop: table */}
            <div className="hidden md:block rounded-xl border border-gray-6 bg-gray-1 overflow-hidden shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="bg-gray-3 border-b border-gray-6">
                      <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                        Membro
                      </th>
                      <th className="text-center py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                        Email
                      </th>
                      <th className="text-center py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                        Último acesso
                      </th>
                      <th className="text-right py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-6">
                    {pageSlice.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-16 text-center text-sm text-gray-11 font-family-dm-sans"
                        >
                          {search
                            ? "Nenhum membro encontrado."
                            : "Nenhum colaborador na organização."}
                        </td>
                      </tr>
                    ) : (
                      pageSlice.map((m) => {
                        const name =
                          `${m.user.firstName} ${m?.user?.lastName ? m?.user?.lastName : " "}`.trim();
                        return (
                          <tr
                            key={m.id}
                            className="hover:bg-gray-2/80 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <UserAvatar
                                  avatarUrl={m.user.avatarUrl}
                                  name={name}
                                  initials={memberInitials(m)}
                                  shape="full"
                                />
                                <span className="text-sm font-semibold text-gray-12 font-family-dm-sans truncate">
                                  {name || "—"}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-sm font-medium text-gray-12 font-family-dm-sans wrap-break-word">
                                {m.user.email}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-sm text-gray-12 font-family-dm-sans inline-flex items-center justify-center gap-1.5 flex-wrap">
                                {formatLastAccess(
                                  m.user.lastLoginAt ?? m.updatedAt
                                )}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {m.role !== "OWNER" ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-10 px-3 border-gray-6 text-gray-12"
                                  onClick={() => setEditMember(m)}
                                >
                                  <PencilIcon className="size-4 text-gray-11" />
                                  Editar
                                </Button>
                              ) : (
                                <span className="text-xs text-gray-11 font-family-dm-sans">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <TeamPaginationBar
                totalPages={totalPages}
                safePage={safePage}
                onPageChange={setPage}
                variant="desktop"
              />
            </div>
          </>
        )}
      </div>

      <CollaboratorDrawer
        open={addOpen || !!editMember}
        mode={editMember ? "edit" : "create"}
        member={editMember}
        onOpenChange={(o) => {
          if (!o) {
            setAddOpen(false);
            setEditMember(null);
          }
        }}
        onSuccess={() => loadMembers({ silent: true })}
      />
    </div>
  );
}
