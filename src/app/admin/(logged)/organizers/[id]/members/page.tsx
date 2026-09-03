"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Search, ArrowLeft, Plus } from "lucide-react";
import { getApiClient } from "@/services/base/ApiClient";
import { cn } from "@/utils/cn";
import { LoadingAnimation } from "@/components/Loading";
import { Button } from "@/components/Button";
import { PencilIcon } from "@/components/Icons/PencilIcon";
import { AdminCollaboratorDrawer, type AdminMember } from "@/components/Admin/AdminCollaboratorDrawer";
import { formatDateBRT, formatTimeBRT } from "@/utils/datetimeBR";
import { UserAvatar } from "@/components/UserAvatar";
import toast from "react-hot-toast";
import { Pagination } from "@/components/Pagination";

// ─── Types ────────────────────────────────────────────────────────────────────

type Member = AdminMember;

interface OrgInfo {
  name?: string;
  tradeName?: string;
  logoUrl?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 10;

function formatLastAccess(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  // lastLoginAt é INSTANTE real → BRT (America/Sao_Paulo).
  return `${formatDateBRT(iso, { day: "2-digit", month: "2-digit", year: "numeric" })} • ${formatTimeBRT(iso, { hour: "2-digit", minute: "2-digit" })}`;
}

function memberInitials(m: Member) {
  const a = m.user.firstName?.[0] ?? "";
  const b = m.user.lastName?.[0] ?? "";
  return `${a}${b}`.toUpperCase() || "?";
}

function RoleBadge({ role }: { role: "OWNER" | "EMPLOYEE" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2.5 py-1 text-xs font-semibold font-family-dm-sans whitespace-nowrap",
        role === "OWNER"
          ? "bg-primary-11 text-primary-1"
          : "bg-gray-4 text-gray-11",
      )}
    >
      {role === "OWNER" ? "Proprietário" : "Colaborador"}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminOrgMembersPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [orgInfo, setOrgInfo] = useState<OrgInfo>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const openAdd = () => { setDrawerMode("create"); setSelectedMember(null); setDrawerOpen(true); };
  const openEdit = (m: Member) => { setDrawerMode("edit"); setSelectedMember(m); setDrawerOpen(true); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const api = getApiClient();
      const res = await api.get<Record<string, unknown>>(`/api/v1/admin/organizations/${orgId}`);
      const raw = res.data as any;
      const d = raw?.data?.organization ?? raw?.organization ?? raw?.data ?? raw;

      setOrgInfo({ name: d.name, tradeName: d.tradeName, logoUrl: d.logoUrl });

      const rawMembers: Member[] = Array.isArray(d.members)
        ? d.members.map((m: any) => ({
            ...m,
            userId: m.userId ?? m.user?.id ?? m.id,
            permissions: Array.isArray(m.permissions) ? m.permissions : [],
          }))
        : [];
      setMembers(rawMembers);
    } catch {
      toast.error("Erro ao carregar membros.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const name = `${m.user.firstName ?? ""} ${m.user.lastName ?? ""}`.toLowerCase();
      const email = (m.user.email ?? "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [members, search]);

  useEffect(() => { setPage(1); }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, safePage]);

  const orgName = orgInfo.name ?? orgInfo.tradeName ?? "Organização";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-2 pb-10 pt-4 md:pt-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1222px] mx-auto w-full">

        <AdminCollaboratorDrawer
          open={drawerOpen}
          mode={drawerMode}
          member={selectedMember}
          orgId={orgId}
          onOpenChange={setDrawerOpen}
          onSuccess={() => void load()}
        />

        {/* Back + Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => router.push("/admin/organizers")}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-11 hover:text-gray-12 transition-colors w-fit"
            >
              <ArrowLeft className="size-4" />
              Voltar para organizadores
            </button>
            <h1 className="text-gray-12 tracking-tight text-2xl font-extrabold font-manrope leading-[1.1]">
              Membros
            </h1>
            <p className="text-gray-11 font-family-dm-sans leading-[1.3] text-sm">
              {orgName}
            </p>
          </div>
          <Button type="button" onClick={openAdd} className="shrink-0 w-full md:w-auto h-11 font-bold font-family-dm-sans">
            <Plus className="size-4 shrink-0" />
            Adicionar colaborador
          </Button>
        </div>

        {/* Search */}
        <div className="rounded-xl border border-gray-6 bg-gray-1 p-3 md:p-4  mb-5">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, email…"
              className="w-full h-12 pl-11 pr-4 rounded-lg border border-gray-6 bg-gray-1 text-base md:text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans  outline-none focus-visible:border-gray-8"
            />
          </div>
        </div>

        {/* Mobile: cards */}
        <div className="md:hidden flex flex-col gap-3">
          {pageSlice.length === 0 ? (
            <div className="rounded-xl border border-gray-6 bg-gray-1 py-14 text-center text-sm text-gray-11 font-family-dm-sans  px-4">
              {search ? "Nenhum membro encontrado." : "Nenhum membro na organização."}
            </div>
          ) : (
            pageSlice.map((m) => {
              const name = `${m.user.firstName ?? ""} ${m.user.lastName ?? ""}`.trim();
              return (
                <div key={m.id} className="rounded-xl border border-gray-6 bg-gray-1 p-4 ">
                  <div className="flex items-start gap-3 min-w-0">
                    <UserAvatar
                      avatarUrl={m.user.avatarUrl}
                      name={name}
                      initials={memberInitials(m)}
                      shape="lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-gray-12 font-family-dm-sans leading-[1.3] break-words">
                        {name || "—"}
                      </p>
                      <p className="mt-0.5 text-sm text-gray-11 font-family-dm-sans break-words">
                        {m.user.email || "—"}
                      </p>
                    </div>
                    <RoleBadge role={m.role} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-gray-6 px-3 py-2.5">
                    <span className="text-sm font-medium text-gray-12 font-family-dm-sans shrink-0">
                      Último acesso:
                    </span>
                    <span className="text-sm font-medium text-gray-12 font-family-dm-sans text-right">
                      {formatLastAccess(m.user.lastLoginAt ?? m.updatedAt)}
                    </span>
                  </div>
                  <Button type="button" variant="outline" className="mt-3 h-11 w-full border-gray-6 text-gray-12 font-semibold font-family-dm-sans" onClick={() => openEdit(m)}>
                    Editar
                  </Button>
                </div>
              );
            })
          )}
          <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block rounded-xl border border-gray-6 bg-gray-1 overflow-hidden ">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-gray-3 border-b border-t border-gray-6">
                  <th className="text-left py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                    Membro
                  </th>
                  <th className="text-center py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-center py-3.5 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">
                    Função
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
                    <td colSpan={5} className="py-16 text-center text-sm text-gray-11 font-family-dm-sans">
                      {search ? "Nenhum membro encontrado." : "Nenhum membro na organização."}
                    </td>
                  </tr>
                ) : (
                  pageSlice.map((m) => {
                    const name = `${m.user.firstName ?? ""} ${m.user.lastName ?? ""}`.trim();
                    return (
                      <tr key={m.id} className="hover:bg-gray-2/80 transition-colors">
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
                          <span className="text-sm font-medium text-gray-12 font-family-dm-sans break-words">
                            {m.user.email || "—"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <RoleBadge role={m.role} />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm text-gray-12 font-family-dm-sans whitespace-nowrap">
                            {formatLastAccess(m.user.lastLoginAt ?? m.updatedAt)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button type="button" variant="outline" size="sm" className="h-10 px-3 border-gray-6 text-gray-12" onClick={() => openEdit(m)}>
                            <PencilIcon className="size-4 text-gray-11" />
                            Editar
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} variant="table-footer" />
        </div>

      </div>
    </div>
  );
}
