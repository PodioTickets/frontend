"use client";

import { useEffect, useRef, useState } from "react";
import { X, Mail, Smartphone, Info } from "lucide-react";
import { Button } from "@/components/Button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/utils/cn";
import { getApiClient } from "@/services/base/ApiClient";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import toast from "react-hot-toast";
import { formatDateBRT } from "@/utils/datetimeBR";
import { sanitizeRichHtml } from "@/lib/richContent";

type NotificationStatus = "review" | "sent" | "denied";

interface NotificationDetail {
  id: string;
  title: string;
  channels: string[];
  status: NotificationStatus;
  messageHtml: string;
  occurredAt: string;
  createdAt: string;
  deniedReason?: string | null;
  event: {
    id: string;
    name: string;
    slug?: string;
    totalRegistrations?: number;
    organization: { id: string; name: string; tradeName?: string | null; logoUrl?: string | null };
  };
  createdBy: { id: string; firstName: string; lastName: string; email: string };
}

interface NotificationDetailResponse { data: NotificationDetail; }
interface ReviewResponse { data: { id: string; status: NotificationStatus }; }

function formatDateShort(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  // occurredAt é INSTANTE real → fuso de Brasília (BRT), não UTC.
  return formatDateBRT(iso, { day: "2-digit", month: "2-digit", year: "numeric" });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold text-gray-12 font-family-dm-sans leading-[1.3] mb-3">
      {children}
    </p>
  );
}

