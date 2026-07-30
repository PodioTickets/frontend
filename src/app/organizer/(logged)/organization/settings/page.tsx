"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useAuth } from "@/hooks/useAuth";
import { organizerService } from "@/services";
import { Button } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { Dropdown, DropdownOption } from "@/components/Dropdown";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import toast from "react-hot-toast";
import { getAvatarUrl } from "@/utils/avatar";
import { Briefcase, MapPin, Phone, XCircle } from "lucide-react";
import type {
  Organization,
  PixKey,
} from "@/services/organizer/OrganizerService";
import { ChatIcon } from "@/components/Icons/ChatIcon";
import { PixIcon } from "@/components/Icons/PixIcon";
import { ArrowButton } from "@/components/ArrowButton";
import { Loading } from "@/components/Loading";
import {
  ImageUploadWithCrop,
  type ImageUploadWithCropRef,
} from "@/components/ImageUploadWithCrop";
import { EVENT_IMAGE_SPECS } from "@/lib/eventImageSpecs";
import { usePendingImageUpload } from "@/hooks/usePendingImageUpload";
import { isCurrentUserOrganizationOwner } from "@/utils/organizationOwner";
import { TrashIcon } from "@/components/Icons/TrashIcon";

const BRAZIL_STATES = [
  { id: "AC", label: "Acre" },
  { id: "AL", label: "Alagoas" },
  { id: "AP", label: "Amapá" },
  { id: "AM", label: "Amazonas" },
  { id: "BA", label: "Bahia" },
  { id: "CE", label: "Ceará" },
  { id: "DF", label: "Distrito Federal" },
  { id: "ES", label: "Espírito Santo" },
  { id: "GO", label: "Goiás" },
  { id: "MA", label: "Maranhão" },
  { id: "MT", label: "Mato Grosso" },
  { id: "MS", label: "Mato Grosso do Sul" },
  { id: "MG", label: "Minas Gerais" },
  { id: "PA", label: "Pará" },
  { id: "PB", label: "Paraíba" },
  { id: "PR", label: "Paraná" },
  { id: "PE", label: "Pernambuco" },
  { id: "PI", label: "Piauí" },
  { id: "RJ", label: "Rio de Janeiro" },
  { id: "RN", label: "Rio Grande do Norte" },
  { id: "RS", label: "Rio Grande do Sul" },
  { id: "RO", label: "Rondônia" },
  { id: "RR", label: "Roraima" },
  { id: "SC", label: "Santa Catarina" },
  { id: "SP", label: "São Paulo" },
  { id: "SE", label: "Sergipe" },
  { id: "TO", label: "Tocantins" },
];

/** Abas da tela (Figma): navegação por estado local, uma seção por vez. */
type SettingsTab = "detalhes" | "endereco" | "contato" | "pix";

const TABS: {
  id: SettingsTab;
  label: string;
  Icon: (props: { className?: string }) => React.ReactNode;
}[] = [
    { id: "detalhes", label: "Detalhes", Icon: Briefcase },
    { id: "endereco", label: "Endereço", Icon: MapPin },
    { id: "contato", label: "Contato", Icon: Phone },
    // Nas Configurações o Pix segue a cor da aba (gray-11 inativa / verde ativa),
    // por isso `color="currentColor"` — diferente do brand teal usado nos demais lugares.
    {
      id: "pix",
      label: "Chave pix",
      Icon: (props) => <PixIcon {...props} color="currentColor" />,
    },
  ];

