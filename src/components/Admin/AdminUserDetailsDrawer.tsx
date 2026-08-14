"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Phone as PhoneIcon, Eye, EyeOff, X, FileText } from "lucide-react";
import toast from "react-hot-toast";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Pagination } from "@/components/Pagination";
import { NationalitySelect } from "@/components/Checkout/NationalitySelect";
import { DatePickerWithConfirm } from "@/components/DateOfBirthPicker/DatePickerWithConfirm";
import { ArrowButton } from "@/components/ArrowButton";
import { HeartIcon } from "@/components/Icons/HeartIcon";
import { EmailIcon } from "@/components/Icons/EmailIcon";
import { CPFIcon } from "@/components/Icons/CPFIcon";
import { TicketIcon } from "@/components/Icons/TicketIcon";
import { adminService, userService } from "@/services";
import type { AdminUser } from "@/services/admin/AdminService";
import { queryKeys } from "@/services/cache/QueryClient";
import { getFinalStatus, getRegistrationStatusBadge } from "@/lib/registrations";
import { formatShortId } from "@/utils/shortId";
import { formatTimeBRT } from "@/utils/datetimeBR";
import { normalizeNationality } from "@/utils/nationality";
import { isBrazilianCountry } from "@/validators/Auth.validator";
import { formatDocumentDisplay } from "@/utils/documentDisplay";
import {
  getPhonePlaceholderForCountry,
  getPhoneMaxLengthForCountry,
  getPhoneDigitsForBackend,
} from "@/utils/phone";
import { usePaymentDetailsModal, useViewRegistrationModal } from "@/stores/modalStore";
import { cn } from "@/utils/cn";

const REG_PAGE_SIZE = 8;

// ─── Gênero (tela ↔ backend) ────────────────────────────────────────────────
function genderToDisplay(g: string | null | undefined): string {
  switch ((g ?? "").toUpperCase()) {
    case "MALE": return "Masculino";
    case "FEMALE": return "Feminino";
    case "OTHER": return "Outro";
    case "PREFER_NOT_TO_SAY": return "Prefiro não informar";
    default: return "";
  }
}
function genderToBackend(d: string): string {
  switch (d) {
    case "Masculino": return "MALE";
    case "Feminino": return "FEMALE";
    case "Outro": return "OTHER";
    default: return "";
  }
}

// ─── Data (instante → BRT "DD Mês, AAAA" + hora) ─────────────────────────────
function formatPurchase(iso?: string): { date: string; time: string } {
  if (!iso) return { date: "—", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "" };
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return {
    date: `${String(brt.getUTCDate()).padStart(2, "0")} ${months[brt.getUTCMonth()]}, ${brt.getUTCFullYear()}`,
    time: formatTimeBRT(iso, { hour: "2-digit", minute: "2-digit" }),
  };
}

interface FormState {
  name: string;
  dateOfBirth: string; // YYYY-MM-DD
  nationality: string;
  phone: string;
  gender: string; // display
  newPassword: string;
}

interface AdminUserDetailsDrawerProps {
  /** null = fechado. */
  userId: string | null;
  /** Linha da lista (fallback visual enquanto o detalhe carrega). */
  fallback?: AdminUser | null;
  onClose: () => void;
}

// ─── Campo (label + hint) ────────────────────────────────────────────────────
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <label className="text-base text-gray-12 font-family-dm-sans">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-11 font-family-dm-sans leading-[1.3]">{hint}</p>}
    </div>
  );
}

const fieldBox = "flex h-12 items-center gap-2 rounded-lg border border-gray-6 bg-transparent px-3";
const fieldBoxDisabled = "flex h-12 items-center gap-2 rounded-lg border border-gray-6 bg-gray-3 px-3";

