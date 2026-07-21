"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeft, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/Button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { getApiClient } from "@/services/base/ApiClient";
import { cn } from "@/utils/cn";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminMember {
  id: string;
  role: "OWNER" | "EMPLOYEE";
  userId: string;
  updatedAt?: string;
  permissions?: string[];
  user: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    lastLoginAt?: string | null;
    avatarUrl?: string | null;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PERMISSION_ROWS: { id: string; title: string; description: string }[] = [
  { id: "financial", title: "Financeiro", description: "Gerencie repasses, saldos e valores em processamento, com histórico e outras informações financeiras." },
  { id: "edit_event", title: "Editar Evento", description: "Atualize as informações do evento, como data, ingressos, kits, perguntas e outras configurações." },
  { id: "view_event", title: "Visualizar Evento", description: "Permite visualizar o painel de edição do evento e acessar a aba de inscrições, sem permissão para editar." },
  { id: "coupons", title: "Cupons", description: "Acesso à criação e gerenciamento de cupons de desconto e benefícios do evento." },
  { id: "pixel", title: "Pixel", description: "Permite configurar pixels de rastreamento (como Meta/Facebook e Google) para acompanhar conversões e campanhas." },
  { id: "notify", title: "Notificar Inscritos", description: "Permite enviar notificações ou comunicados para todos os inscritos do evento." },
  { id: "create_event", title: "Criar Evento", description: "Permite criar novos eventos na organização." },
];

const DEFAULT_PERMISSIONS: Record<string, boolean> = {
  financial: false,
  edit_event: false,
  view_event: true,
  coupons: false,
  pixel: false,
  notify: false,
  create_event: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function splitFullName(full: string) {
  const t = full.trim();
  if (!t) return { firstName: "", lastName: "" };
  const i = t.indexOf(" ");
  if (i === -1) return { firstName: t, lastName: "" };
  return { firstName: t.slice(0, i).trim(), lastName: t.slice(i + 1).trim() };
}

function permissionsFromArray(keys: string[] | undefined | null): Record<string, boolean> {
  const base: Record<string, boolean> = {};
  for (const row of PERMISSION_ROWS) base[row.id] = false;
  if (!keys?.length) return base;
  const set = new Set(keys.map((k) => k.toLowerCase()));
  for (const k of set) { if (k in base) base[k] = true; }
  return base;
}

function permissionsToArray(p: Record<string, boolean>): string[] {
  return PERMISSION_ROWS.map((r) => r.id).filter((id) => p[id]);
}

/** Todas as permissões no mesmo valor — usado por Proprietário e pelos atalhos. */
function allPermissions(value: boolean): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  for (const row of PERMISSION_ROWS) next[row.id] = value;
  return next;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PermissionCheckbox({ checked }: { checked: boolean }) {
  return (
    <span className={cn("size-6 shrink-0 rounded-md border flex items-center justify-center transition-colors pointer-events-none", checked ? "bg-[#C8F4CC] border-[#94CE9A] text-gray-12" : "border-gray-6 bg-gray-1")} aria-hidden>
      {checked && <Check className="size-3.5" strokeWidth={2.5} />}
    </span>
  );
}

function FieldShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-base text-gray-12 font-normal font-family-dm-sans leading-[1.3]">{label}</label>
      {children}
    </div>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

export function AdminCollaboratorDrawer({
  open,
  mode,
  member,
  orgId,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  mode: "create" | "edit";
  member: AdminMember | null;
  orgId: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [detailLoading, setDetailLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({ ...DEFAULT_PERMISSIONS });
  const [isOwner, setIsOwner] = useState(false);

  const inputClass = "h-12 w-full rounded-lg border border-gray-6 bg-gray-1 px-3 text-base text-gray-12 placeholder:text-gray-11 font-family-dm-sans outline-none focus-visible:border-gray-4 focus-visible:ring-[3px] focus-visible:ring-gray-4/50";
  const inputError = (field: string) => fieldErrors[field] ? "border-red-8 focus-visible:ring-red-8/50 focus-visible:border-red-8" : "";

  const resetForm = useCallback(() => {
    setFullName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setPermissions({ ...DEFAULT_PERMISSIONS });
    setIsOwner(false);
    setFieldErrors({});
  }, []);

  useEffect(() => {
    if (!open) return;
    if (mode === "create") { resetForm(); return; }
    if (!member) return;
    let cancelled = false;
    setDetailLoading(true);
    setFullName(`${member.user.firstName ?? ""} ${member.user.lastName ?? ""}`.trim());
    setEmail(member.user.email ?? "");
    setIsOwner(member.role === "OWNER");
    setPermissions(permissionsFromArray(member.permissions));
    setFieldErrors({});
    (async () => {
      try {
        const api = getApiClient();
        const res = await api.get<any>(`/api/v1/admin/organizations/${orgId}/members/${member.userId}`);
        if (cancelled) return;
        const m = res.data?.member ?? res.data?.data?.member ?? res.data?.data ?? res.data;
        setFullName(`${m?.user?.firstName ?? ""} ${m?.user?.lastName ?? ""}`.trim());
        setEmail(m?.user?.email ?? member.user.email ?? "");
        setIsOwner((m?.role ?? member.role) === "OWNER");
        const rawPerms = m?.permissions;
        if (rawPerms && typeof rawPerms === "object" && !Array.isArray(rawPerms)) {
          const base = { ...DEFAULT_PERMISSIONS };
          for (const key of Object.keys(base)) {
            if (key in rawPerms) base[key] = !!rawPerms[key];
          }
          setPermissions(base);
        } else {
          setPermissions(permissionsFromArray(Array.isArray(rawPerms) ? rawPerms : []));
        }
      } catch {
        // fallback already set above from member prop
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, mode, member, orgId, resetForm]);

  const handleClose = () => { if (!saving && !removing) onOpenChange(false); };

  /**
   * Proprietário = acesso total. Marcar liga TODAS as permissões; desmarcar não
   * mexe nelas (o admin acabou de definir esse conjunto — quem decide o que tirar
   * é ele, não o toggle).
   */
  const handleOwnerToggle = useCallback(() => {
    const next = !isOwner;
    setIsOwner(next);
    if (next) setPermissions(allPermissions(true));
  }, [isOwner]);

  /**
   * Desmarcar QUALQUER permissão quebra o "acesso total" → o membro deixa de ser
   * Proprietário. Marcar de volta não repromove: Proprietário é um papel, não a
   * soma dos checkboxes.
   */
  const handlePermissionToggle = useCallback((id: string) => {
    const willBeChecked = !permissions[id];
    setPermissions((prev) => ({ ...prev, [id]: !prev[id] }));
    if (!willBeChecked) setIsOwner(false);
  }, [permissions]);

  const handleSelectAllPermissions = useCallback(() => {
    setPermissions(allPermissions(true));
  }, []);

  /** Limpar tudo remove o acesso total — logo, também deixa de ser Proprietário. */
  const handleClearAllPermissions = useCallback(() => {
    setPermissions(allPermissions(false));
    setIsOwner(false);
  }, []);

  const handleCreate = async () => {
    const { firstName, lastName } = splitFullName(fullName);
    const errors: Record<string, string> = {};
    if (!firstName.trim() || !lastName.trim()) errors.fullName = "Informe o nome completo (nome e sobrenome).";
    if (!email.trim()) errors.email = "Informe o e-mail do membro.";
    if (!password.trim()) errors.password = "Informe a senha inicial do colaborador.";
    else if (password.length < 6) errors.password = "A senha deve ter pelo menos 6 caracteres.";
    if (password.trim() && confirmPassword !== password) errors.confirmPassword = "As senhas não coincidem.";
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setSaving(true);
    try {
      const api = getApiClient();
      await api.post(`/api/v1/admin/organizations/${orgId}/members`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password: password.trim(),
        role: isOwner ? "OWNER" : "EMPLOYEE",
        permissions: permissionsToArray(permissions),
      });
      toast.success("Colaborador criado.");
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      const rawMsg = err?.response?.data?.message;
      const apiMsg: string = Array.isArray(rawMsg)
        ? rawMsg[0]
        : (typeof rawMsg === "string" ? rawMsg : "");
      // Conflitos de e-mail vindos do backend aparecem como erro de validação
      // no input de e-mail (não como toast). Normaliza pra NFC porque "já"
      // pode chegar decomposto (j + combining-acute) — sem normalizar, o regex
      // falha silenciosamente. Cobre todas as variantes do backend:
      //  - "Esse email já foi cadastrado."
      //  - "User with this email already exists"
      //  - "Este usuário já está em uma organização."
      //  - "Usuário já existe na organização."
      // Fallback: qualquer 409 que mencione "email"/"usuário" também cai aqui.
      const norm = apiMsg.normalize("NFC").toLowerCase();
      const isEmailConflict =
        /e-?mail.*cadastrad/.test(norm) ||
        /cadastrad.*e-?mail/.test(norm) ||
        /j(?:á|á)\s+est(?:á|á).*organiza/.test(norm) ||
        /j(?:á|á)\s+existe.*organiza/.test(norm) ||
        /e-?mail.*already\s+exists/.test(norm) ||
        (err?.response?.status === 409 && /e-?mail|usu(?:á|á)rio/.test(norm));
      if (isEmailConflict) {
        setFieldErrors({ email: apiMsg });
      } else {
        toast.error(apiMsg || err?.message || "Não foi possível criar o colaborador.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!member) { onOpenChange(false); return; }
    const { firstName, lastName } = splitFullName(fullName);
    const errors: Record<string, string> = {};
    if (!firstName.trim() || !lastName.trim()) errors.fullName = "Informe o nome completo (nome e sobrenome).";
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setSaving(true);
    try {
      const api = getApiClient();
      await api.patch(`/api/v1/admin/organizations/${orgId}/members/${member.userId}`, {
        role: isOwner ? "OWNER" : "EMPLOYEE",
        permissions: permissionsToArray(permissions),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      toast.success("Colaborador atualizado.");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveConfirmed = async () => {
    if (!member) return;
    setRemoving(true);
    try {
      const api = getApiClient();
      await api.delete(`/api/v1/admin/organizations/${orgId}/members/${member.userId}`);
      setDeleteConfirmOpen(false);
      toast.success("Colaborador removido.");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Não foi possível remover.");
    } finally {
      setRemoving(false);
    }
  };

  const titleText = mode === "create" ? "Adicionar colaborador" : "Editar colaborador";
  const primaryCta = mode === "create" ? "Criar colaborador" : "Salvar alterações";

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent
        overlayClassName="bg-black/50 supports-backdrop-filter:backdrop-blur-[2px]"
        className={cn(
          "bg-gray-1 flex h-dvh max-h-dvh w-full flex-col gap-0 p-0 shadow-none",
          "data-[vaul-drawer-direction=right]:max-w-full data-[vaul-drawer-direction=right]:sm:max-w-full",
          "data-[vaul-drawer-direction=right]:md:max-w-[644px]",
          "data-[vaul-drawer-direction=right]:rounded-none data-[vaul-drawer-direction=right]:border-0",
          "data-[vaul-drawer-direction=right]:md:rounded-l-xl data-[vaul-drawer-direction=right]:md:border-l data-[vaul-drawer-direction=right]:md:border-gray-6",
        )}
        aria-describedby={undefined}
      >
        <DrawerTitle className="sr-only">{titleText}</DrawerTitle>

        <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden">

          {/* Delete confirmation overlay */}
          <AnimatePresence>
            {deleteConfirmOpen && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 p-4"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ duration: 0.15, ease: "easeOut" }}
                  className="bg-gray-1 rounded-xl shadow-2xl w-full max-w-[442px] overflow-hidden"
                >
                  <div className="flex flex-col items-center justify-center px-5 pt-6 pb-5 gap-11">
                    <div className="flex flex-col gap-4 items-center justify-center w-full">
                      <p className="font-semibold text-[20px] leading-[1.3] text-gray-12 font-family-dm-sans text-center">Deletar colaborador?</p>
                      <p className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans text-center">
                        O colaborador{" "}
                        <span className="font-semibold text-gray-12">&quot;{member ? `${member.user.firstName ?? ""} ${member.user.lastName ?? ""}`.trim() : ""}&quot;</span>{" "}
                        será removido permanentemente da organização. Esta ação não pode ser desfeita.
                      </p>
                    </div>
                    <div className="flex gap-2 items-stretch w-full">
                      <Button type="button" variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={removing} className="flex-1 h-12 border-[1.5px] border-gray-6 text-gray-12 font-bold text-base font-manrope">Fechar</Button>
                      <button type="button" onClick={handleRemoveConfirmed} disabled={removing} className="flex-1 h-12 bg-red-11 text-red-2 font-bold text-base font-manrope rounded-lg transition-colors hover:bg-red-12 disabled:opacity-50 flex items-center justify-center">
                        {removing ? "Deletando…" : "Deletar colaborador"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <div className="shrink-0 border-b border-gray-6 px-4 py-3 md:h-[60px] md:px-5 md:py-0 md:flex md:items-center">
            <div className="flex items-start gap-3 md:h-full md:w-full md:items-center md:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-3 md:items-center">
                <button type="button" onClick={handleClose} disabled={saving || removing} className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-12 hover:bg-gray-3 transition-colors disabled:opacity-50 md:hidden" aria-label="Voltar">
                  <ArrowLeft className="size-5" strokeWidth={2} />
                </button>
                <h2 className="text-base font-bold text-gray-12 font-manrope leading-[1.1] md:text-xl md:font-semibold md:font-family-dm-sans md:leading-[1.3]">
                  {titleText}
                </h2>
              </div>
              <button type="button" onClick={handleClose} disabled={saving || removing} className="hidden size-9 shrink-0 items-center justify-center rounded-lg text-gray-12 hover:bg-gray-3 transition-colors disabled:opacity-50 md:flex" aria-label="Fechar">
                <X className="size-5" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-7 py-5">

              {/* Informações básicas */}
              <section className="flex flex-col gap-4 md:gap-5 px-4">
                <h3 className="text-base font-bold text-gray-12 font-manrope leading-[1.1] md:text-lg">Informações básicas</h3>
                <div className="flex flex-col gap-4">
                  {mode === "create" ? (
                    <>
                      <FieldShell label="Nome completo">
                        <input className={cn(inputClass, inputError("fullName"))} placeholder="Digite o nome completo" value={fullName} onChange={(e) => { setFullName(e.target.value); if (fieldErrors.fullName) setFieldErrors((p) => { const n = { ...p }; delete n.fullName; return n; }); }} disabled={saving} autoComplete="name" />
                        {fieldErrors.fullName && <p className="text-sm text-red-11 font-family-dm-sans">{fieldErrors.fullName}</p>}
                      </FieldShell>
                      <FieldShell label="E-mail do membro">
                        <input type="email" className={cn(inputClass, inputError("email"))} placeholder="Digite o e-mail" value={email} onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors((p) => { const n = { ...p }; delete n.email; return n; }); }} disabled={saving} autoComplete="email" />
                        {fieldErrors.email && <p className="text-sm text-red-11 font-family-dm-sans">{fieldErrors.email}</p>}
                      </FieldShell>
                      <FieldShell label="Senha">
                        <div className="relative">
                          <input type={showPassword ? "text" : "password"} className={cn(inputClass, inputError("password"))} placeholder="Digite a senha inicial" value={password} onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors((p) => { const n = { ...p }; delete n.password; return n; }); }} disabled={saving} autoComplete="new-password" />
                          <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12" tabIndex={-1}>
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {fieldErrors.password && <p className="text-sm text-red-11 font-family-dm-sans">{fieldErrors.password}</p>}
                      </FieldShell>
                      <FieldShell label="Confirmar senha">
                        <div className="relative">
                          <input type={showConfirmPassword ? "text" : "password"} className={cn(inputClass, inputError("confirmPassword"))} placeholder="Confirme a senha" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); if (fieldErrors.confirmPassword) setFieldErrors((p) => { const n = { ...p }; delete n.confirmPassword; return n; }); }} disabled={saving} autoComplete="new-password" />
                          <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12" tabIndex={-1}>
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {fieldErrors.confirmPassword && <p className="text-sm text-red-11 font-family-dm-sans">{fieldErrors.confirmPassword}</p>}
                      </FieldShell>
                      <button type="button" role="checkbox" aria-checked={isOwner} onClick={handleOwnerToggle} disabled={saving} className="flex w-full gap-3 rounded-lg border border-gray-6 px-3 py-4 text-left transition-colors hover:bg-gray-2/50 disabled:opacity-50">
                        <PermissionCheckbox checked={isOwner} />
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <p className="text-base font-semibold text-gray-12 font-family-dm-sans">Proprietário</p>
                          <p className="text-sm font-normal text-gray-11 font-family-dm-sans">O membro terá acesso total à organização.</p>
                        </div>
                      </button>
                    </>
                  ) : (
                    <>
                      <FieldShell label="Nome completo">
                        <input className={cn(inputClass, inputError("fullName"))} placeholder="Digite o nome completo" value={fullName} onChange={(e) => { setFullName(e.target.value); if (fieldErrors.fullName) setFieldErrors((p) => { const n = { ...p }; delete n.fullName; return n; }); }} disabled={saving || detailLoading} autoComplete="name" />
                        {fieldErrors.fullName && <p className="text-sm text-red-11 font-family-dm-sans">{fieldErrors.fullName}</p>}
                      </FieldShell>
                      <FieldShell label="E-mail do membro">
                        <input type="email" className={cn(inputClass, "bg-gray-2 text-gray-11 cursor-not-allowed")} value={email} readOnly />
                      </FieldShell>
                      <button type="button" role="checkbox" aria-checked={isOwner} onClick={handleOwnerToggle} disabled={saving || detailLoading} className="flex w-full gap-3 rounded-lg border border-gray-6 px-3 py-4 text-left transition-colors hover:bg-gray-2/50 disabled:opacity-50">
                        <PermissionCheckbox checked={isOwner} />
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <p className="text-base font-semibold text-gray-12 font-family-dm-sans">Proprietário</p>
                          <p className="text-sm font-normal text-gray-11 font-family-dm-sans">O membro terá acesso total à organização.</p>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              </section>

              {/* Permissões */}
              <section className="flex flex-col gap-4 md:gap-5 px-4 pb-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <h3 className="text-base font-bold text-gray-12 font-manrope leading-[1.1] md:text-lg">Permissões</h3>
                  <div className="grid grid-cols-2 gap-2 md:flex md:gap-2">
                    <button type="button" onClick={handleSelectAllPermissions} disabled={saving || removing} className="h-11 rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm font-bold text-gray-12 font-family-dm-sans hover:bg-gray-2 transition-colors disabled:opacity-50 md:h-10 md:px-5">Selecionar tudo</button>
                    <button type="button" onClick={handleClearAllPermissions} disabled={saving || removing} className="h-11 rounded-lg border border-gray-6 bg-gray-1 px-3 text-sm font-bold text-gray-12 font-family-dm-sans hover:bg-gray-2 transition-colors disabled:opacity-50 md:h-10 md:px-5">Limpar tudo</button>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {PERMISSION_ROWS.map((row) => (
                    <button key={row.id} type="button" role="checkbox" aria-checked={!!permissions[row.id]} onClick={() => handlePermissionToggle(row.id)} disabled={saving || removing} className="flex w-full gap-3 rounded-lg border border-gray-6 px-3 py-4 text-left transition-colors hover:bg-gray-2/50 disabled:opacity-50">
                      <PermissionCheckbox checked={!!permissions[row.id]} />
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <p className="text-base font-semibold text-gray-12 font-family-dm-sans">{row.title}</p>
                        <p className="text-sm font-normal text-gray-11 font-family-dm-sans">{row.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-gray-6 bg-gray-1 md:bg-gray-2">
            <div className="flex flex-row flex-wrap items-stretch gap-2 px-4 py-3 pb-0 md:pb-3 md:justify-between">
              {mode === "edit" && (
                <Button variant="destructive" onClick={() => setDeleteConfirmOpen(true)} disabled={saving || removing} className="hidden h-11 font-manrope font-bold text-base md:inline-flex">
                  {removing ? "Deletando…" : "Deletar"}
                </Button>
              )}
              <div className={cn("flex items-center gap-2 w-full pb-2 md:pb-0", mode === "edit" ? "md:w-max" : "md:w-full md:justify-between")}>
                <Button type="button" variant="outline" onClick={handleClose} disabled={saving || removing} className="h-11 min-h-[44px] min-w-0 flex-1 border-gray-6 px-3 font-manrope font-bold text-base text-gray-12 md:min-w-[110px] md:flex-initial md:px-5">Cancelar</Button>
                <Button type="button" onClick={mode === "create" ? handleCreate : handleEditSave} disabled={saving || removing || (mode === "edit" && detailLoading)} className="h-11 min-h-[44px] min-w-0 flex-1 px-3 font-manrope font-bold text-base bg-[#59E373] text-gray-12 shadow-xs hover:bg-[#59E373]/90 md:min-w-[176px] md:flex-initial md:px-5">
                  {saving ? "Salvando…" : primaryCta}
                </Button>
              </div>
            </div>
            {mode === "edit" && (
              <div className="border-b border-gray-6 px-4 py-3 md:hidden">
                <Button variant="destructive" onClick={() => setDeleteConfirmOpen(true)} disabled={saving || removing} className="h-11 w-full font-manrope font-bold text-base">
                  {removing ? "Deletando…" : "Deletar da organização"}
                </Button>
              </div>
            )}
          </div>

        </div>
      </DrawerContent>
    </Drawer>
  );
}