// Rendered INSIDE DrawerContent so vaul focus trap allows textarea interaction.
// Uses absolute inset-0 — DrawerContent (position:fixed) is the containing block.
function DenyConfirmModal({ onCancel, onConfirm, loading }: {
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-[200] flex items-center justify-center p-6 bg-black/20"
      onClick={(e) => { if (e.target === overlayRef.current && !loading) onCancel(); }}
    >
      <div className="bg-gray-1 rounded-2xl shadow-[0px_8px_32px_0px_rgba(17,17,17,0.30)] w-full max-w-[420px] flex flex-col overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-lg font-semibold text-gray-12 font-family-dm-sans leading-[1.3] text-center">
            Recusar anúncio
          </h3>
        </div>
        <div className="px-6 pb-6 flex flex-col gap-5">
          <div className="flex items-start gap-3 rounded-xl bg-yellow-3 border border-yellow-6 px-4 py-3">
            <Info className="size-4 shrink-0 text-yellow-11 mt-0.5" strokeWidth={2} />
            <p className="text-sm text-yellow-12 font-family-dm-sans leading-[1.4]">
              O organizador receberá essa justificativa pelo dashboard. Essa ação{" "}
              <strong className="font-bold">não pode ser desfeita</strong> — revise antes de confirmar.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-12 font-family-dm-sans leading-[1.3]">
              Motivo da negação
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: O conteúdo do anúncio contém linguagem imprópria"
              disabled={loading}
              rows={5}
              className={cn(
                "w-full resize-none rounded-lg border border-gray-6 bg-gray-1 px-3 py-3",
                "text-sm text-gray-12 placeholder:text-gray-11 font-family-dm-sans leading-relaxed",
                "outline-none focus-visible:border-gray-8 focus-visible:ring-[3px] focus-visible:ring-gray-4/50",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1 h-11 border-gray-6 text-gray-12" disabled={loading} onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" className="flex-1 h-11" disabled={loading} isLoading={loading} onClick={() => onConfirm(reason)}>
              Recusar envio
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationDetailDrawer({ notificationId, open, onOpenChange, onReviewed }: {
  notificationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewed?: (id: string, status: NotificationStatus) => void;
}) {
  const [detail, setDetail] = useState<NotificationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<"approve" | "deny" | null>(null);
  const [showDenyModal, setShowDenyModal] = useState(false);

  useEffect(() => {
    if (!open || !notificationId) { setDetail(null); setShowDenyModal(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const api = getApiClient();
        const res = await api.get<NotificationDetailResponse>(`/api/v1/admin/notifications/${notificationId}`);
        if (!cancelled) setDetail(res.data.data);
      } catch (e: any) {
        if (!cancelled) { toast.error(e?.response?.data?.message ?? "Erro ao carregar anúncio."); onOpenChange(false); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, notificationId, onOpenChange]);

  const handleApprove = async () => {
    if (!notificationId) return;
    setActing("approve");
    try {
      const api = getApiClient();
      const res = await api.post<ReviewResponse>(`/api/v1/admin/notifications/${notificationId}/review`, { action: "approve" });
      toast.success("Anúncio aprovado e e-mails disparados.");
      onReviewed?.(notificationId, res.data.data.status);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Erro ao aprovar anúncio.");
    } finally { setActing(null); }
  };

  const handleDenyConfirm = async (reason: string) => {
    if (!notificationId) return;
    setActing("deny");
    try {
      const api = getApiClient();
      const res = await api.post<ReviewResponse>(
        `/api/v1/admin/notifications/${notificationId}/review`,
        { action: "deny", ...(reason.trim() ? { reason: reason.trim() } : {}) }
      );
      toast.success("Anúncio recusado.");
      onReviewed?.(notificationId, res.data.data.status);
      setShowDenyModal(false);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Erro ao recusar anúncio.");
    } finally { setActing(null); }
  };

  const org = detail?.event.organization;
  const orgDisplayName = org?.tradeName ?? org?.name ?? "—";
  const creatorFullName = detail?.createdBy
    ? [detail.createdBy.firstName, detail.createdBy.lastName].filter(Boolean).join(" ")
    : "—";

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!showDenyModal) onOpenChange(v); }} direction="right">
      <DrawerContent
        overlayClassName="bg-black/50 supports-backdrop-filter:backdrop-blur-[2px]"
        className={cn(
          "bg-gray-1 flex h-dvh max-h-dvh w-full flex-col gap-0 rounded-none rounded-l-xl border-l border-gray-6 p-0",
          "data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:max-w-[644px]",
          "data-[vaul-drawer-direction=right]:sm:max-w-[644px]"
        )}
        aria-describedby={undefined}
      >
        <DrawerTitle className="sr-only">Detalhes do Anúncio</DrawerTitle>

        {/* DenyConfirmModal inside DrawerContent so vaul focus trap allows textarea interaction */}
        {showDenyModal && (
          <DenyConfirmModal
            onCancel={() => setShowDenyModal(false)}
            onConfirm={handleDenyConfirm}
            loading={acting === "deny"}
          />
        )}

        {/* Header */}
        <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-gray-6 px-5">
          <h2 className="text-xl font-semibold text-gray-12 font-family-dm-sans leading-[1.3]">Detalhes do Anúncio</h2>
          <button type="button" onClick={() => onOpenChange(false)} disabled={acting !== null}
            className="flex size-9 items-center justify-center rounded-lg text-gray-12 hover:bg-gray-3 transition-colors disabled:opacity-50" aria-label="Fechar">
            <X className="size-5" strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-gray-11 font-family-dm-sans">Carregando…</p>
            </div>
          ) : detail ? (
            <div className="flex flex-col gap-6">
              <section>
                <SectionLabel>Organização</SectionLabel>
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-lg border border-gray-6 overflow-hidden shrink-0 bg-gray-4 relative">
                    <ImageWithInitialFallback src={org?.logoUrl ?? null} alt={orgDisplayName} name={orgDisplayName} fill sizes="48px"
                      className="size-full rounded-lg" imgClassName="object-cover rounded-lg" letterClassName="text-sm font-semibold text-gray-11" />
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <p className="text-sm font-semibold text-gray-12 font-family-dm-sans leading-[1.1] truncate">{orgDisplayName}</p>
                    <p className="text-xs text-gray-11 font-family-dm-sans leading-[1.1] truncate">{detail.createdBy.email}</p>
                  </div>
                </div>
              </section>

              <section>
                <SectionLabel>Solicitação</SectionLabel>
                <div className="overflow-hidden flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-11 font-family-dm-sans shrink-0">Evento:</span>
                    <span className="text-sm font-semibold text-gray-12 font-family-dm-sans text-right truncate">{detail.event.name}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-11 font-family-dm-sans shrink-0">Organizador:</span>
                    <span className="text-sm font-semibold text-gray-12 font-family-dm-sans text-right truncate">{creatorFullName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-11 font-family-dm-sans shrink-0">Data do pedido:</span>
                    <span className="text-sm font-semibold text-gray-12 font-family-dm-sans text-right">{formatDateShort(detail.occurredAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-11 font-family-dm-sans shrink-0">Total inscritos:</span>
                    <span className="text-sm font-semibold text-gray-12 font-family-dm-sans text-right">{detail.event.totalRegistrations}</span>
                  </div>
                </div>
              </section>

              <section>
                <SectionLabel>Canais Solicitados</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {detail.channels.includes("email") && (
                    <div className="flex items-center gap-2 rounded-lg border border-gray-6 bg-gray-2 px-3 py-2">
                      <Mail className="size-4 text-gray-11 shrink-0" />
                      <span className="text-sm font-medium text-gray-12 font-family-dm-sans">Email</span>
                    </div>
                  )}
                  {detail.channels.includes("whatsapp") && (
                    <div className="flex items-center gap-2 rounded-lg border border-gray-6 bg-gray-2 px-3 py-2">
                      <Smartphone className="size-4 text-gray-11 shrink-0" />
                      <span className="text-sm font-medium text-gray-12 font-family-dm-sans">Whatsapp</span>
                    </div>
                  )}
                  {detail.channels.length === 0 && <span className="text-sm text-gray-11 font-family-dm-sans">—</span>}
                </div>
              </section>

              <section>
                <SectionLabel>Conteúdo da Mensagem</SectionLabel>
                <p className="text-base font-bold text-gray-12 font-family-dm-sans leading-[1.3] mb-3">{detail.title}</p>
                <div className="rounded-xl bg-gray-3 p-4">
                  <div
                    className="text-sm text-gray-12 font-family-dm-sans leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_a]:text-primary-11 [&_a]:underline [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(detail.messageHtml) }}
                  />
                </div>
              </section>

              {detail.status === "denied" && detail.deniedReason && (
                <section>
                  <SectionLabel>Motivo da negação</SectionLabel>
                  <div className="flex items-start gap-3 rounded-xl border border-red-6 bg-red-3 px-4 py-3">
                    <Info className="size-4 shrink-0 text-red-11 mt-0.5" strokeWidth={2} />
                    <p className="text-sm text-red-12 font-family-dm-sans leading-[1.4]">
                      {detail.deniedReason}
                    </p>
                  </div>
                </section>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {detail?.status === "review" && (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-6 px-5 py-4">
            <Button type="button" variant="destructive" className="h-11 px-5"
              disabled={acting !== null} onClick={() => setShowDenyModal(true)}>
              Recusar envio
            </Button>
            <Button type="button" className="h-11 px-5"
              disabled={acting !== null} isLoading={acting === "approve"} onClick={() => void handleApprove()}>
              Aprovar envio
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
