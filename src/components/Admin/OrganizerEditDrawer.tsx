"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, XCircle, Building2, MapPin, Phone, ChevronRight, ChevronDown, Trash2, Plus } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/Button";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { getApiClient } from "@/services/base/ApiClient";
import { organizerService } from "@/services";
import { ImageUploadWithCrop, type ImageUploadWithCropRef } from "@/components/ImageUploadWithCrop";
import { EVENT_IMAGE_SPECS } from "@/lib/eventImageSpecs";
import type { AdminAuditOrganization } from "@/services/admin/AdminService";
import { cn } from "@/utils/cn";
import toast from "react-hot-toast";
import { FormField } from "@/components/FormField";
import { FinanceIcon } from "../Icons/Organizer/FinanceIcon";
import { lookupCepDigits } from "@/utils/lookupCep";
import { formatDateBRT } from "@/utils/datetimeBR";
import {
  PIX_KEY_LABELS,
  PIX_KEY_TYPE_OPTIONS,
  maskPixKey,
  pixKeyPlaceholder,
  getPixKeyValidationMessage,
} from "@/utils/pixKey";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PixKey {
  id: string;
  key: string;
  keyType: string;
  isDefault: boolean;
  bankName?: string;
  accountHolderName?: string;
  accountHolderDocument?: string;
}

interface OrgDetail extends AdminAuditOrganization {
  tradeName?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  whatsapp?: string;
  phone?: string;
  siteUrl?: string;
  instagram?: string;
  description?: string;
  ownerName?: string;
  ownerDocument?: string;
  fiscalEmail?: string;
  /** Taxa mensal de antecipação (fração: 0.1 = 10%). */
  anticipationMonthlyRate?: number;
  pixKeys?: Array<{ key: string; keyType: string; isDefault: boolean }>;
  _count?: { events?: number; members?: number };
}

export interface OrganizerEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** `null` quando o modo é "create" — drawer abre com formulário vazio. */
  org: AdminAuditOrganization | null;
  /** "edit" (default) carrega/edita; "create" submete via POST. */
  mode?: "create" | "edit";
  onUpdated?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  // createdAt é INSTANTE real → BRT (America/Sao_Paulo).
  return formatDateBRT(iso);
}

function digits(v: string) { return v.replace(/\D/g, ""); }