export default function OrganizationSettingsPage() {
  const orgNav = useOrganizerNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [organizer, setOrganizer] = useState<Organization | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>("detalhes");
  const logoCropRef = useRef<ImageUploadWithCropRef>(null);
  // Logo em STAGING: o corte só fica em memória (preview local); a persistência
  // acontece no "Salvar alteração". Evita manter a foto nova quando o usuário
  // não salva. [[usePendingImageUpload]]
  const pendingLogo = usePendingImageUpload(getAvatarUrl);

  const [formData, setFormData] = useState({
    // Detalhes da organização
    document: "",
    tradeName: "",
    ownerName: "",
    ownerDocument: "",
    // Endereço
    zipCode: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    // Contatos
    email: "",
    whatsapp: "",
    phone: "",
    siteUrl: "",
    instagram: "",
  });

  const [pixKeys, setPixKeys] = useState<PixKey[]>([]);
  const [openPixId, setOpenPixId] = useState<string | null>(null);
  const [removingPixId, setRemovingPixId] = useState<string | null>(null);

  const loadOrganization = useCallback(async () => {
    const uid = user?.id;
    if (!uid) return;
    try {
      setLoading(true);
      const { organization: org } = await organizerService.getOrganization();

      if (!isCurrentUserOrganizationOwner(org, uid)) {
        orgNav.replace("/organizer/events");
        return;
      }

      setOrganizer(org);
      setPixKeys(org.pixKeys ?? []);
      setFormData({
        document: org.document || "",
        tradeName: org.tradeName || "",
        ownerName: org.ownerName || "",
        ownerDocument: org.ownerDocument || "",
        zipCode: org.zipCode || "",
        street: org.street || "",
        number: org.number || "",
        neighborhood: org.neighborhood || "",
        city: org.city || "",
        state: org.state || "",
        // E-mail de CONTATO (org.email).
        email: org.email || "",
        whatsapp: org.whatsapp || "",
        phone: org.phone || "",
        siteUrl: org.siteUrl || "",
        instagram: org.instagram || "",
      });
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: unknown } };
      console.error("Error loading organization:", error);
      console.error("Error response:", err.response?.data);
      if (err.response?.status === 404) {
        orgNav.push("/organizer/create");
        return;
      }
      toast.error("Erro ao carregar dados da organização");
    } finally {
      setLoading(false);
    }
  }, [user?.id, orgNav]);

  useEffect(() => {
    if (authLoading || !user?.id) return;
    void loadOrganization();
  }, [authLoading, user?.id, loadOrganization]);

  const setField = useCallback((name: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Máscaras progressivas (aplicam durante a digitação)
  const maskCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6)
      return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9)
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const maskCPForCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) return maskCPF(value);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5)
      return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    if (numbers.length <= 8)
      return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    if (numbers.length <= 12)
      return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
  };

  const maskCEP = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const maskPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
    }
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const maskWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // Preparar dados removendo formatação de documentos e telefones
      const updateData: Record<string, string | undefined> = {
        name: organizer?.name || "", // Manter o nome original se não foi alterado
        tradeName: formData.tradeName || undefined,
        document: formData.document.replace(/\D/g, "") || undefined,
        email: formData.email || undefined,
        phone: formData.phone.replace(/\D/g, "") || undefined,
        whatsapp: formData.whatsapp.replace(/\D/g, "") || undefined,
        siteUrl: formData.siteUrl || undefined,
        instagram: formData.instagram || undefined,
        zipCode: formData.zipCode.replace(/\D/g, "") || undefined,
        street: formData.street || undefined,
        number: formData.number || undefined,
        neighborhood: formData.neighborhood || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        ownerName: formData.ownerName || undefined,
      };

      // Remover campos undefined/vazios para não enviar
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined || updateData[key] === "") {
          delete updateData[key];
        }
      });

      let finalOrg = await organizerService.updateOrganization(updateData);

      // Persiste a logo em staging SÓ agora (no salvar). Novo arquivo → faz o
      // upload p/ obter a URL e aplica; remoção → aplica string vazia. A resposta
      // já traz o `organizer` atualizado (com/sem logo).
      if (pendingLogo.file) {
        setUploadingImage(true);
        const imageUrl = await organizerService.uploadImage(pendingLogo.file);
        finalOrg = await organizerService.updateOrganizationLogo(imageUrl);
      } else if (pendingLogo.removed) {
        finalOrg = await organizerService.updateOrganizationLogo("");
      }

      toast.success("Configurações atualizadas com sucesso!");
      // Usa a resposta do PATCH (estado já persistido) em vez de RE-BUSCAR — evita
      // flash do <Loading/> e leitura defasada da réplica. O formData já reflete o
      // que o usuário editou; só sincronizamos o `organizer`.
      setOrganizer(finalOrg);
      pendingLogo.reset();
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      console.error("Error updating organization:", error);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Erro ao atualizar configurações";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  const handleRequestChange = () => {
    toast("Funcionalidade em desenvolvimento", { icon: "ℹ️" });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!organizer) {
    return null;
  }

  const stateOptions: DropdownOption[] = BRAZIL_STATES.map((state) => ({
    id: state.id,
    label: state.label,
  }));
  const selectedState = BRAZIL_STATES.find((s) => s.id === formData.state);

  // Botão "Salvar alteração" (rodapé das abas de formulário — não na aba PIX).
  const saveButton = (
    <div className="flex justify-end w-full pt-4">
      <Button
        onClick={handleSubmit}
        isLoading={saving || uploadingImage}
        className="w-full sm:w-auto h-12 px-6 font-manrope font-bold text-base"
      >
        Salvar alteração
      </Button>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-gray-2 flex flex-col">
        {/* Header: título + faixa de abas (Figma). Divisor inferior full-width. */}
        <div className="bg-gray-1 border-b border-gray-6">
          <div className="px-0 md:px-8 pt-5 md:pt-7 flex flex-col gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                href="/organizer/events"
                className="md:hidden size-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-gray-3 transition-colors rotate-180"
                aria-label="Voltar"
              >
                <ArrowButton isOpen={false} />
              </Link>
              <p className="font-manrope font-extrabold text-gray-12 text-base md:text-[20px] truncate">
                Configurações da organização
              </p>
            </div>

            {/* Faixa de abas: rolagem horizontal no mobile; ativo = verde + underline */}
            <div className="w-full min-w-0 overflow-x-auto overflow-y-hidden -mb-px [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max items-center">
                {TABS.map(({ id, label, Icon }) => {
                  const active = activeTab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveTab(id)}
                      className={`shrink-0 flex items-center gap-1 border-b-2 px-5 py-3 text-base whitespace-nowrap transition-colors ${active
                        ? "border-primary-11 font-family-dm-sans text-primary-11"
                        : "border-transparent font-family-dm-sans font-normal text-gray-11 hover:text-gray-12"
                        }`}
                    >
                      <Icon className="size-5 shrink-0 text-gray-11" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo da aba ativa */}
        <div className="flex-1 px-4 md:px-8 pt-6 md:pt-8 pb-16">
          <div className="max-w-7xl">
            {/* ── Detalhes ─────────────────────────────────────────────── */}
            {activeTab === "detalhes" && (
              <div className="flex flex-col gap-8 md:gap-11">
                {/* Avatar + nome + "Editar" (abre o modal de recorte da logo) */}
                <div className="flex flex-col gap-1.5 items-center self-start">
                  <div className="flex gap-3 items-center">
                    <div className="relative shrink-0 size-14 flex flex-col justify-center">
                      <ImageWithInitialFallback
                        src={pendingLogo.resolveSrc(organizer.logoUrl)}
                        alt={organizer.name || "Organização"}
                        name={organizer.name || "Organização"}
                        fallbackId={organizer.id}
                        fill
                        sizes="56px"
                        className="min-h-14 size-full rounded-full"
                        imgClassName="object-cover"
                        letterClassName="text-xl font-medium text-gray-11"
                      />
                      <button
                        type="button"
                        onClick={() => logoCropRef.current?.open()}
                        disabled={uploadingImage || saving}
                        className="font-manrope font-bold text-xs text-primary-11 hover:text-primary-10 transition-colors disabled:opacity-50"
                      >
                        Editar
                      </button>
                    </div>
                    <p className="font-manrope font-bold leading-[1.1] text-lg text-gray-12 truncate">
                      {organizer.tradeName || "Nome da organização"}
                    </p>
                  </div>

                </div>

                <div className="flex flex-col gap-8 w-full">
                  <div className="flex flex-col gap-3">
                    <p className="font-manrope font-bold leading-[1.1] text-xl text-gray-12">
                      Detalhes da organização
                    </p>
                    <p className="font-family-dm-sans font-normal leading-[1.3] text-base text-gray-11">
                      Preencha as informações da sua organização para
                      identificação.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6 w-full">
                    {/* CPF do responsável — read-only (dado gerido pelo admin). */}
                    <FormField
                      label="CPF do responsável"
                      value={maskCPF(organizer.ownerDocument ?? "")}
                      placeholder="000.000.000-00"
                      readOnly
                    />
                    {/* Nome fantasia — único editável nesta seção. */}
                    <FormField
                      label="Nome fantasia"
                      value={formData.tradeName}
                      onChange={(v) => setField("tradeName", v)}
                      placeholder="Digite o nome fantasia"
                    />
                    {/* Razão social — read-only. */}
                    <FormField
                      label="Razão social"
                      value={organizer.name ?? ""}
                      placeholder="Razão social"
                      readOnly
                    />
                    {/* Nome do responsável — read-only. */}
                    <FormField
                      label="Nome do responsável"
                      value={organizer.ownerName ?? ""}
                      placeholder="Nome do responsável"
                      readOnly
                    />
                  </div>
                </div>

                {saveButton}
              </div>
            )}

            {/* ── Endereço ─────────────────────────────────────────────── */}
            {activeTab === "endereco" && (
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-3">
                  <p className="font-manrope font-bold leading-[1.1] text-xl text-gray-12">
                    Endereço
                  </p>
                  <p className="font-family-dm-sans font-normal leading-[1.3] text-base text-gray-11">
                    Endereço utilizado para identificação da organização.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6 w-full">
                  <FormField
                    label="CEP"
                    value={maskCEP(formData.zipCode)}
                    onChange={(v) =>
                      setField("zipCode", v.replace(/\D/g, "").slice(0, 8))
                    }
                    placeholder="00000-000"
                    inputMode="numeric"
                  />
                  <FormField
                    label="Rua"
                    value={formData.street}
                    onChange={(v) => setField("street", v)}
                    placeholder="Digite o nome da sua rua"
                  />
                  <FormField
                    label="Número"
                    value={formData.number}
                    onChange={(v) => setField("number", v)}
                    placeholder="Ex: 123"
                  />
                  <FormField
                    label="Bairro"
                    value={formData.neighborhood}
                    onChange={(v) => setField("neighborhood", v)}
                    placeholder="Digite o nome do seu bairro"
                  />
                  <FormField
                    label="Cidade"
                    value={formData.city}
                    onChange={(v) => setField("city", v)}
                    placeholder="Nome da cidade"
                  />

                  {/* Estado — select com aparência de campo (h-12, igual FormField). */}
                  <div className="flex flex-1 min-w-0 flex-col gap-2">
                    <label className="flex min-h-6 items-center gap-1.5 font-normal font-family-dm-sans text-gray-12 leading-[1.3] text-base">
                      Estado
                    </label>
                    <Dropdown
                      options={stateOptions}
                      width="w-full"
                      maxHeight="max-h-[280px]"
                      trigger={(isOpen) => (
                        <div className="border border-gray-6 rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors bg-gray-1">
                          <span
                            className={`text-base flex-1 text-left font-family-dm-sans ${formData.state ? "text-gray-12" : "text-gray-11"
                              }`}
                          >
                            {selectedState?.label || "Selecione o estado"}
                          </span>
                          <ArrowButton isOpen={isOpen} />
                        </div>
                      )}
                      onSelect={(option) =>
                        setField("state", option.id || "")
                      }
                    />
                  </div>
                </div>

                {saveButton}
              </div>
            )}

            {/* ── Contato ──────────────────────────────────────────────── */}
            {activeTab === "contato" && (
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-3">
                  <p className="font-manrope font-bold leading-[1.1] text-xl text-gray-12">
                    Contatos da organização
                  </p>
                  <p className="font-family-dm-sans font-normal leading-[1.3] text-base text-gray-11">
                    Informe os contatos da organização para comunicação e
                    suporte.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6 w-full">
                  <FormField
                    label="E-mail para Atendimento"
                    type="email"
                    inputMode="email"
                    value={formData.email}
                    onChange={(v) => setField("email", v)}
                    placeholder="contato@meuevento.com.br"
                  />
                  <FormField
                    label="WhatsApp"
                    value={maskWhatsApp(formData.whatsapp)}
                    onChange={(v) =>
                      setField("whatsapp", v.replace(/\D/g, "").slice(0, 11))
                    }
                    placeholder="(00) 00000-0000"
                    inputMode="tel"
                  />
                  <FormField
                    label="Telefone"
                    value={maskPhone(formData.phone)}
                    onChange={(v) =>
                      setField("phone", v.replace(/\D/g, "").slice(0, 11))
                    }
                    placeholder="(00) 0000-0000"
                    inputMode="tel"
                  />
                  <FormField
                    label="Site Oficial"
                    value={formData.siteUrl}
                    onChange={(v) => setField("siteUrl", v)}
                    placeholder="https://www.meuevento.com.br"
                    inputMode="url"
                  />
                  <FormField
                    label="Instagram Oficial"
                    value={formData.instagram}
                    onChange={(v) => setField("instagram", v)}
                    placeholder="@meuevento"
                  />
                </div>

                {saveButton}
              </div>
            )}

            {/* ── Chave PIX ────────────────────────────────────────────── */}
            {activeTab === "pix" && (
              <div className="flex flex-col gap-8">
                {/* Título + subtítulo à esquerda; "Adicionar chave" à direita */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <p className="font-manrope font-bold leading-[1.1] text-xl text-gray-12">
                      Chave PIX
                    </p>
                    <p className="font-family-dm-sans font-normal leading-[1.3] text-base text-gray-11">
                      Informe a chave Pix da organização para recebimento dos
                      repasses
                    </p>
                  </div>
                  <Button
                    onClick={handleRequestChange}
                    className="w-full sm:w-auto h-11 px-6 font-manrope font-bold text-base shrink-0"
                  >
                    Adicionar chave
                  </Button>
                </div>

                {/* Lista de chaves PIX (accordion) */}
                {pixKeys.length > 0 ? (
                  <div className="w-full flex flex-col gap-3">
                    {pixKeys.map((pixKey) => {
                      const isOpen = openPixId === pixKey.id;
                      return (
                        <div
                          key={pixKey.id}
                          className="w-full border border-gray-6 rounded-lg overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenPixId(isOpen ? null : pixKey.id)
                            }
                            className="w-full flex items-center justify-between p-5 transition-colors text-left"
                          >
                            <div className="flex flex-col gap-2 items-start min-w-0">
                              <p className="font-manrope font-bold leading-[1.1] text-lg text-gray-12 truncate">
                                {pixKey.bankName || "Banco"}
                              </p>
                              <div className="flex items-center gap-1 text-base leading-[1.3]">
                                <span className="font-family-dm-sans font-normal text-gray-11">
                                  Chave pix:
                                </span>
                                <span className="font-family-dm-sans font-medium text-gray-12 truncate">
                                  {pixKey.key || "—"}
                                </span>
                              </div>
                            </div>
                            <div className="shrink-0 ml-3">
                              <ArrowButton isOpen={isOpen} />
                            </div>
                          </button>

                          {isOpen && (
                            <div className="px-5 pb-5 flex flex-col gap-6">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6 mt-5">
                                <FormField
                                  label="Tipo de Chave"
                                  value={pixKey.keyType || "—"}
                                  readOnly
                                />
                                <FormField
                                  label="Chave cadastrada"
                                  value={pixKey.key || "—"}
                                  readOnly
                                />
                                <FormField
                                  label="Nome do titular"
                                  value={pixKey.accountHolderName || "—"}
                                  readOnly
                                />
                                <FormField
                                  label="CPF/CNPJ do titular"
                                  value={
                                    pixKey.accountHolderDocument
                                      ? maskCPForCNPJ(
                                        pixKey.accountHolderDocument,
                                      )
                                      : "—"
                                  }
                                  readOnly
                                />
                                <FormField
                                  label="Banco"
                                  value={pixKey.bankName || "—"}
                                  readOnly
                                />
                              </div>

                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => setRemovingPixId(pixKey.id)}
                                  className="flex items-center gap-2 h-9 px-3 border border-red-6 rounded-lg text-red-12 hover:bg-red-2 transition-colors font-manrope font-semibold text-base leading-[1.1]"
                                >
                                  <TrashIcon className="size-5 shrink-0" />
                                  Remover
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="font-family-dm-sans text-sm text-gray-11">
                    Nenhuma chave PIX cadastrada.
                  </p>
                )}

                {/* Solicitar alteração */}
                <div className="flex justify-start w-full">
                  <Button
                    onClick={handleRequestChange}
                    variant="outline"
                    className="flex items-center gap-2 h-12 px-6 border-gray-6 text-gray-12 font-manrope font-bold text-base"
                  >
                    <ChatIcon className="size-5" />
                    Solicitar alteração
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de recorte da logo — sempre montado (a aba Detalhes o aciona). */}
        <ImageUploadWithCrop
          ref={logoCropRef}
          spec={EVENT_IMAGE_SPECS.organizationLogo}
          outputBaseName="organization-logo"
          cropShape="round"
          maxFileSizeMb={10}
          accept="image/jpeg,image/jpg,image/png"
          modalTitle="Ajustar logo da organização"
          onCropped={(file) => pendingLogo.stageFile(file)}
          onInvalidFile={(msg) => toast.error(msg)}
          onCropFailed={(msg) => toast.error(msg)}
        />
      </div>

      {/* Modal: Remover chave PIX */}
      {removingPixId &&
        (() => {
          const pixKey = pixKeys.find((p) => p.id === removingPixId);
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
              onClick={() => setRemovingPixId(null)}
            >
              <div
                className="bg-gray-1 rounded-xl p-5 w-full max-w-[442px] flex flex-col gap-11 items-center shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col gap-6 items-center w-full">
                  <div className="size-[88px] rounded-full bg-gradient-to-b from-red-2 to-red-5 flex items-center justify-center shrink-0">
                    <XCircle
                      className="size-[52px] text-red-11"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="flex flex-col gap-4 items-center w-full">
                    <p className="font-family-dm-sans font-semibold leading-[1.3] text-xl text-gray-12 text-center">
                      Remover esta chave Pix?
                    </p>
                    <p className="font-family-dm-sans font-normal leading-[1.3] text-base text-gray-11 text-center">
                      A chave{" "}
                      <span className="font-medium text-gray-12">
                        {pixKey?.key}
                      </span>{" "}
                      será removida da sua organização.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => setRemovingPixId(null)}
                    className="flex-1 h-12 border border-gray-6 rounded-lg font-manrope font-bold text-base text-gray-12 hover:bg-gray-2 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleRequestChange();
                      setRemovingPixId(null);
                    }}
                    className="flex-1 h-12 bg-red-11 rounded-lg font-manrope font-bold text-base text-red-2 hover:bg-red-10 transition-colors"
                  >
                    Sim, remover
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
}
