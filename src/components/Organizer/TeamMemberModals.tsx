"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  X,
  Check,
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/Button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { organizerService } from "@/services";
import toast from "react-hot-toast";
import type {
  OrganizationMember,
  CreateOrganizationMemberRequest,
} from "@/services/organizer/OrganizerService";
import type { Event } from "@/interfaces/event";
import { cn } from "@/utils/cn";
import { organizerMemberSettingsClientPage } from "@/lib/organizerAudit";

const EVENTS_PER_PAGE = 5;

function eventListImageUrl(ev: Event): string | null {
  const ext = ev as Event & { cardImageUrl?: string | null };
  const u = (ext.cardImageUrl || ev.bannerUrl || "").trim();
  return u || null;
}

const PERMISSION_ROWS: { id: string; title: string; description: string }[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    description:
      "Acesso ao painel geral do evento com visão resumida de vendas, inscritos e desempenho.",
  },
  {
    id: "financial",
    title: "Financeiro",
    description:
      "Acesso às informações financeiras do evento, incluindo faturamento, valores a receber e histórico de repasses.",
  },
  {
    id: "edit_event",
    title: "Editar Evento",
    description:
      "Permite editar as configurações do evento, como informações, datas, modalidades, preços e configurações gerais.",
  },
  {
    id: "view_event",
    title: "Visualizar Evento",
    description:
      "Permite visualizar a página pública do evento como os participantes enxergam.",
  },
  {
    id: "coupons",
    title: "Cupons",
    description:
      "Acesso à criação e gerenciamento de cupons de desconto e benefícios do evento.",
  },
  {
    id: "pixel",
    title: "Pixel",
    description:
      "Permite configurar pixels de rastreamento (como Meta/Facebook e Google) para acompanhar conversões e campanhas.",
  },
  {
    id: "notify",
    title: "Notificar Inscritos",
    description:
      "Permite enviar notificações ou comunicados para todos os inscritos do evento.",
  },
  {
    id: "create_event",
    title: "Criar Evento",
    description:
      "Permite criar novos eventos na organização.",
  },
];

const DEFAULT_PERMISSIONS: Record<string, boolean> = {
  dashboard: true,
  financial: true,
  edit_event: true,
  view_event: false,
  coupons: false,
  pixel: false,
  notify: false,
};

function splitFullName(full: string) {
  const t = full.trim();
  if (!t) return { firstName: "", lastName: "" };
  const i = t.indexOf(" ");
  if (i === -1) return { firstName: t, lastName: "" };
  return { firstName: t.slice(0, i).trim(), lastName: t.slice(i + 1).trim() };
}

function permissionsFromArray(
  keys: string[] | undefined | null
): Record<string, boolean> {
  const base: Record<string, boolean> = {};
  for (const row of PERMISSION_ROWS) base[row.id] = false;
  if (keys?.length) {
    for (const k of keys) {
      const key = k.toLowerCase();
      if (key in base) base[key] = true;
    }
  }
  return base;
}

function permissionsToArray(p: Record<string, boolean>): string[] {
  return PERMISSION_ROWS.map((r) => r.id).filter((id) => p[id]);
}

function buildEventIdsForCreate(
  events: Event[],
  eventSelection: Record<string, boolean>
): string[] | undefined {
  if (events.length === 0) return undefined;
  const selected = events.filter((e) => eventSelection[e.id]).map((e) => e.id);
  if (selected.length === 0 || selected.length === events.length) return undefined;
  return selected;
}

/**
 * null   → não envia o campo (sem restrição, todos os eventos)
 * []     → restringe a nenhum evento
 * [ids]  → restringe a esses eventos
 */
function buildEventIdsForSettings(
  events: Event[],
  eventSelection: Record<string, boolean>
): string[] | null {
  if (events.length === 0) return null;
  const selected = events.filter((e) => eventSelection[e.id]).map((e) => e.id);
  // Todos selecionados: sem restrição (não envia whitelist)
  if (selected.length === events.length) return null;
  // Subset ou nenhum: envia exatamente o que foi escolhido
  return selected;
}

function PermissionCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "size-6 shrink-0 rounded-md border flex items-center justify-center transition-colors pointer-events-none",
        checked
          ? "bg-[#C8F4CC] border-[#94CE9A] text-gray-12"
          : "border-gray-6 bg-gray-1"
      )}
      aria-hidden
    >
      {checked && <Check className="size-3.5 stroke-[2.5px]" strokeWidth={2.5} />}
    </span>
  );
}

function FieldShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-base text-gray-12 font-normal font-family-dm-sans leading-[1.3]">
        {label}
      </label>
      {children}
    </div>
  );
}

/** Mesmo padrão visual de `NotificationsPagination` / lista mobile da equipe (setas + páginas). */
function CollaboratorDrawerEventsPagination({
  totalPages,
  safePage,
  onPageChange,
  disabled,
}: {
  totalPages: number;
  safePage: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-end gap-2 min-w-0 w-full overflow-x-auto py-2 [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, safePage - 1))}
        disabled={disabled || safePage <= 1}
        className="size-8 shrink-0 rounded-lg border border-gray-6 bg-gray-4/80 hover:bg-gray-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        aria-label="Página anterior"
      >
        <ChevronLeft className="size-4 text-gray-12" />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onPageChange(p)}
          disabled={disabled}
          className={cn(
            "size-8 shrink-0 rounded-lg border text-sm font-medium font-family-dm-sans transition-colors",
            safePage === p
              ? "bg-primary-11 text-gray-1 border-primary-11"
              : "bg-gray-4 text-gray-12 border-transparent hover:bg-gray-5"
          )}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
        disabled={disabled || safePage >= totalPages}
        className="size-8 shrink-0 rounded-lg border border-gray-6 bg-gray-4/80 hover:bg-gray-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        aria-label="Próxima página"
      >
        <ChevronRight className="size-4 text-gray-12" />
      </button>
    </div>
  );
}

