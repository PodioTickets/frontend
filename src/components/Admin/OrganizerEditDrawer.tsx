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
import type { AdminAuditOrganization } from "@/services/admin/AdminService";
import { cn } from "@/utils/cn";
import toast from "react-hot-toast";
import { FinanceIcon } from "../Icons/Organizer/FinanceIcon";

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
  ownerName?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  whatsapp?: string;
  phone?: string;
  siteUrl?: string;
  instagram?: string;
  description?: string;
  pixKeys?: Array<{ key: string; keyType: string; isDefault: boolean }>;
  _count?: { events?: number; members?: number };
  members?: Array<{
    id: string;
    role: string;
    user?: {
      id?: string;
      firstName?: string;
      lastName?: string;
      documentNumber?: string;
      cpf?: string;
      document?: string;
      email?: string;
    };
  }>;
}

export interface OrganizerEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  org: AdminAuditOrganization | null;
  onUpdated?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
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

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  type?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 flex-1", className)}>
      <label className="text-base font-normal font-family-dm-sans text-gray-12 leading-[1.3]">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        readOnly={readOnly}
        className={cn(
          "h-12 w-full rounded-lg border border-gray-6 px-3 text-base font-normal font-family-dm-sans leading-[1.3] outline-none transition-colors",
          readOnly
            ? "bg-gray-3 border-gray-4 text-gray-12 cursor-default"
            : "bg-gray-1 text-gray-12 placeholder:text-gray-11 focus:border-gray-8",
        )}
      />
    </div>
  );
}

const PIX_KEY_LABELS: Record<string, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  EMAIL: "E-mail",
  PHONE: "Telefone",
  EVP: "Chave aleatória",
};