function formatCNPJ(v?: string | null): string {
  if (!v) return "";
  const d = digits(v).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function formatCPF(v?: string | null): string {
  if (!v) return "";
  const d = digits(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatCPFOrCNPJ(v?: string | null): string {
  if (!v) return "";
  const d = digits(v);
  return d.length <= 11 ? formatCPF(d) : formatCNPJ(d);
}

function formatPhone(v?: string | null): string {
  if (!v) return "";
  // Strip country code +55 if present for display purposes
  let d = digits(v);
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function formatCEP(v?: string | null): string {
  if (!v) return "";
  const d = digits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

// Applies mask while typing — strips non-digits then re-applies mask
function withPhoneMask(v: string): string { return formatPhone(v); }
function withCEPMask(v: string): string { return formatCEP(v); }

// ─── Sub-components ───────────────────────────────────────────────────────────

function InlineSelect({
  value,
  onChange,
  options,
  placeholder = "Selecione",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const handleOpen = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const selectedLabel = options.find((o) => o.id === value)?.label;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className="h-12 w-full rounded-lg border border-gray-6 bg-gray-1 px-3 flex items-center justify-between gap-2 text-base font-normal font-family-dm-sans cursor-pointer hover:border-gray-8 transition-colors"
      >
        <span className={value ? "text-gray-12" : "text-gray-11"}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown className={cn("size-4 text-gray-11 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && pos && typeof document !== "undefined" && createPortal(
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999, pointerEvents: "auto" }}
          className="bg-gray-1 rounded-lg border border-gray-6 shadow-lg overflow-hidden"
        >
          {options.map((opt, i) => (
            <button
              key={opt.id}
              type="button"
              onMouseDown={() => { onChange(opt.id); setOpen(false); }}
              className={cn(
                "w-full h-12 px-4 flex items-center text-sm font-normal font-family-dm-sans text-gray-12 hover:bg-gray-3 transition-colors",
                i > 0 && "border-t border-gray-6",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

function DrawerDivider() {
  return <div className="w-full h-px bg-gray-6 shrink-0" />;
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="size-5 text-gray-12 shrink-0">{icon}</span>
      <p className="font-manrope font-bold text-lg leading-[1.1] text-gray-12">{label}</p>
    </div>
  );
}

// FieldInput foi extraído para o componente compartilhado `@/components/FormField`
// (usado também pelo wizard de auto-cadastro de organizador).

function PixKeyCard({
  pixKey,
  onRemove,
}: {
  pixKey: PixKey;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeLabel = PIX_KEY_LABELS[pixKey.keyType] ?? pixKey.keyType;
  // Chave de documento é persistida só com dígitos — formata p/ exibição.
  const keyDisplay = maskPixKey(pixKey.keyType, pixKey.key);

  return (
    <div className="rounded-lg border border-gray-6">
      <button
        type="button"
        onClick={() => setExpanded((o) => !o)}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <div className="flex flex-col gap-4">
          <p className="font-manrope font-bold text-lg leading-[1.1] text-gray-12">
            {pixKey.bankName}
          </p>
          <div className="flex items-center gap-1 text-base leading-[1.3]">
            <span className="font-normal font-family-dm-sans text-gray-11">Chave pix ({typeLabel}):</span>
            <span className="font-medium font-family-dm-sans text-gray-12">{keyDisplay}</span>
          </div>
        </div>
        <ChevronRight
          className={cn(
            "size-5 text-gray-11 shrink-0 transition-transform",
            expanded && "rotate-90",
          )}
        />
      </button>

      {expanded && (
        <div className="px-5 pb-5 flex flex-col gap-6">
          <div className="flex flex-wrap gap-x-4 gap-y-6">
            <FormField label="Tipo de Chave" value={typeLabel} readOnly className="min-w-[290px]" />
            <FormField label="Chave cadastrada" value={keyDisplay} readOnly className="min-w-[290px]" />
            <FormField label="Nome do titular" value={pixKey.accountHolderName ?? ""} readOnly className="min-w-[290px]" />
            <FormField label="CPF/CNPJ do titular" value={formatCPFOrCNPJ(pixKey.accountHolderDocument)} readOnly className="min-w-[290px]" />
            <FormField label="Banco" value={pixKey.bankName ?? ""} readOnly className="min-w-[290px]" />
          </div>
          <button
            type="button"
            onClick={() => onRemove(pixKey.id)}
            className="self-end flex items-center gap-2 h-9 px-3 rounded-lg border border-red-6 bg-red-2 text-red-12 text-base font-semibold font-manrope hover:bg-red-3 transition-colors"
          >
            <Trash2 className="size-5" />
            Remover
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Deactivate Modal ─────────────────────────────────────────────────────────

function DeactivateOrgModal({
  isOpen,
  orgName,
  onCancel,
  onConfirm,
  loading,
}: {
  isOpen: boolean;
  orgName: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-[200] flex items-center justify-center bg-black/20 p-4"
          role="dialog"
          aria-modal="true"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-[442px] overflow-hidden rounded-xl bg-gray-1 p-5 shadow-2xl flex flex-col gap-11"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top */}
            <div className="flex flex-col gap-6 items-center">
              <div className="size-[88px] rounded-full flex items-center justify-center bg-gradient-to-b from-red-2 to-red-5 shrink-0">
                <XCircle className="size-[52px] text-red-11 stroke-[1.5]" />
              </div>
              <div className="flex flex-col gap-4 items-center text-center">
                <p className="font-family-dm-sans font-semibold text-xl leading-[1.3] text-gray-12">
                  Desativar organização?
                </p>
                <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11">
                  A organização{" "}
                  <span className="font-bold text-gray-12">&quot;{orgName}&quot;</span>{" "}
                  será desativada. Todos os membros perderão acesso imediatamente
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="flex flex-1 h-12 items-center justify-center rounded-lg border border-gray-6 font-manrope font-bold text-base leading-[1.1] text-gray-12 hover:bg-gray-3 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="flex flex-1 h-12 items-center justify-center rounded-lg bg-red-11 font-manrope font-bold text-base leading-[1.1] text-red-2 hover:bg-red-10 transition-colors disabled:opacity-50"
              >
                {loading ? "Desativando..." : "Desativar"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

export function OrganizerEditDrawer({ isOpen, onClose, org, onUpdated, mode = "edit" }: OrganizerEditDrawerProps) {
  const isCreate = mode === "create";
  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const logoCropRef = useRef<ImageUploadWithCropRef>(null);
  // Logo: corta no modal, faz upload da imagem cortada (URL) e persiste no save
  // (POST/PATCH `logoUrl`).
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // form fields
  const [name, setName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [state, setState] = useState("");
  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [phone, setPhone] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [instagram, setInstagram] = useState("");
  const [pixKeys, setPixKeys] = useState<PixKey[]>([]);
  const [cnpjValue, setCnpjValue] = useState("");
  const [cnpjError, setCnpjError] = useState("");
  // Tipo de pessoa: PJ usa CNPJ + "Razão social"; PF usa CPF + "Nome completo".
  // O backend persiste só o `document` (CPF ou CNPJ); o tipo é inferido pelo tamanho.
  const [personType, setPersonType] = useState<"PF" | "PJ">("PJ");
  // Tipo no momento da carga — pra exigir documento válido SÓ quando há conversão
  // (evita travar edição de orgs legadas sem documento).
  const [initialPersonType, setInitialPersonType] = useState<"PF" | "PJ">("PJ");
  const [ownerName, setOwnerName] = useState("");
  const [ownerDocument, setOwnerDocument] = useState("");
  // Erro de documento no modo PF (conflito de CPF) — vai no campo "CPF do responsável".
  const [ownerDocError, setOwnerDocError] = useState("");
  const [fiscalEmail, setFiscalEmail] = useState("");
  // Taxa MENSAL de antecipação, editada em PERCENT (ex.: "10" = 10%). Convertida
  // para fração (0.10) no payload. Default 10% (schema).
  const [anticipationRatePercent, setAnticipationRatePercent] = useState("10");
  const [loadingCep, setLoadingCep] = useState(false);
  // Guarda o último CEP buscado pra não disparar fetch duplicado em re-renders.
  const lastFetchedCepRef = useRef<string>("");

  // pix form
  const [showAddPix, setShowAddPix] = useState(false);
  const emptyPix = { keyType: "", key: "", bankName: "", accountHolderName: "", accountHolderDocument: "" };
  const [newPix, setNewPix] = useState(emptyPix);
  const [pixKeyError, setPixKeyError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Modo create: reseta tudo e abre formulário vazio sem fetch.
    if (isCreate) {
      setDetail(null);
      setLoading(false);
      setLogoUrl("");
      setPersonType("PJ");
      setInitialPersonType("PJ");
      setCnpjValue("");
      setName("");
      setTradeName("");
      setZipCode("");
      setState("");
      setStreet("");
      setStreetNumber("");
      setNeighborhood("");
      setCity("");
      setEmail("");
      setWhatsapp("");
      setPhone("");
      setSiteUrl("");
      setInstagram("");
      setPixKeys([]);
      setOwnerName("");
      setOwnerDocument("");
      setOwnerDocError("");
      setFiscalEmail("");
      setAnticipationRatePercent("10");
      setShowAddPix(false);
      setNewPix(emptyPix);
      return;
    }

    if (!org) return;
    let cancelled = false;

    setDetail(null);
    setLoadError(false);
    setLoading(true);

    (async () => {
      try {
        const api = getApiClient();
        const res = await api.get<Record<string, unknown>>(
          `/api/v1/admin/organizations/${org.id}`,
        );
        if (cancelled) return;
        const raw = res.data as any;
        const d: OrgDetail = raw?.data?.organization ?? raw?.organization ?? raw?.data ?? raw;
        setDetail(d);

        setLogoUrl(d.logoUrl ?? "");
        const docRaw = d.document ?? org.document ?? "";
        const isPf = digits(docRaw).length === 11;
        setPersonType(isPf ? "PF" : "PJ");
        setInitialPersonType(isPf ? "PF" : "PJ");
        setCnpjValue(isPf ? formatCPF(docRaw) : formatCNPJ(docRaw));
        setName(d.name ?? "");
        setTradeName(d.tradeName ?? "");
        setZipCode(formatCEP(d.zipCode));
        setState(d.state ?? "");
        setStreet(d.street ?? "");
        setStreetNumber(d.number ?? "");
        setNeighborhood(d.neighborhood ?? "");
        setCity(d.city ?? "");
        setEmail(d.email ?? "");
        setWhatsapp(formatPhone(d.whatsapp));
        setPhone(formatPhone(d.phone));
        setSiteUrl(d.siteUrl ?? "");
        setInstagram(d.instagram ?? "");
        setOwnerName(d.ownerName ?? "");
        setOwnerDocument(formatCPF(d.ownerDocument));
        setFiscalEmail(d.fiscalEmail ?? "");
        setAnticipationRatePercent(
          d.anticipationMonthlyRate != null
            ? String(+(d.anticipationMonthlyRate * 100).toFixed(2))
            : "10",
        );
        const loadedPix: PixKey[] = Array.isArray(d.pixKeys)
          ? d.pixKeys.map((k: any, i: number) => ({ id: `loaded-${i}`, key: k.key, keyType: k.keyType, isDefault: k.isDefault, bankName: k.bankName ?? "", accountHolderName: k.accountHolderName ?? "", accountHolderDocument: k.accountHolderDocument ? formatCPFOrCNPJ(k.accountHolderDocument) : "" }))
          : [];
        setPixKeys(loadedPix);
      } catch {
        if (cancelled) return;
        setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, org, isCreate]);

  const handleAddPix = () => {
    if (!newPix.key.trim()) {
      setPixKeyError("Informe a chave PIX.");
      return;
    }
    // Valida CPF/CNPJ da chave (mesma validação do checkout) quando o tipo é documento.
    const keyError = getPixKeyValidationMessage(newPix.keyType, newPix.key);
    if (keyError) {
      setPixKeyError(keyError);
      return;
    }
    // Chave de documento é persistida só com dígitos (formato canônico de PIX).
    const normalizedKey =
      newPix.keyType === "CPF" || newPix.keyType === "CNPJ"
        ? digits(newPix.key)
        : newPix.key.trim();
    setPixKeys((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, key: normalizedKey, keyType: newPix.keyType, isDefault: false, bankName: newPix.bankName.trim(), accountHolderName: newPix.accountHolderName.trim(), accountHolderDocument: newPix.accountHolderDocument },
    ]);
    setNewPix(emptyPix);
    setPixKeyError(null);
    setShowAddPix(false);
  };

  // Recebe a imagem JÁ CORTADA (modal de crop) e faz upload no endpoint genérico
  // (auth por cookie). A persistência no org acontece no save (logoUrl no payload).
  const handleLogoCropped = async (file: File) => {
    setUploadingLogo(true);
    try {
      const url = await organizerService.uploadImage(file);
      setLogoUrl(url);
      toast.success("Imagem carregada. Salve para aplicar.");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar a imagem.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!isCreate && !org) return;
    if (loadError) return; // Bloqueia salvar quando o GET falhou para evitar apagar dados reais

    // PF: o documento e o nome da organização SÃO o CPF/Nome do responsável
    // (mesma pessoa). Não há campos próprios de CPF/Nome completo no form — são
    // derivados aqui (o backend exige `name` e usa `document` como único).
    const isPf = personType === "PF";
    const effectiveName = (isPf ? ownerName : name).trim();
    const effectiveDocument = isPf ? digits(ownerDocument) : digits(cnpjValue);
    // Conversão de tipo (PF↔PJ) exige documento válido do novo tipo — senão o
    // save "dava sucesso" sem mudar de fato (documento ficava com o tamanho errado).
    const typeChanged = !isCreate && personType !== initialPersonType;

    if (isPf) {
      if (!effectiveName) { toast.error("Informe o nome do responsável."); return; }
      if (!effectiveDocument) { setOwnerDocError("Informe o CPF do responsável."); return; }
      if (effectiveDocument.length !== 11) { setOwnerDocError("CPF inválido — deve ter 11 dígitos."); return; }
    } else {
      // PJ: documento, se informado, tem que ser CNPJ (14). Na conversão PF→PJ é obrigatório.
      if (effectiveDocument && effectiveDocument.length !== 14) { setCnpjError("CNPJ inválido — deve ter 14 dígitos."); return; }
      if (typeChanged) {
        if (effectiveDocument.length !== 14) { setCnpjError("Informe um CNPJ válido (14 dígitos)."); return; }
        if (!effectiveName) { toast.error("Informe a razão social."); return; }
      }
    }

    setSaving(true);
    setEmailError("");
    setCnpjError("");
    setOwnerDocError("");
    try {
      const api = getApiClient();
      const payload = {
        name: effectiveName,
        tradeName,
        // String vazia limpa a logo no update; URL aplica a nova.
        logoUrl,
        document: effectiveDocument || undefined,
        zipCode: digits(zipCode),
        state,
        street,
        number: streetNumber,
        neighborhood,
        city,
        email,
        whatsapp: digits(whatsapp) || undefined,
        phone: digits(phone) || undefined,
        siteUrl,
        instagram,
        ownerName: ownerName.trim() || undefined,
        ownerDocument: digits(ownerDocument) || undefined,
        fiscalEmail: fiscalEmail.trim() || undefined,
        // Percent → fração (0.10). Só envia quando válido (0–100%).
        anticipationMonthlyRate: (() => {
          const p = parseFloat(anticipationRatePercent.replace(",", "."));
          return isNaN(p) || p < 0 || p > 100 ? undefined : p / 100;
        })(),
        pixKeys: pixKeys.map(({ key, keyType, bankName, accountHolderName, accountHolderDocument }, i) => ({
          key,
          keyType,
          isDefault: i === 0,
          bankName: bankName || undefined,
          accountHolderName: accountHolderName || undefined,
          accountHolderDocument: digits(accountHolderDocument ?? "") || undefined,
        })),
      };
      if (isCreate) {
        await api.post(`/api/v1/admin/organizations`, payload);
        toast.success("Organização criada com sucesso!");
      } else {
        await api.patch(`/api/v1/admin/organizations/${org!.id}`, payload);
        toast.success("Organização atualizada com sucesso!");
      }
      onUpdated?.();
      onClose();
    } catch (err: any) {
      const rawMsg = err?.response?.data?.message;
      const apiMsg = Array.isArray(rawMsg) ? rawMsg[0] : (typeof rawMsg === "string" ? rawMsg : "");
      // Conflitos de e-mail vindos do backend aparecem como erro de validação
      // no input de e-mail (não como toast). Normaliza pra NFC porque o backend
      // pode entregar "já" como "já" (NFD) — sem isso o regex `j[áa]`
      // falha. Regex genérico `email.*cadastrad` cobre "Esse email já foi
      // cadastrado", "email cadastrado", "e-mail já cadastrado" etc.
      const norm = apiMsg.normalize("NFC").toLowerCase();
      // Código tipado do backend (preferencial — não depende de parsear texto).
      const errorCode = err?.response?.data?.code as string | undefined;
      // Conflito de DOCUMENTO (CPF/CNPJ) ja cadastrado em outra organizacao ->
      // erro no input do documento. Tem PRECEDENCIA sobre o conflito de e-mail porque
      // a frase "Ja existe uma organizacao cadastrada com este documento..."
      // tambem casaria com o regex amplo de organizacao abaixo.
      const isDocumentConflict =
        errorCode === "DUPLICATE_DOCUMENT" ||
        /document|cnpj/.test(norm) ||
        (err?.response?.status === 409 && /cpf|cnpj|documento/.test(norm));
      // Cobertura ampla — inclui fallback por status 409 com "email" no texto,
      // pra capturar frases novas do backend que ainda não mapeamos.
      const isEmailConflict =
        /e-?mail.*cadastrad/.test(norm) ||
        /cadastrad.*e-?mail/.test(norm) ||
        /e-?mail.*j(?:á|á)\s+(foi\s+)?cadastrad/.test(norm) ||
        /j(?:á|á)\s+est(?:á|á).*organiza/.test(norm) ||
        /j(?:á|á)\s+existe.*organiza/.test(norm) ||
        /e-?mail.*already\s+exists/.test(norm) ||
        (err?.response?.status === 409 && /e-?mail|usu(?:á|á)rio/.test(norm));
      if (isDocumentConflict) {
        // PF não tem campo de CNPJ — o documento é o CPF do responsável.
        if (personType === "PF") setOwnerDocError(apiMsg);
        else setCnpjError(apiMsg);
      } else if (isEmailConflict) {
        setEmailError(apiMsg);
      } else {
        const fallback = isCreate
          ? "Não foi possível criar a organização."
          : "Não foi possível salvar as alterações.";
        toast.error(apiMsg || fallback);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!org) return;
    setDeactivating(true);
    try {
      const api = getApiClient();
      await api.patch(`/api/v1/admin/organizations/${org.id}`, { isActive: false });
      toast.success("Organização desativada.");
      setShowDeactivateModal(false);
      onUpdated?.();
      onClose();
    } catch {
      toast.error("Não foi possível desativar a organização.");
    } finally {
      setDeactivating(false);
    }
  };

  const handleReactivate = async () => {
    if (!org) return;
    setReactivating(true);
    try {
      const api = getApiClient();
      await api.patch(`/api/v1/admin/organizations/${org.id}`, { isActive: true });
      toast.success("Organização reativada.");
      onUpdated?.();
      onClose();
    } catch {
      toast.error("Não foi possível reativar a organização.");
    } finally {
      setReactivating(false);
    }
  };

  const handleRemovePixKey = (id: string) => {
    setPixKeys((prev) => prev.filter((k) => k.id !== id));
  };

  // Alterna PF/PJ. CPF e CNPJ são documentos DIFERENTES — não dá pra reaproveitar
  // os dígitos entre os tipos (senão o CNPJ herdava o CPF de 11 díg. e salvava um
  // documento inválido). Limpa o campo de documento (PJ digita o CNPJ; PF usa o
  // CPF do responsável) e os erros pendentes.
  const handlePersonTypeChange = (next: "PF" | "PJ") => {
    if (next === personType) return;
    setPersonType(next);
    setCnpjValue("");
    if (cnpjError) setCnpjError("");
    if (ownerDocError) setOwnerDocError("");
  };

  const orgName = isCreate ? (name || "Nova organização") : (name || org?.name || "—");
  const createdAt = detail?.createdAt ?? org?.createdAt;
  const eventCount = detail?._count?.events ?? detail?.eventCount ?? org?.eventCount ?? 0;
  const headerDocDigits = digits(detail?.document ?? org?.document ?? "");
  const headerDocLabel = headerDocDigits.length === 11 ? "CPF" : "CNPJ";
  const headerDocFormatted = formatCPFOrCNPJ(headerDocDigits);
  const isActive = detail?.isActive ?? org?.isActive ?? true;
  const drawerTitle = isCreate ? "Criar organizador" : "Editar organizador";

  return (
    <Drawer open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} direction="right">
      <DrawerContent className="bg-gray-1 h-full w-full sm:max-w-[540px] border-l border-gray-6">
        <DrawerTitle className="sr-only">{drawerTitle}</DrawerTitle>
        {/* Header */}
        <DrawerHeader className="px-5 py-3 border-b border-gray-6 shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-xl font-semibold font-family-dm-sans text-gray-12 leading-[1.3]">
              {drawerTitle}
            </p>
            <DrawerClose asChild>
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-lg text-gray-11 hover:bg-gray-3 hover:text-gray-12 transition-colors"
              >
                <X className="size-5" />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="size-8 rounded-full border-2 border-gray-6 border-t-primary-11 animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-8 px-5 pt-5 pb-14">
              {/* Logo + name */}
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <div className="relative size-[60px] shrink-0 overflow-hidden rounded-full bg-gray-4">
                    <ImageWithInitialFallback
                      src={logoUrl}
                      alt={orgName}
                      name={orgName}
                      fill
                      sizes="60px"
                      className="size-full rounded-full"
                      imgClassName="object-cover rounded-full"
                      letterClassName="text-xl font-bold text-gray-11"
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <p className="font-manrope font-bold text-xl leading-[1.1] text-gray-12">{orgName}</p>
                    {headerDocFormatted && (
                      <p className="text-base font-normal font-family-dm-sans text-gray-11 leading-[1.3]">
                        {headerDocLabel}: {headerDocFormatted}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <ImageUploadWithCrop
                      ref={logoCropRef}
                      spec={EVENT_IMAGE_SPECS.organizationLogo}
                      outputBaseName="organization-logo"
                      cropShape="round"
                      maxFileSizeMb={10}
                      accept="image/jpeg,image/jpg,image/png"
                      modalTitle="Ajustar logo da organização"
                      onCropped={(file) => void handleLogoCropped(file)}
                      onInvalidFile={(msg) => toast.error(msg)}
                      onCropFailed={(msg) => toast.error(msg)}
                    />
                    <Button
                      type="button"
                      onClick={() => logoCropRef.current?.open()}
                      disabled={uploadingLogo}
                    >
                      <Plus className="size-4" />
                      {uploadingLogo ? "Enviando..." : "Alterar imagem"}
                    </Button>
                    <Button
                      type="button"
                      variant={"outline"}
                      onClick={() => setLogoUrl("")}
                      disabled={uploadingLogo || !logoUrl}
                      className="text-gray-12 border border-gray-6 disabled:opacity-50"
                    >
                      Remover imagem
                    </Button>
                  </div>
                  <p className="text-sm font-normal font-family-dm-sans text-gray-11 leading-[1.3]">
                    Suportamos imagens em PNGs, JPEGs até 10MB
                  </p>
                </div>
              </div>

              <DrawerDivider />

              {/* Detalhes da organização */}
              <div className="flex flex-col gap-6">
                <SectionTitle icon={<Building2 className="size-5" />} label="Detalhes da organização" />

                {/* Tipo de pessoa — alterna os campos de documento/nome abaixo. */}
                <div className="flex flex-col gap-2">
                  <label className="text-base font-normal font-family-dm-sans text-gray-12 leading-[1.3]">
                    Tipo de pessoa
                  </label>
                  <div className="flex w-full max-w-[360px] gap-1 rounded-lg border border-gray-6 bg-gray-2 p-1">
                    {([
                      { id: "PJ", label: "Pessoa jurídica" },
                      { id: "PF", label: "Pessoa física" },
                    ] as const).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handlePersonTypeChange(t.id)}
                        className={cn(
                          "h-10 flex-1 rounded-md text-sm font-medium font-family-dm-sans transition-colors",
                          personType === t.id
                            ? "bg-gray-1 text-gray-12 shadow-sm"
                            : "text-gray-11 hover:text-gray-12",
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-6">
                  {/* CNPJ + Razão social só pra PJ. Pra PF, o documento e o nome
                      são o CPF/Nome do responsável (mesma pessoa) — duplicados
                      internamente no `document`/`name` ao salvar. */}
                  {personType === "PJ" && (
                    <>
                      <FormField
                        label="CNPJ"
                        value={cnpjValue}
                        onChange={(v) => {
                          setCnpjValue(formatCNPJ(v));
                          if (cnpjError) setCnpjError("");
                        }}
                        placeholder="00.000.000/0000-00"
                        className="min-w-[284px]"
                        error={cnpjError}
                      />
                      <FormField
                        label="Razão social"
                        value={name}
                        onChange={setName}
                        placeholder="Razão social"
                        className="min-w-[284px]"
                      />
                    </>
                  )}
                  <FormField label="Nome fantasia" value={tradeName} onChange={setTradeName} placeholder="Nome fantasia" className="min-w-[284px]" />
                  <FormField label="Nome do responsável" value={ownerName} onChange={(v) => { setOwnerName(v); if (ownerDocError) setOwnerDocError(""); }} placeholder="Nome completo" className="min-w-[284px]" />
                  <FormField
                    label="CPF do responsável"
                    value={ownerDocument}
                    onChange={(v) => { setOwnerDocument(formatCPF(v)); if (ownerDocError) setOwnerDocError(""); }}
                    placeholder="000.000.000-00"
                    className="min-w-[284px]"
                    error={personType === "PF" ? ownerDocError : undefined}
                  />
                  <FormField label="E-mail fiscal" value={fiscalEmail} onChange={setFiscalEmail} placeholder="fiscal@org.com" type="email" className="min-w-[284px]" />
                  <FormField
                    label="Taxa de antecipação (% ao mês)"
                    value={anticipationRatePercent}
                    onChange={(v) => setAnticipationRatePercent(v.replace(/[^\d.,]/g, ""))}
                    placeholder="10"
                    inputMode="decimal"
                    className="min-w-[284px]"
                  />
                </div>
              </div>

              <DrawerDivider />

              {/* Endereço */}
              <div className="flex flex-col gap-6">
                <SectionTitle icon={<MapPin className="size-5" />} label="Endereço" />
                <div className="flex flex-wrap gap-x-4 gap-y-6">
                  <FormField
                    label="CEP"
                    value={zipCode}
                    onChange={(v) => {
                      const masked = withCEPMask(v);
                      setZipCode(masked);
                      const cepDigits = digits(masked);
                      // Auto-fetch quando completa 8 dígitos. Guarda o último CEP buscado
                      // (lastFetchedCepRef) pra evitar refetch ao re-digitar o mesmo valor.
                      if (cepDigits.length === 8 && cepDigits !== lastFetchedCepRef.current) {
                        lastFetchedCepRef.current = cepDigits;
                        void (async () => {
                          setLoadingCep(true);
                          try {
                            const result = await lookupCepDigits(cepDigits);
                            if (!result.ok) {
                              toast.error(result.message);
                              return;
                            }
                            const { data } = result;
                            setState(data.uf || "");
                            setStreet(data.logradouro || "");
                            setNeighborhood(data.bairro || "");
                            setCity(data.localidade || "");
                            toast.success("Endereço encontrado!");
                          } finally {
                            setLoadingCep(false);
                          }
                        })();
                      } else if (cepDigits.length < 8) {
                        lastFetchedCepRef.current = "";
                      }
                    }}
                    placeholder={loadingCep ? "Buscando endereço..." : "00000-000"}
                    className="min-w-[264px]"
                  />
                  <FormField label="Estado" value={state} onChange={setState} placeholder="Selecione o estado" className="min-w-[183px]" />
                  <FormField label="Rua" value={street} onChange={setStreet} placeholder="Digite o nome da sua rua" className="min-w-[340px]" />
                  <FormField label="Número" value={streetNumber} onChange={setStreetNumber} placeholder="Ex: 123" className="min-w-[189px] max-w-[189px]" />
                  <FormField label="Bairro" value={neighborhood} onChange={setNeighborhood} placeholder="Digite o nome do seu bairro" className="min-w-[183px]" />
                  <FormField label="Cidade" value={city} onChange={setCity} placeholder="Nome da cidade" className="min-w-[208px]" />
                </div>
              </div>

              <DrawerDivider />

              {/* Contatos */}
              <div className="flex flex-col gap-6">
                <SectionTitle icon={<Phone className="size-5" />} label="Contatos da organização" />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    label="E-mail"
                    value={email}
                    onChange={(v) => {
                      setEmail(v);
                      if (emailError) setEmailError("");
                    }}
                    placeholder="contato@meuevento.com.br"
                    type="email"
                    className="min-w-[290px]"
                    error={emailError}
                  />
                  <FormField label="WhatsApp" value={whatsapp} onChange={(v) => setWhatsapp(withPhoneMask(v))} placeholder="(00) 00000-0000" className="min-w-[290px]" />
                  <FormField label="Telefone" value={phone} onChange={(v) => setPhone(withPhoneMask(v))} placeholder="(00) 00000-0000" className="min-w-[290px]" />
                </div>
              </div>

              <DrawerDivider />

              {/* Chave PIX */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <SectionTitle icon={<FinanceIcon className="size-5" />} label="Chave PIX" />
                  {!showAddPix && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setShowAddPix(true); setPixKeyError(null); }}
                      className="flex items-center gap-1.5 text-gray-12 border border-gray-6"
                    >
                      <Plus className="size-4" />
                      Adicionar chave PIX
                    </Button>
                  )}
                </div>

                {pixKeys.length === 0 && !showAddPix && (
                  <p className="text-sm font-normal font-family-dm-sans text-gray-11">
                    Nenhuma chave PIX cadastrada.
                  </p>
                )}

                {pixKeys.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {pixKeys.map((k) => (
                      <PixKeyCard key={k.id} pixKey={k} onRemove={handleRemovePixKey} />
                    ))}
                  </div>
                )}

                {/* Formulário de nova chave PIX */}
                {showAddPix && (
                  <div className="rounded-lg border border-gray-6 p-4 flex flex-col gap-4">
                    <p className="font-manrope font-bold text-base text-gray-12">Nova chave PIX</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-4">
                      {/* Tipo de chave */}
                      <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
                        <label className="text-base font-normal font-family-dm-sans text-gray-12 leading-[1.3]">
                          Tipo de chave
                        </label>
                        <InlineSelect
                          value={newPix.keyType}
                          onChange={(v) => {
                            // Reformata a chave já digitada conforme o novo tipo e limpa o erro.
                            setNewPix((p) => ({ ...p, keyType: v, key: maskPixKey(v, p.key) }));
                            setPixKeyError(null);
                          }}
                          placeholder="Selecione o tipo"
                          options={PIX_KEY_TYPE_OPTIONS}
                        />
                      </div>

                      <FormField
                        label="Chave PIX"
                        value={newPix.key}
                        onChange={(v) => {
                          setNewPix((p) => ({ ...p, key: maskPixKey(p.keyType, v) }));
                          if (pixKeyError) setPixKeyError(null);
                        }}
                        placeholder={pixKeyPlaceholder(newPix.keyType)}
                        error={pixKeyError ?? undefined}
                        className="min-w-[200px]"
                      />
                      <FormField
                        label="Nome do titular"
                        value={newPix.accountHolderName}
                        onChange={(v) => setNewPix((p) => ({ ...p, accountHolderName: v }))}
                        placeholder="Nome completo do titular"
                        className="min-w-[200px]"
                      />
                      <FormField
                        label="CPF/CNPJ do titular"
                        value={newPix.accountHolderDocument}
                        onChange={(v) => setNewPix((p) => ({ ...p, accountHolderDocument: formatCPFOrCNPJ(v) }))}
                        placeholder="000.000.000-00"
                        className="min-w-[200px]"
                      />
                      <FormField
                        label="Banco"
                        value={newPix.bankName}
                        onChange={(v) => setNewPix((p) => ({ ...p, bankName: v }))}
                        placeholder="Nome do banco"
                        className="min-w-[200px]"
                      />
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => { setShowAddPix(false); setNewPix(emptyPix); setPixKeyError(null); }}
                        className="h-9 px-4 text-gray-12 border border-gray-6"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleAddPix}
                        className="h-9 px-4"
                      >
                        Adicionar
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <DrawerDivider />

              {/* Metadata — não faz sentido em create */}
              {!isCreate && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="font-manrope font-semibold text-base text-gray-11 leading-[1.1]">Cadastro em</span>
                    <span className="font-manrope font-semibold text-base text-gray-12 leading-[1.1]">{formatDate(createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-manrope font-semibold text-base text-gray-11 leading-[1.1]">Eventos criados</span>
                    <span className="font-manrope font-semibold text-base text-gray-12 leading-[1.1]">{eventCount}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-6 bg-gray-2 px-4 py-3 flex items-center justify-end gap-2">
          {!isCreate && (isActive ? (
            <Button
              type="button"
              onClick={() => setShowDeactivateModal(true)}
              disabled={deactivating || saving || reactivating}
              variant={"destructive"}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deactivating ? "Desativando..." : "Desativar organização"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void handleReactivate()}
              disabled={reactivating || saving || deactivating}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reactivating ? "Reativando..." : "Reativar organização"}
            </Button>
          ))}
          {loadError && (
            <span className="text-sm text-red-11 mr-auto">
              Erro ao carregar dados. Feche e tente novamente.
            </span>
          )}
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || deactivating || reactivating || loadError}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? (isCreate ? "Criando..." : "Salvando...")
              : (isCreate ? "Criar organização" : "Salvar alterações")}
          </Button>
        </div>
        <DeactivateOrgModal
          isOpen={showDeactivateModal}
          orgName={orgName}
          onCancel={() => setShowDeactivateModal(false)}
          onConfirm={() => void handleDeactivate()}
          loading={deactivating}
        />
      </DrawerContent>
    </Drawer>
  );
}