export function CollaboratorDrawer({
  open,
  mode,
  member,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  mode: "create" | "edit";
  member: OrganizationMember | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, boolean>>(() => ({
    ...DEFAULT_PERMISSIONS,
  }));
  const [eventSelection, setEventSelection] = useState<Record<string, boolean>>(
    {}
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [whitelistFromApi, setWhitelistFromApi] = useState<string[] | null>(null);
  const [eventSearch, setEventSearch] = useState("");
  const [eventsListPage, setEventsListPage] = useState(1);

  const isOwnerMember = mode === "edit" && member?.role === "OWNER";

  const resetForm = useCallback(() => {
    setFullName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setPermissions({ ...DEFAULT_PERMISSIONS });
    setEventSelection({});
    setWhitelistFromApi(null);
    setEventSearch("");
    setEventsListPage(1);
  }, []);

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const { events: list } = await organizerService.getMyEvents({
        page: 1,
        limit: 100,
      });
      setEvents(list || []);
    } catch {
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    loadEvents();
    if (mode === "create") {
      resetForm();
    }
  }, [open, mode, loadEvents, resetForm]);

  useEffect(() => {
    if (!open || mode !== "edit" || !member) {
      if (!open) setWhitelistFromApi(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    (async () => {
      try {
        const detail = await organizerService.getOrganizationMember(
          member.userId
        );
        if (cancelled) return;
        setFullName(
          `${detail.member.user.firstName} ${detail.member.user.lastName}`.trim()
        );
        setEmail(detail.member.user.email || "");
        setPassword("");
        setConfirmPassword("");
        setPermissions(permissionsFromArray(detail.permissions));
        setWhitelistFromApi(detail.eventIds);
      } catch (err: any) {
        if (cancelled) return;
        toast.error(
          err?.response?.data?.message ||
          err?.message ||
          "Erro ao carregar colaborador."
        );
        setFullName(
          `${member.user.firstName} ${member.user.lastName}`.trim()
        );
        setEmail(member.user.email || "");
        setPermissions(permissionsFromArray(member.permissions));
        setWhitelistFromApi(member.eventIds ?? null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, mode, member?.userId]);

  useEffect(() => {
    if (!open || mode !== "edit" || detailLoading) return;
    if (events.length === 0) {
      setEventSelection({});
      return;
    }
    // null = sem restrição (todos marcados); [] = nenhum; [ids] = só esses
    const whitelist = whitelistFromApi;
    const restrict = whitelist !== null;
    const sel: Record<string, boolean> = {};
    for (const ev of events) {
      sel[ev.id] = !restrict || whitelist!.includes(ev.id);
    }
    setEventSelection(sel);
  }, [open, mode, events, whitelistFromApi, detailLoading]);

  useEffect(() => {
    if (!open || events.length === 0 || mode === "edit") return;
    setEventSelection((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const ev of events) {
        if (next[ev.id] === undefined) {
          next[ev.id] = false;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [open, events, mode]);

  useEffect(() => {
    if (!open) setEventSearch("");
  }, [open]);

  useEffect(() => {
    if (open) setEventsListPage(1);
  }, [open]);

  useEffect(() => {
    setEventsListPage(1);
  }, [eventSearch]);

  const filteredEventsForList = useMemo(() => {
    const q = eventSearch.trim().toLowerCase();
    if (!q) return events;
    return events.filter((ev) => (ev.name || "").toLowerCase().includes(q));
  }, [events, eventSearch]);

  const eventsTotalPages = Math.max(
    1,
    Math.ceil(filteredEventsForList.length / EVENTS_PER_PAGE)
  );
  const safeEventsPage = Math.min(eventsListPage, eventsTotalPages);

  useEffect(() => {
    setEventsListPage((p) => Math.min(p, eventsTotalPages));
  }, [eventsTotalPages]);

  const paginatedFilteredEvents = useMemo(() => {
    const start = (safeEventsPage - 1) * EVENTS_PER_PAGE;
    return filteredEventsForList.slice(start, start + EVENTS_PER_PAGE);
  }, [filteredEventsForList, safeEventsPage]);

  const allPermissionIds = useMemo(
    () => PERMISSION_ROWS.map((r) => r.id),
    []
  );

  const selectAllPermissions = () => {
    const next: Record<string, boolean> = {};
    for (const id of allPermissionIds) next[id] = true;
    setPermissions(next);
  };

  const clearAllPermissions = () => {
    const next: Record<string, boolean> = {};
    for (const id of allPermissionIds) next[id] = false;
    setPermissions(next);
  };

  const selectAllEvents = () => {
    const next: Record<string, boolean> = {};
    for (const ev of events) next[ev.id] = true;
    setEventSelection(next);
  };

  const clearAllEvents = () => {
    const next: Record<string, boolean> = {};
    for (const ev of events) next[ev.id] = false;
    setEventSelection(next);
  };

  const togglePermission = (id: string) => {
    setPermissions((p) => ({ ...p, [id]: !p[id] }));
  };

  const toggleEvent = (id: string) => {
    setEventSelection((p) => ({ ...p, [id]: !p[id] }));
  };

  const handleClose = () => {
    if (!saving && !removing) onOpenChange(false);
  };

  const handleCreate = async () => {
    const { firstName, lastName } = splitFullName(fullName);
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Informe o nome completo (nome e sobrenome).");
      return;
    }
    if (!email.trim()) {
      toast.error("Informe o e-mail do membro.");
      return;
    }
    if (!password.trim()) {
      toast.error("Informe a senha inicial do colaborador.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setSaving(true);
    try {
      const payload: CreateOrganizationMemberRequest = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password: password.trim(),
        role: "EMPLOYEE",
        permissions: permissionsToArray(permissions),
      };
      const eventIds = buildEventIdsForCreate(events, eventSelection);
      if (eventIds?.length) payload.eventIds = eventIds;
      await organizerService.addOrganizationMember(payload);
      toast.success("Colaborador criado.");
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
        err?.message ||
        "Não foi possível criar o colaborador."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!member || member.role === "OWNER") {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      const eventIds = buildEventIdsForSettings(events, eventSelection);
      await organizerService.updateOrganizationMemberSettings(member.userId, {
        role: "EMPLOYEE",
        permissions: permissionsToArray(permissions),
        ...(eventIds !== null ? { eventIds } : {}),
        clientPage: organizerMemberSettingsClientPage(member.userId),
      });
      toast.success("Colaborador atualizado.");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
        err?.message ||
        "Não foi possível salvar."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!member || member.role === "OWNER") return;
    const name = `${member.user.firstName} ${member.user.lastName}`.trim();
    if (
      !confirm(
        `Remover ${name || "este colaborador"} da organização? Esta ação não pode ser desfeita.`
      )
    ) {
      return;
    }
    setRemoving(true);
    try {
      await organizerService.removeOrganizationMember(member.userId);
      toast.success("Colaborador removido.");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
        err?.message ||
        "Não foi possível remover."
      );
    } finally {
      setRemoving(false);
    }
  };

  const inputClass =
    "h-12 w-full rounded-lg border border-gray-6 bg-gray-1 px-3 text-base text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-4 focus-visible:ring-[3px] focus-visible:ring-gray-4/50";

  const titleText =
    mode === "create" ? "Adicionar colaborador" : "Editar colaborador";
  const primaryCta =
    mode === "create" ? "Criar colaborador" : "Salvar alterações";
  const primaryCtaMobile =
    mode === "create" ? "Adicionar" : "Salvar";
  const breadcrumbTrail =
    mode === "create"
      ? "Equipe › Adicionar colaborador"
      : "Equipe › Editar colaborador";

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent
        overlayClassName="bg-black/50 supports-backdrop-filter:backdrop-blur-[2px]"
        className={cn(
          "bg-gray-1 flex h-dvh max-h-dvh w-full flex-col gap-0 p-0 shadow-none",
          /* Mobile (Figma 3037:116490): full-bleed; desktop: painel 644px */
          "data-[vaul-drawer-direction=right]:max-w-full data-[vaul-drawer-direction=right]:sm:max-w-full",
          "data-[vaul-drawer-direction=right]:md:max-w-[644px]",
          "data-[vaul-drawer-direction=right]:rounded-none data-[vaul-drawer-direction=right]:border-0",
          "data-[vaul-drawer-direction=right]:md:rounded-l-xl data-[vaul-drawer-direction=right]:md:border-l data-[vaul-drawer-direction=right]:md:border-gray-6"
        )}
        aria-describedby={undefined}
      >
        <DrawerTitle className="sr-only">{titleText}</DrawerTitle>

        {/* Header — mobile: voltar + título + breadcrumb; desktop: título + fechar */}
        <div className="shrink-0 border-b border-gray-6 px-4 py-3 md:h-[60px] md:px-5 md:py-0 md:flex md:items-center">
          <div className="flex items-start gap-3 md:h-full md:w-full md:items-center md:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-3 md:items-center">
              <button
                type="button"
                onClick={handleClose}
                disabled={saving || removing}
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-12 hover:bg-gray-3 transition-colors disabled:opacity-50 md:hidden"
                aria-label="Voltar"
              >
                <ArrowLeft className="size-5" strokeWidth={2} />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-gray-12 font-manrope leading-[1.1] md:text-xl md:font-semibold md:font-family-dm-sans md:leading-[1.3]">
                  {titleText}
                </h2>
                <p className="mt-1 text-xs text-gray-11 font-family-dm-sans md:hidden">
                  {breadcrumbTrail}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={saving || removing}
              className="hidden size-9 shrink-0 items-center justify-center rounded-lg text-gray-12 hover:bg-gray-3 transition-colors disabled:opacity-50 md:flex"
              aria-label="Fechar"
            >
              <X className="size-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Scroll body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-7 py-5">
            {/* Informações básicas */}
            <section className="flex flex-col gap-4 md:gap-5 px-4">
              <h3 className="text-base font-bold text-gray-12 font-manrope leading-[1.1] md:text-lg">
                Informações básicas
              </h3>
              <div className="flex flex-col gap-4">
                {mode === "create" ? (
                  <>
                    <FieldShell label="Nome completo">
                      <input
                        className={inputClass}
                        placeholder="Digite o nome completo"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={saving}
                        autoComplete="name"
                      />
                    </FieldShell>
                    <FieldShell label="E-mail do membro">
                      <input
                        type="email"
                        className={inputClass}
                        placeholder="Digite o e-mail.."
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={saving}
                        autoComplete="email"
                      />
                    </FieldShell>
                    <FieldShell label="Senha">
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          className={inputClass}
                          placeholder="Digite sua senha"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={saving}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </FieldShell>
                    <FieldShell label="Confirmar senha">
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          className={inputClass}
                          placeholder="Digite a senha novamente"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={saving}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </FieldShell>
                  </>
                ) : (
                  <>
                    <FieldShell label="Nome completo">
                      <input
                        className={cn(inputClass, "bg-gray-2 text-gray-11")}
                        value={fullName}
                        readOnly
                      />
                    </FieldShell>
                    <FieldShell label="E-mail do membro">
                      <input
                        type="email"
                        className={cn(inputClass, "bg-gray-2 text-gray-11")}
                        value={email}
                        readOnly
                      />
                    </FieldShell>
                    <FieldShell label="Função na organização">
                      <input
                        readOnly
                        className={cn(
                          inputClass,
                          "bg-gray-2 text-gray-11 cursor-not-allowed"
                        )}
                        value={
                          member?.role === "OWNER"
                            ? "Proprietário"
                            : "Colaborador"
                        }
                      />
                    </FieldShell>
                  </>
                )}
              </div>
            </section>

            {isOwnerMember && (
              <p className="px-4 -mt-2 text-sm text-gray-11 font-family-dm-sans">
                O proprietário possui acesso total a permissões e eventos da
                organização.
              </p>
            )}

            {/* Permissões */}
            <section className="flex flex-col gap-4 md:gap-5 px-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h3 className="text-base font-bold text-gray-12 font-manrope leading-[1.1] md:text-lg">
                  Permissões
                </h3>
                <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-2">
                  <button
                    type="button"
                    onClick={selectAllPermissions}
                    disabled={saving || removing || isOwnerMember}
                    className="h-11 rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm font-bold text-gray-12 font-family-dm-sans hover:bg-gray-2 transition-colors disabled:opacity-50 md:h-10 md:px-5"
                  >
                    Selecionar tudo
                  </button>
                  <button
                    type="button"
                    onClick={clearAllPermissions}
                    disabled={saving || removing || isOwnerMember}
                    className="h-11 rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm font-bold text-gray-12 font-family-dm-sans hover:bg-gray-2 transition-colors disabled:opacity-50 md:h-10 md:px-5"
                  >
                    Limpar tudo
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {PERMISSION_ROWS.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => togglePermission(row.id)}
                    disabled={saving || removing || isOwnerMember}
                    className={cn(
                      "flex w-full gap-3 rounded-lg border border-gray-6 px-3 py-4 text-left transition-colors hover:bg-gray-2/50",
                      "disabled:opacity-50"
                    )}
                  >
                    <PermissionCheckbox checked={!!permissions[row.id]} />
                    <div className="flex min-w-0 flex-1 flex-col gap-3 leading-[1.3]">
                      <p className="text-base font-semibold text-gray-12 font-family-dm-sans">
                        {row.title}
                      </p>
                      <p className="text-sm font-normal text-gray-11 font-family-dm-sans">
                        {row.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Eventos */}
            <section className="flex flex-col gap-4 md:gap-5 px-4 pb-6 md:pb-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h3 className="text-base font-bold text-gray-12 font-manrope leading-[1.1] md:text-lg">
                  Eventos
                </h3>
                <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-2">
                  <button
                    type="button"
                    onClick={selectAllEvents}
                    disabled={
                      saving ||
                      removing ||
                      loadingEvents ||
                      events.length === 0 ||
                      isOwnerMember
                    }
                    className="h-11 rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm font-bold text-gray-12 font-family-dm-sans hover:bg-gray-2 transition-colors disabled:opacity-50 md:h-10 md:px-5"
                  >
                    Selecionar tudo
                  </button>
                  <button
                    type="button"
                    onClick={clearAllEvents}
                    disabled={
                      saving ||
                      removing ||
                      loadingEvents ||
                      events.length === 0 ||
                      isOwnerMember
                    }
                    className="h-11 rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm font-bold text-gray-12 font-family-dm-sans hover:bg-gray-2 transition-colors disabled:opacity-50 md:h-10 md:px-5"
                  >
                    Limpar tudo
                  </button>
                </div>
              </div>
              {detailLoading && mode === "edit" ? (
                <p className="text-sm text-gray-11 font-family-dm-sans px-1">
                  Carregando dados do colaborador…
                </p>
              ) : loadingEvents ? (
                <p className="text-sm text-gray-11 font-family-dm-sans">
                  Carregando eventos…
                </p>
              ) : events.length === 0 ? (
                <p className="text-sm text-gray-11 font-family-dm-sans">
                  Nenhum evento encontrado.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="relative w-full">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-11" />
                    <input
                      type="search"
                      value={eventSearch}
                      onChange={(e) => setEventSearch(e.target.value)}
                      placeholder="Buscar por nome, email.."
                      disabled={saving || removing || isOwnerMember}
                      className={cn(
                        inputClass,
                        "pl-11",
                        (saving || removing || isOwnerMember) && "opacity-50"
                      )}
                      aria-label="Buscar eventos"
                    />
                  </div>
                  {filteredEventsForList.length === 0 ? (
                    <p className="text-sm text-gray-11 font-family-dm-sans px-1">
                      Nenhum evento corresponde à busca.
                    </p>
                  ) : (
                    <>
                      {paginatedFilteredEvents.map((ev) => {
                        const img = eventListImageUrl(ev);
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => toggleEvent(ev.id)}
                            disabled={saving || removing || isOwnerMember}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg border border-gray-6 px-3 py-4 text-left transition-colors hover:bg-gray-2/50",
                              "disabled:opacity-50"
                            )}
                          >
                            <PermissionCheckbox
                              checked={!!eventSelection[ev.id]}
                            />
                            <span className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-gray-6 bg-gray-3">
                              {img ? (
                                <Image
                                  src={img}
                                  alt={ev.name}
                                  width={44}
                                  height={44}
                                  className="size-11 object-cover"
                                />
                              ) : (
                                <span className="flex size-full items-center justify-center">
                                  <ImageIcon
                                    className="size-5 text-gray-11"
                                    aria-hidden
                                  />
                                </span>
                              )}
                            </span>
                            <p className="min-w-0 flex-1 text-base font-semibold text-gray-12 font-family-dm-sans leading-[1.3] wrap-break-word">
                              {ev.name}
                            </p>
                          </button>
                        );
                      })}
                      <CollaboratorDrawerEventsPagination
                        totalPages={eventsTotalPages}
                        safePage={safeEventsPage}
                        onPageChange={setEventsListPage}
                        disabled={saving || removing || isOwnerMember}
                      />
                    </>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Footer — mobile: remover acima + Cancelar | Adicionar/Salvar; desktop: ordem original */}
        <div className="shrink-0 border-t border-gray-6 bg-gray-1 md:bg-gray-2">
          <div className="flex flex-row flex-wrap items-stretch gap-2 px-4 py-3 pb-0 md:pb-3 md:justify-between">
            {mode === "edit" && !isOwnerMember && (
              <Button
                variant="destructive"
                onClick={handleRemove}
                disabled={saving || removing}
                className="hidden h-11 font-manrope font-bold text-base md:inline-flex"
              >
                {removing ? "Deletando…" : "Deletar"}
              </Button>
            )}
            <div className="flex items-center gap-2 w-full md:w-max">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={saving || removing}
                className="h-11 min-h-[44px] min-w-0 flex-1 rounded-lg border-gray-6 px-3 font-manrope font-bold text-base text-gray-12 md:min-w-[110px] md:flex-initial md:px-5"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                onClick={mode === "create" ? handleCreate : handleEditSave}
                disabled={
                  saving ||
                  removing ||
                  (mode === "edit" && (detailLoading || isOwnerMember))
                }
                className={cn(
                  "h-11 min-h-[44px] min-w-0 flex-1 rounded-lg px-3 font-manrope font-bold text-base md:min-w-[176px] md:flex-initial md:px-5",
                  "bg-[#59E373] text-gray-12 shadow-xs hover:bg-[#59E373]/90 hover:text-gray-1 active:bg-[#59E373]/80",
                  "md:bg-[#59E373] md:text-[#141414] md:hover:text-[#141414]/90 md:active:text-[#141414]/80"
                )}
              >
                {saving ? (
                  "Salvando…"
                ) : (
                  <>
                    <span className="md:hidden">{primaryCtaMobile}</span>
                    <span className="hidden md:inline">{primaryCta}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          {mode === "edit" && !isOwnerMember && (
            <div className="border-b border-gray-6 px-4 py-3 md:hidden">
              <Button
                variant="destructive"
                onClick={handleRemove}
                disabled={saving || removing}
                className="h-11 w-full rounded-lg font-manrope font-bold text-base"
              >
                {removing ? "Deletando…" : "Deletar da organização"}
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