function PixKeyCard({
  pixKey,
  onRemove,
}: {
  pixKey: PixKey;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeLabel = PIX_KEY_LABELS[pixKey.keyType] ?? pixKey.keyType;

  return (
    <div className="rounded-lg border border-gray-6">
      <button
        type="button"
        onClick={() => setExpanded((o) => !o)}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <div className="flex flex-col gap-4">
          <p className="font-manrope font-bold text-lg leading-[1.1] text-gray-12">
            {typeLabel}
          </p>
          <div className="flex items-center gap-1 text-base leading-[1.3]">
            <span className="font-normal font-family-dm-sans text-gray-11">Chave pix:</span>
            <span className="font-medium font-family-dm-sans text-gray-12">{pixKey.key}</span>
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
            <FieldInput label="Tipo de Chave" value={typeLabel} readOnly className="min-w-[290px]" />
            <FieldInput label="Chave cadastrada" value={pixKey.key} readOnly className="min-w-[290px]" />
            <FieldInput label="Nome do titular" value={pixKey.accountHolderName ?? ""} readOnly className="min-w-[290px]" />
            <FieldInput label="CPF/CNPJ do titular" value={formatCPFOrCNPJ(pixKey.accountHolderDocument)} readOnly className="min-w-[290px]" />
            <FieldInput label="Banco" value={pixKey.bankName ?? ""} readOnly className="min-w-[290px]" />
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

export function OrganizerEditDrawer({ isOpen, onClose, org, onUpdated }: OrganizerEditDrawerProps) {
  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // form fields
  const [name, setName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [state, setState] = useState("");
  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [phone, setPhone] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [instagram, setInstagram] = useState("");
  const [pixKeys, setPixKeys] = useState<PixKey[]>([]);
  const [ownerDocument, setOwnerDocument] = useState("");
  const [cnpjValue, setCnpjValue] = useState("");

  // pix form
  const [showAddPix, setShowAddPix] = useState(false);
  const emptyPix = { keyType: "", key: "", bankName: "", accountHolderName: "", accountHolderDocument: "" };
  const [newPix, setNewPix] = useState(emptyPix);

  useEffect(() => {
    if (!isOpen || !org) return;
    let cancelled = false;

    setDetail(null);
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

        const ownerMember = Array.isArray(d.members)
          ? d.members.find((m) => m.role === "OWNER")
          : undefined;
        const ownerUser = ownerMember?.user;
        const ownerFullName = ownerUser
          ? [ownerUser.firstName, ownerUser.lastName].filter(Boolean).join(" ")
          : "";
        const ownerDoc = ownerUser?.documentNumber ?? ownerUser?.cpf ?? ownerUser?.document ?? "";

        setCnpjValue(formatCNPJ(d.document ?? org.document ?? ""));
        setName(d.name ?? "");
        setTradeName(d.tradeName ?? "");
        setOwnerName(ownerFullName || (d.ownerName ?? ""));
        setOwnerDocument(formatCPFOrCNPJ(ownerDoc));
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
        const loadedPix: PixKey[] = Array.isArray(d.pixKeys)
          ? d.pixKeys.map((k: any, i: number) => ({ id: `loaded-${i}`, key: k.key, keyType: k.keyType, isDefault: k.isDefault, bankName: k.bankName ?? "", accountHolderName: k.accountHolderName ?? "", accountHolderDocument: k.accountHolderDocument ? formatCPFOrCNPJ(k.accountHolderDocument) : "" }))
          : [];
        setPixKeys(loadedPix);
      } catch {
        if (cancelled) return;
        setName(org.name ?? "");
        setEmail(org.email ?? "");
        setPhone(formatPhone(org.phone));
        setState(org.state ?? "");
        setCity(org.city ?? "");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isOpen, org]);

  const handleAddPix = () => {
    if (!newPix.key.trim()) {
      toast.error("Informe a chave PIX.");
      return;
    }
    setPixKeys((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, key: newPix.key.trim(), keyType: newPix.keyType, isDefault: false, bankName: newPix.bankName.trim(), accountHolderName: newPix.accountHolderName.trim(), accountHolderDocument: newPix.accountHolderDocument },
    ]);
    setNewPix(emptyPix);
    setShowAddPix(false);
  };

  const handleSave = async () => {
    if (!org) return;
    setSaving(true);
    try {
      const api = getApiClient();
      await api.patch(`/api/v1/admin/organizations/${org.id}`, {
        name,
        tradeName,
        document: digits(cnpjValue) || undefined,
        ownerName,
        ownerDocument: digits(ownerDocument) || undefined,
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
        pixKeys: pixKeys.map(({ key, keyType, bankName, accountHolderName, accountHolderDocument }, i) => ({
          key,
          keyType,
          isDefault: i === 0,
          bankName: bankName || undefined,
          accountHolderName: accountHolderName || undefined,
          accountHolderDocument: digits(accountHolderDocument ?? "") || undefined,
        })),
      });
      toast.success("Organização atualizada com sucesso!");
      onUpdated?.();
      onClose();
    } catch {
      toast.error("Não foi possível salvar as alterações.");
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

  const logoUrl = detail?.logoUrl ?? org?.logoUrl ?? null;
  const orgName = name || org?.name || "—";
  const createdAt = detail?.createdAt ?? org?.createdAt;
  const eventCount = detail?._count?.events ?? detail?.eventCount ?? org?.eventCount ?? 0;
  const cnpj = detail?.document ?? org?.document ?? "";
  const isActive = detail?.isActive ?? org?.isActive ?? true;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} direction="right">
      <DrawerContent className="bg-gray-1 h-full w-full sm:max-w-[540px] border-l border-gray-6">
        <DrawerTitle className="sr-only">Editar organizador</DrawerTitle>
        {/* Header */}
        <DrawerHeader className="px-5 py-3 border-b border-gray-6 shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-xl font-semibold font-family-dm-sans text-gray-12 leading-[1.3]">
              Editar organizador
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
                    {cnpj && (
                      <p className="text-base font-normal font-family-dm-sans text-gray-11 leading-[1.3]">
                        CNPJ: {cnpj}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={() => toast("Upload de imagem em breve.")}
                    />
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Plus className="size-4" />
                      Alterar imagem
                    </Button>
                    <Button
                      type="button"
                      variant={"outline"}
                      onClick={() => toast("Imagem removida.")}
                      className="text-gray-12 border border-gray-6"
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
                <div className="flex flex-wrap gap-x-4 gap-y-6">
                  <FieldInput label="CNPJ" value={cnpjValue} onChange={(v) => setCnpjValue(formatCNPJ(v))} placeholder="00.000.000/0000-00" className="min-w-[284px]" />
                  <FieldInput label="Nome fantasia (Razão social)" value={tradeName} onChange={setTradeName} placeholder="Nome fantasia" className="min-w-[284px]" />
                  <FieldInput label="Nome do responsável" value={ownerName} onChange={setOwnerName} placeholder="Nome completo" className="min-w-[284px]" />
                  <FieldInput label="CPF do responsável" value={ownerDocument} onChange={(v) => setOwnerDocument(formatCPFOrCNPJ(v))} placeholder="000.000.000-00" className="min-w-[284px]" />
                </div>
              </div>

              <DrawerDivider />

              {/* Endereço */}
              <div className="flex flex-col gap-6">
                <SectionTitle icon={<MapPin className="size-5" />} label="Endereço" />
                <div className="flex flex-wrap gap-x-4 gap-y-6">
                  <FieldInput label="CEP" value={zipCode} onChange={(v) => setZipCode(withCEPMask(v))} placeholder="00000-000" className="min-w-[264px]" />
                  <FieldInput label="Estado" value={state} onChange={setState} placeholder="Selecione o estado" className="min-w-[183px]" />
                  <FieldInput label="Rua" value={street} onChange={setStreet} placeholder="Digite o nome da sua rua" className="min-w-[340px]" />
                  <FieldInput label="Número" value={streetNumber} onChange={setStreetNumber} placeholder="Ex: 123" className="min-w-[189px] max-w-[189px]" />
                  <FieldInput label="Bairro" value={neighborhood} onChange={setNeighborhood} placeholder="Digite o nome do seu bairro" className="min-w-[183px]" />
                  <FieldInput label="Cidade" value={city} onChange={setCity} placeholder="Nome da cidade" className="min-w-[208px]" />
                </div>
              </div>

              <DrawerDivider />

              {/* Contatos */}
              <div className="flex flex-col gap-6">
                <SectionTitle icon={<Phone className="size-5" />} label="Contatos da organização" />
                <div className="grid grid-cols-2 gap-4">
                  <FieldInput label="E-mail para Atendimento" value={email} onChange={setEmail} placeholder="contato@meuevento.com.br" type="email" className="min-w-[290px]" />
                  <FieldInput label="WhatsApp" value={whatsapp} onChange={(v) => setWhatsapp(withPhoneMask(v))} placeholder="(00) 00000-0000" className="min-w-[290px]" />
                  <FieldInput label="Telefone" value={phone} onChange={(v) => setPhone(withPhoneMask(v))} placeholder="(00) 00000-0000" className="min-w-[290px]" />
                  <FieldInput label="Site Oficial" value={siteUrl} onChange={setSiteUrl} placeholder="https://www.meuevento.com.br" className="min-w-[290px]" />
                  <FieldInput label="Instagram Oficial" value={instagram} onChange={setInstagram} placeholder="@meuevento" className="min-w-[290px]" />
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
                      onClick={() => setShowAddPix(true)}
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
                          onChange={(v) => setNewPix((p) => ({ ...p, keyType: v }))}
                          placeholder="Selecione o tipo"
                          options={[
                            { id: "CPF", label: "CPF" },
                            { id: "CNPJ", label: "CNPJ" },
                            { id: "EMAIL", label: "E-mail" },
                            { id: "PHONE", label: "Telefone" },
                            { id: "EVP", label: "Chave aleatória" },
                          ]}
                        />
                      </div>

                      <FieldInput
                        label="Chave PIX"
                        value={newPix.key}
                        onChange={(v) => setNewPix((p) => ({ ...p, key: v }))}
                        placeholder="Digite a chave PIX"
                        className="min-w-[200px]"
                      />
                      <FieldInput
                        label="Nome do titular"
                        value={newPix.accountHolderName}
                        onChange={(v) => setNewPix((p) => ({ ...p, accountHolderName: v }))}
                        placeholder="Nome completo do titular"
                        className="min-w-[200px]"
                      />
                      <FieldInput
                        label="CPF/CNPJ do titular"
                        value={newPix.accountHolderDocument}
                        onChange={(v) => setNewPix((p) => ({ ...p, accountHolderDocument: formatCPFOrCNPJ(v) }))}
                        placeholder="000.000.000-00"
                        className="min-w-[200px]"
                      />
                      <FieldInput
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
                        onClick={() => { setShowAddPix(false); setNewPix(emptyPix); }}
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

              {/* Metadata */}
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
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-6 bg-gray-2 px-4 py-3 flex items-center justify-end gap-2">
          {isActive ? (
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
          )}
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || deactivating || reactivating}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
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