export function AdminUserDetailsDrawer({ userId, fallback, onClose }: AdminUserDetailsDrawerProps) {
  const queryClient = useQueryClient();
  const { openPaymentDetailsModal } = usePaymentDetailsModal();
  const { openViewRegistrationModal } = useViewRegistrationModal();

  // O vaul Drawer (modal) usa scroll-lock (react-remove-scroll) que só permite
  // rolagem DENTRO do drawer → o modal aberto por cima não scrolla enquanto o
  // drawer está aberto. Fechamos o drawer ao abrir o modal: o modal (que é a
  // própria visão de detalhe) abre 100% funcional. [[project_modal_inside_drawer]]
  const openOrderModal = (registrationId: string) => {
    onClose();
    openPaymentDetailsModal({ registrationId });
  };
  const openTicketModal = (registrationId: string) => {
    onClose();
    openViewRegistrationModal({ registrationId });
  };

  const [form, setForm] = useState<FormState>({
    name: "", dateOfBirth: "", nationality: "", phone: "", gender: "", newPassword: "",
  });
  const [showGender, setShowGender] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [regPage, setRegPage] = useState(1);

  // Perfil completo (form).
  const detailQuery = useQuery({
    queryKey: queryKeys.admin.users.detail(userId ?? ""),
    queryFn: () => adminService.getAdminUser(userId as string),
    enabled: !!userId,
  });
  const detail = detailQuery.data ?? null;

  // Ingressos (inscrições) do usuário.
  const regQuery = useQuery({
    queryKey: queryKeys.admin.users.registrations(userId ?? "", { page: regPage }),
    queryFn: () => adminService.getAdminUserRegistrations(userId as string, { page: regPage, limit: REG_PAGE_SIZE }),
    enabled: !!userId,
    placeholderData: (prev) => prev,
  });
  const registrations = regQuery.data?.items ?? [];
  const regTotalPages = regQuery.data?.pagination.totalPages ?? 1;
  const regTotal = regQuery.data?.pagination.total ?? 0;

  // Inicializa o form quando o detalhe carrega (ou troca de usuário).
  useEffect(() => {
    if (!detail) return;
    setForm({
      name: `${detail.firstName ?? ""} ${detail.lastName ?? ""}`.trim(),
      dateOfBirth: detail.dateOfBirth ? detail.dateOfBirth.slice(0, 10) : "",
      nationality: normalizeNationality(detail.country) ?? detail.country ?? "",
      phone: detail.phone ?? "",
      gender: genderToDisplay(detail.gender),
      newPassword: "",
    });
    setShowPassword(false);
    setShowGender(false);
  }, [detail]);

  // Reseta a página de ingressos ao trocar de usuário.
  useEffect(() => {
    setRegPage(1);
  }, [userId]);

  const isBr = isBrazilianCountry(form.nationality);
  const displayEmail = detail?.email ?? fallback?.email ?? "";
  const displayDoc = detail
    ? formatDocumentDisplay(detail.documentNumber, isBr) || "—"
    : "—";

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const updateData: Record<string, unknown> = {};
      const full = form.name.trim();
      if (full) {
        const parts = full.split(/\s+/);
        updateData.firstName = parts[0];
        updateData.lastName = parts.slice(1).join(" ") || "";
      }
      if (form.dateOfBirth) updateData.dateOfBirth = form.dateOfBirth;
      if (form.nationality) updateData.country = form.nationality;
      // Telefone: dígitos nacionais por país (igual ao perfil do participante).
      updateData.phone = form.phone
        ? getPhoneDigitsForBackend(form.phone, form.nationality)
        : null;
      if (form.gender) updateData.gender = genderToBackend(form.gender);
      // Senha só vai quando o admin digitou uma nova (reset).
      const pwd = form.newPassword.trim();
      if (pwd) updateData.password = pwd;
      await userService.updateUser(userId, updateData);
    },
    onSuccess: () => {
      toast.success("Dados atualizados com sucesso!");
      setForm((f) => ({ ...f, newPassword: "" }));
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all() });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Erro ao salvar. Tente novamente.";
      toast.error(msg);
    },
  });

  const handleExport = async () => {
    if (!userId) return;
    try {
      const { blob, filename } = await adminService.exportAdminUserTickets(userId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Não foi possível exportar.");
    }
  };

  return (
    <Drawer
      open={!!userId}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      direction="right"
    >
      <DrawerContent className="bg-gray-1 h-full w-full sm:max-w-[720px] border-l border-gray-6 flex flex-col">
        <DrawerTitle className="sr-only">Detalhes do usuário</DrawerTitle>
        <DrawerHeader className="px-5 py-4 border-b border-gray-6 shrink-0 flex-row items-center justify-between">
          <span className="text-lg font-bold text-gray-12 font-manrope">Detalhes do usuário</span>
          <DrawerClose asChild>
            <button
              type="button"
              aria-label="Fechar"
              className="flex size-9 items-center justify-center rounded-lg text-gray-12 hover:bg-gray-3 transition-colors"
            >
              <X className="size-5" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto">
          {/* ── Dados pessoais ── */}
          <div className="px-5 py-5">
            <h3 className="text-lg font-bold text-gray-12 font-manrope">Dados pessoais</h3>
            <p className="mt-1 text-sm text-gray-11 font-family-dm-sans leading-[1.4]">
              Usamos esses dados nas inscrições de eventos. Preencha exatamente como está no seu documento.
            </p>

            {detailQuery.isLoading && !detail ? (
              <div className="py-10 text-center text-sm text-gray-11 font-family-dm-sans">Carregando…</div>
            ) : (
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <Field label="Nome">
                  <div className={fieldBox}>
                    <User className="size-5 shrink-0 text-gray-11" />
                    <input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Nome completo"
                      className="h-auto w-full border-0 bg-transparent p-0 outline-none text-base text-gray-12 font-family-dm-sans placeholder:text-gray-11"
                    />
                  </div>
                </Field>

                {/* Data de nascimento */}
                <Field label="Data de nascimento">
                  <DatePickerWithConfirm
                    value={form.dateOfBirth}
                    onChange={(value) => {
                      const dateString = value
                        ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
                        : "";
                      setForm((f) => ({ ...f, dateOfBirth: dateString }));
                    }}
                  />
                </Field>

                {/* Email (não editável) */}
                <Field
                  label="Email"
                  hint="O e-mail é o login da conta. Só o próprio usuário pode alterá-lo, por segurança"
                >
                  <div className={fieldBoxDisabled}>
                    <EmailIcon className="size-5 shrink-0 text-gray-11" />
                    <span className="truncate text-base text-gray-11 font-family-dm-sans">
                      {displayEmail || "—"}
                    </span>
                  </div>
                </Field>

                {/* CPF (não editável) */}
                <Field
                  label={isBr ? "CPF" : "Documento"}
                  hint="Documento de identidade fiscal. Não editável para evitar fraude em inscrições"
                >
                  <div className={fieldBoxDisabled}>
                    <CPFIcon className="size-5 shrink-0 text-gray-11" />
                    <span className="truncate text-base text-gray-11 font-family-dm-sans">
                      {displayDoc}
                    </span>
                  </div>
                </Field>

                {/* Nacionalidade */}
                <Field label="Nacionalidade">
                  <NationalitySelect
                    value={form.nationality}
                    onChange={(country) => setForm((f) => ({ ...f, nationality: country }))}
                  />
                </Field>

                {/* Telefone */}
                <Field label="Telefone">
                  <div className={fieldBox}>
                    <PhoneIcon className="size-5 shrink-0 text-gray-11" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder={getPhonePlaceholderForCountry(form.nationality)}
                      maxLength={getPhoneMaxLengthForCountry(form.nationality)}
                      className="h-auto w-full border-0 bg-transparent p-0 outline-none text-base text-gray-12 font-family-dm-sans placeholder:text-gray-11"
                    />
                  </div>
                </Field>

                {/* Sexo */}
                <Field label="Sexo">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowGender((s) => !s)}
                      className="flex h-12 w-full items-center justify-between rounded-lg border border-gray-6 bg-transparent px-3"
                    >
                      <div className="flex items-center gap-2">
                        <HeartIcon className="size-5 shrink-0 text-gray-11" />
                        <span className={cn("text-base font-family-dm-sans", form.gender ? "text-gray-12" : "text-gray-11")}>
                          {form.gender || "Selecione"}
                        </span>
                      </div>
                      <ArrowButton isOpen={showGender} />
                    </button>
                    {showGender && (
                      <div className="absolute top-[52px] z-20 w-full rounded-lg border border-gray-6 bg-gray-1 shadow-[0px_2px_4px_0px_rgba(0,0,0,0.25)]">
                        {["Masculino", "Feminino", "Outro"].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => {
                              setForm((f) => ({ ...f, gender: g }));
                              setShowGender(false);
                            }}
                            className="flex w-full items-center gap-2 border-b border-gray-4 px-3 py-3.5 text-left text-base text-gray-12 hover:bg-gray-2 last:border-0"
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </Field>

                {/* Alterar senha do usuário */}
                <Field label="Alterar senha do usuário">
                  <div className={fieldBox}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.newPassword}
                      onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="h-auto w-full border-0 bg-transparent p-0 outline-none text-base text-gray-12 font-family-dm-sans placeholder:text-gray-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      className="shrink-0 text-gray-11 hover:text-gray-12 transition-colors"
                    >
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                </Field>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <Button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !detail}
                className="w-auto"
              >
                {saveMutation.isPending ? "Salvando…" : "Salvar alterações"}
              </Button>
            </div>
          </div>

          {/* ── Ingressos adquiridos ── */}
          <div className="border-t border-gray-6 px-5 py-5">
            <h3 className="text-lg font-bold text-gray-12 font-manrope">Ingressos adquiridos</h3>

            <div className="mt-4 rounded-xl border border-gray-6 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px]">
                  <thead>
                    <tr className="bg-gray-3 border-b border-gray-6">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">ID inscrição</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">Data da compra</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">Status</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-11 font-family-dm-sans uppercase tracking-wide">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-6">
                    {regQuery.isLoading && registrations.length === 0 ? (
                      <tr><td colSpan={4} className="py-10 text-center text-sm text-gray-11 font-family-dm-sans">Carregando…</td></tr>
                    ) : registrations.length === 0 ? (
                      <tr><td colSpan={4} className="py-10 text-center text-sm text-gray-11 font-family-dm-sans">Nenhum ingresso adquirido.</td></tr>
                    ) : (
                      registrations.map((r) => {
                        const { date, time } = formatPurchase(r.createdAt);
                        // Status IGUAL à tela de inscrições do evento: mesma lógica
                        // (getFinalStatus + regras do RegistrationRow) e mesmo design.
                        const finalStatus = getFinalStatus(
                          r as unknown as Parameters<typeof getFinalStatus>[0],
                        );
                        const paymentStatus = r.order?.payment?.status;
                        const meta = r.order?.payment?.metadata;
                        const refundType = r.order?.payment?.refundType;
                        const badge = getRegistrationStatusBadge(finalStatus);
                        const isCancelled =
                          finalStatus === "CANCELLED" || paymentStatus === "FAILED";
                        const isRefunded =
                          finalStatus === "REFUNDED" ||
                          paymentStatus === "REFUNDED" ||
                          (!!meta && refundType === "REFUND");
                        const isChargeback =
                          finalStatus === "CHARGEBACK" ||
                          paymentStatus === "CHARGEBACK" ||
                          (!!meta && refundType === "CHARGEBACK");
                        const isPaid =
                          !isCancelled &&
                          !isRefunded &&
                          !isChargeback &&
                          (finalStatus === "CONFIRMED" ||
                            finalStatus === "COMPLETED" ||
                            paymentStatus === "PAID");
                        return (
                          <tr key={r.id} className="hover:bg-gray-2/80 transition-colors">
                            <td className="py-3 px-4">
                              <span className="text-sm font-semibold text-gray-12 font-family-dm-sans">{formatShortId(r.id)}</span>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-sm font-semibold text-gray-12 font-family-dm-sans whitespace-nowrap">{date}</p>
                              <p className="text-xs text-gray-11 font-family-dm-sans">{time}</p>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={cn(
                                  "inline-flex items-center justify-center gap-1 px-3 py-1 rounded text-xs font-medium whitespace-nowrap",
                                  isPaid
                                    ? "bg-primary-11 text-white"
                                    : isCancelled
                                      ? "bg-red-11 text-white"
                                      : isChargeback
                                        ? "bg-red-11 text-white"
                                        : isRefunded
                                          ? "bg-red-11 text-white"
                                          : badge?.className || "bg-gray-10/20 text-gray-11",
                                )}
                              >
                                {isPaid
                                  ? "Pago"
                                  : isCancelled
                                    ? "Cancelado"
                                    : isChargeback
                                      ? "ChargeBack"
                                      : isRefunded
                                        ? "Estornado"
                                        : badge?.label || "Desconhecido"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openOrderModal(r.id)}
                                  aria-label="Ver pedido"
                                  title="Ver pedido"
                                  className="flex size-9 items-center justify-center rounded-lg border border-gray-6 text-gray-12 hover:bg-gray-3 transition-colors"
                                >
                                  <FileText className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openTicketModal(r.id)}
                                  aria-label="Ver ingresso"
                                  title="Ver ingresso"
                                  className="flex size-9 items-center justify-center rounded-lg border border-gray-6 text-gray-12 hover:bg-gray-3 transition-colors"
                                >
                                  <TicketIcon className="size-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Rodapé: paginação + Exportar CSV */}
              <div className="flex items-center justify-between gap-3 flex-wrap border-t border-gray-6 px-4 py-3">
                {regTotalPages > 1 ? (
                  <Pagination
                    currentPage={regPage}
                    totalPages={regTotalPages}
                    onPageChange={setRegPage}
                    totalItems={regTotal}
                    pageSize={REG_PAGE_SIZE}
                    className="w-auto justify-start"
                  />
                ) : (
                  <span />
                )}
                <Button
                  type="button"
                  onClick={() => void handleExport()}
                  disabled={registrations.length === 0}
                  className="w-auto"
                >
                  Exportar CSV
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
