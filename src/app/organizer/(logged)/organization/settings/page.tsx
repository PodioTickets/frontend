"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useAuth } from "@/hooks/useAuth";
import { organizerService } from "@/services";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Dropdown, DropdownOption } from "@/components/Dropdown";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import toast from "react-hot-toast";
import { getAvatarUrl } from "@/utils/avatar";
import {
  Plus,
  ChevronLeft,
  MapPinIcon,
  MessageCircleIcon,
  Phone,
  XCircle,
} from "lucide-react";
import type {
  Organization,
  PixKey,
} from "@/services/organizer/OrganizerService";
import { ChatIcon } from "@/components/Icons/ChatIcon";
import { ArrowButton } from "@/components/ArrowButton";
import { Loading } from "@/components/Loading";
import {
  ImageUploadWithCrop,
  type ImageUploadWithCropRef,
} from "@/components/ImageUploadWithCrop";
import { EVENT_IMAGE_SPECS } from "@/lib/eventImageSpecs";
import { usePendingImageUpload } from "@/hooks/usePendingImageUpload";
import { isCurrentUserOrganizationOwner } from "@/utils/organizationOwner";
import { HotelsIcon } from "@/components/Icons/Organizer/HotelsIcon";
import { FinanceIcon } from "@/components/Icons/Organizer/FinanceIcon";
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

export default function OrganizationSettingsPage() {
  const orgNav = useOrganizerNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [organizer, setOrganizer] = useState<Organization | null>(null);
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
    // Chave PIX
    pix: "",
    pixKeyType: "",
    accountHolderName: "",
    accountHolderDocument: "",
    bankName: "",
    bankCode: "",
    agency: "",
    account: "",
    accountType: "" as "CORRENTE" | "POUPANCA" | "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
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
        // E-mail de CONTATO (org.email) — o fiscal (org.fiscalEmail) é outro
        // campo, exibido read-only em "Detalhes da organização".
        email: org.email || "",
        whatsapp: org.whatsapp || "",
        phone: org.phone || "",
        siteUrl: org.siteUrl || "",
        instagram: org.instagram || "",
        pix: org.pix || "",
        pixKeyType: "", // Precisa inferir do tipo de chave PIX
        accountHolderName: org.accountHolderName || "",
        accountHolderDocument: org.accountHolderDocument || "",
        bankName: org.bankName || "",
        bankCode: org.bankCode || "",
        agency: org.agency || "",
        account: org.account || "",
        accountType: (org.accountType as "CORRENTE" | "POUPANCA") || "",
      });
    } catch (error: any) {
      console.error("Error loading organization:", error);
      console.error("Error response:", error.response?.data);
      if (error.response?.status === 404) {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Apenas faz STAGING — a logo só é enviada/persistida no handleSubmit ("Salvar").
  const handleRemoveImage = () => {
    pendingLogo.stageRemove();
  };

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

  const maskCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5)
      return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    if (numbers.length <= 8)
      return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    if (numbers.length <= 12)
      return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
  };

  const maskCPForCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    // Se tiver 11 ou menos dígitos, formata como CPF
    if (numbers.length <= 11) {
      return maskCPF(value);
    }
    // Se tiver mais de 11 dígitos, formata como CNPJ
    return maskCNPJ(value);
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
    // Se tiver 10 dígitos, é telefone fixo: (00) 0000-0000
    if (numbers.length <= 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
    }
    // Se tiver 11 dígitos, é celular: (00) 00000-0000
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const maskWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    // WhatsApp sempre é celular: (00) 00000-0000
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    try {
      // Preparar dados removendo formatação de documentos e telefones
      const updateData: any = {
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
        pix: formData.pix || undefined,
        accountHolderName: formData.accountHolderName || undefined,
        accountHolderDocument:
          formData.accountHolderDocument.replace(/\D/g, "") || undefined,
        bankName: formData.bankName || undefined,
        bankCode: formData.bankCode || undefined,
        agency: formData.agency || undefined,
        account: formData.account || undefined,
        accountType: formData.accountType || undefined,
      };

      // Remover campos undefined para não enviar
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
      // Usa a resposta do PATCH (estado já persistido) em vez de RE-BUSCAR. Re-buscar fazia:
      // (1) setLoading(true) → flash do <Loading/> full-screen ("refresh" da página); (2) leitura
      // imediata da réplica podia vir defasada (lag) e sobrescrever o formData com o valor antigo.
      // O formData já reflete o que o usuário editou; só sincronizamos o `organizer`.
      setOrganizer(finalOrg);
      pendingLogo.reset();
    } catch (error: any) {
      console.error("Error updating organization:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
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
  // Pessoa Jurídica = documento com 14 dígitos (CNPJ). PF (11=CPF) esconde CNPJ/Razão social.
  // Documento ausente cai como PJ (legado) — mantém os campos visíveis.
  const isPj = (organizer.document ?? "").replace(/\D/g, "").length !== 11;
  return (
    <>
      <div className="min-h-screen bg-gray-2">
        {/* Desktop: fixed header com offset da sidebar. Mobile: barra com voltar + título (Figma) */}
        <div className="md:fixed top-0 left-0 md:left-[218px] right-0 z-10 bg-gray-1 border-b border-gray-6 flex items-center h-[73px] md:h-[73px] shrink-0 px-4 md:px-8">
          <div className="flex items-center gap-2 min-w-0 w-full md:w-auto">
            <Link
              href="/organizer/events"
              className="md:hidden size-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-gray-3 transition-colors rotate-180"
              aria-label="Voltar"
            >
              <ArrowButton isOpen={false} />
            </Link>
            <p className="font-manrope font-extrabold text-gray-12 text-base md:text-2xl truncate">
              Configurações da organização
            </p>
          </div>
        </div>

        {/* Content: padding mobile 16px, desktop 32px */}
        <div className="md:pt-[73px] pb-8 px-4 md:px-8">
          <div className="max-w-[1158px] mx-auto flex flex-col gap-6 md:gap-8 mt-6 md:mt-8">
            {/* Personal Info Section - Organização (Figma: card com logo, nome, CNPJ, botões) */}
            <div className="bg-gray-1 flex flex-col gap-4 md:gap-4 items-start pb-6 pt-5 px-4 md:pb-8 md:pt-6 relative rounded-xl shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] border border-gray-6">
              <div className="flex flex-col gap-4 items-start justify-end relative shrink-0 w-full">
                {/* First Row: Logo + Organization Info; Owner Info só no desktop */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0 relative shrink-0 w-full">
                  {/* Logo and Organization Info */}
                  <div className="flex gap-3 md:gap-4 items-center relative shrink-0 w-full md:w-auto">
                    {/* Logo - menor no mobile (Figma ~40px) */}
                    <div className="relative shrink-0 size-10 md:size-24 rounded-full bg-gray-6">
                      <ImageWithInitialFallback
                        src={pendingLogo.resolveSrc(organizer.logoUrl)}
                        alt={organizer.name || "Organização"}
                        name={organizer.name || "Organização"}
                        fallbackId={organizer.id}
                        fill
                        sizes="96px"
                        className="size-full rounded-full"
                        imgClassName="object-cover"
                        letterClassName="text-xl md:text-3xl font-medium text-gray-11"
                      />
                    </div>

                    {/* Organization Details - texto menor no mobile (Figma) */}
                    <div className="flex flex-col gap-1 md:gap-2 items-start justify-center relative shrink-0 min-w-0">
                      <p className="font-family-dm-sans font-semibold leading-[1.3] md:font-manrope md:font-bold md:leading-[1.1] text-base md:text-2xl text-gray-12 truncate w-full">
                        {organizer.tradeName || "Nome da organização"}
                      </p>
                    </div>
                  </div>

                  {/* Owner Info - só no desktop */}
                  <div className="hidden md:flex flex-col gap-3 items-start relative shrink-0">
                    <p className="font-family-dm-sans font-normal leading-[1.3] relative shrink-0 text-base text-gray-11">
                      Dono da organização
                    </p>
                    <div className="flex gap-2 items-center relative shrink-0">
                      <div className="relative shrink-0 size-10 rounded-full overflow-hidden bg-gray-6">
                        <ImageWithInitialFallback
                          src={
                            user?.avatarUrl?.trim()
                              ? getAvatarUrl(user.avatarUrl)
                              : null
                          }
                          alt={
                            user?.firstName && user?.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user?.email || "Dono"
                          }
                          name={
                            user?.firstName && user?.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user?.email || "Dono"
                          }
                          fallbackId={user?.id}
                          fill
                          sizes="40px"
                          className="size-full rounded-full"
                          imgClassName="object-cover"
                          letterClassName="text-sm font-medium text-gray-11"
                        />
                      </div>
                      <div className="flex flex-col items-start justify-center relative shrink-0">
                        <p className="font-family-dm-sans font-medium leading-[1.3] relative shrink-0 text-lg text-gray-12">
                          {user?.firstName} {user?.lastName}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Second Row: Support text + Buttons (mobile: full width, Figma) */}
                <div className="flex flex-col gap-3 md:gap-4 w-full">
                  <p className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-11">
                    Suportamos imagens em PNGs, JPEGs até 10MB
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full">
                    <Button
                      onClick={() => logoCropRef.current?.open()}
                      disabled={uploadingImage || saving}
                      size="default"
                      className="w-full sm:w-auto px-6 py-3 h-11 font-manrope font-bold text-base"
                    >
                      <Plus className="size-5" />
                      Alterar imagem
                    </Button>
                    <Button
                      onClick={handleRemoveImage}
                      disabled={
                        uploadingImage ||
                        saving ||
                        pendingLogo.removed ||
                        (!organizer.logoUrl && !pendingLogo.file)
                      }
                      variant="outline"
                      className="w-full sm:w-auto px-6 py-3 h-11 border-gray-6 text-gray-12 font-manrope font-bold text-base"
                    >
                      Remover imagem
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Detalhes da organização */}
            <div className="bg-gray-1 flex flex-col gap-4 md:gap-6 items-start pb-6 pt-5 px-4 md:pb-8 md:pt-6 relative rounded-xl shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] border border-gray-6">
              <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
                <p className="font-manrope font-bold leading-[1.1] text-lg md:text-base text-gray-12 flex items-center gap-2">
                  <HotelsIcon className="size-6 text-gray-12" /> Detalhes da
                  organização
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                {/* CNPJ + Razão social: só para Pessoa Jurídica (documento com 14 dígitos).
                    PF (CPF, 11 dígitos) não tem esses campos — a identidade é o responsável.
                    Read-only: dados fiscais geridos pelo admin. */}
                {isPj && (
                  <>
                    <div className="flex flex-col gap-2 items-start">
                      <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                        CNPJ
                      </label>
                      <Input
                        type="text"
                        name="document"
                        value={maskCNPJ(formData.document)}
                        placeholder="00.000.000/0000-00"
                        disabled
                        className="disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-black bg-gray-6"
                      />
                    </div>

                    <div className="flex flex-col gap-2 items-start">
                      <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                        Razão social
                      </label>
                      <Input
                        type="text"
                        name="name"
                        value={organizer.name ?? ""}
                        placeholder="Digite a razão social"
                        disabled
                        className="disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-black bg-gray-6"
                      />
                    </div>
                  </>
                )}

                {/* Nome fantasia (campo `tradeName`) — editável pelo organizador. */}
                <div className="flex flex-col gap-2 items-start">
                  <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                    Nome fantasia
                  </label>
                  <Input
                    type="text"
                    name="tradeName"
                    value={formData.tradeName}
                    onChange={handleInputChange}
                    placeholder="Digite o nome fantasia"
                  />
                </div>

                {/* Nome do responsável */}
                <div className="flex flex-col gap-2 items-start">
                  <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                    Nome do responsável
                  </label>
                  <Input
                    type="text"
                    name="ownerName"
                    value={organizer.ownerName}
                    onChange={handleInputChange}
                    placeholder="Nome do responsável"
                    disabled
                    className="disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-black bg-gray-6"
                  />
                </div>

                {/* CPF do responsável */}
                <div className="flex flex-col gap-2 items-start">
                  <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                    CPF do responsável
                  </label>
                  <Input
                    type="text"
                    name="ownerName"
                    value={maskCPF(organizer.ownerDocument ?? "")}
                    onChange={handleInputChange}
                    placeholder="CPF do responsável"
                    disabled
                    className="disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-black bg-gray-6"
                  />
                </div>

                <div className="flex flex-col gap-2 items-start">
                  <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                    E-mail fiscal
                  </label>
                  <Input
                    type="text"
                    name="emailFiscal"
                    value={organizer.fiscalEmail}
                    onChange={handleInputChange}
                    placeholder="E-mail fiscal"
                    disabled
                    className="disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-black bg-gray-6"
                  />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="bg-gray-1 flex flex-col gap-4 md:gap-6 items-start pb-6 pt-5 px-4 md:pb-8 md:pt-6 relative rounded-xl shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] border border-gray-6">
              <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
                <p className="font-manrope font-bold leading-[1.1] text-lg md:text-base text-gray-12 flex items-center gap-2">
                  <MapPinIcon className="size-6 text-gray-12" />
                  Endereço
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                {/* CEP */}
                <div className="flex flex-col gap-2 items-start">
                  <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                    CEP
                  </label>
                  <Input
                    type="text"
                    name="zipCode"
                    value={maskCEP(formData.zipCode)}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setFormData((prev) => ({ ...prev, zipCode: value }));
                    }}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>

                {/* Rua */}
                <div className="flex flex-col gap-2 items-start">
                  <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                    Rua
                  </label>
                  <Input
                    type="text"
                    name="street"
                    value={formData.street}
                    onChange={handleInputChange}
                    placeholder="Digite o nome da sua rua"
                  />
                </div>

                {/* Número */}
                <div className="flex flex-col gap-2 items-start">
                  <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                    Número
                  </label>
                  <Input
                    type="text"
                    name="number"
                    value={formData.number}
                    onChange={handleInputChange}
                    placeholder="Ex: 123"
                  />
                </div>

                {/* Bairro */}
                <div className="flex flex-col gap-2 items-start">
                  <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                    Bairro
                  </label>
                  <Input
                    type="text"
                    name="neighborhood"
                    value={formData.neighborhood}
                    onChange={handleInputChange}
                    placeholder="Digite o nome do seu bairro"
                  />
                </div>

                {/* Cidade */}
                <div className="flex flex-col gap-2 items-start">
                  <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                    Cidade
                  </label>
                  <Input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Nome da cidade"
                  />
                </div>

                {/* Estado */}
                <div className="flex flex-col gap-2 items-start w-full">
                  <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                    Estado
                  </label>
                  <div className="w-full">
                    <Dropdown
                      options={stateOptions}
                      width="w-full"
                      trigger={(isOpen) => (
                        <button className="border border-gray-6 rounded-lg h-[42px] flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors">
                          <span
                            className={`text-base flex-1 text-left font-family-dm-sans ${formData.state ? "text-gray-12" : "text-gray-11"
                              }`}
                          >
                            {selectedState?.label || "Selecione o estado"}
                          </span>
                          <ArrowButton isOpen={isOpen} />
                        </button>
                      )}
                      onSelect={(option) =>
                        setFormData((prev) => ({
                          ...prev,
                          state: option.id || "",
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contatos da organização */}
            <div className="bg-gray-1 flex flex-col gap-4 md:gap-6 items-start pb-6 pt-5 px-4 md:pb-8 md:pt-6 relative rounded-xl shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] border border-gray-6">
              <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
                <p className="font-manrope font-bold leading-[1.1] text-lg md:text-base text-gray-12 flex items-center gap-2">
                  <Phone className="size-5 text-gray-12" />
                  Contatos da organização
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                {/* E-mail para Atendimento */}
                <div className="flex flex-col gap-2 items-start">
                  <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                    E-mail
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="contato@meuevento.com.br"
                  />
                </div>

                {/* WhatsApp */}
                <div className="flex flex-col gap-2 items-start">
                  <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                    WhatsApp
                  </label>
                  <Input
                    type="text"
                    name="whatsapp"
                    value={maskWhatsApp(formData.whatsapp)}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 11);
                      setFormData((prev) => ({ ...prev, whatsapp: value }));
                    }}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>

                {/* Telefone */}
                <div className="flex flex-col gap-2 items-start">
                  <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                    Telefone
                  </label>
                  <Input
                    type="text"
                    name="phone"
                    value={maskPhone(formData.phone)}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 11);
                      setFormData((prev) => ({ ...prev, phone: value }));
                    }}
                    placeholder="(00) 0000-0000"
                    maxLength={15}
                  />
                </div>
              </div>
            </div>

            {/* Chave PIX */}
            <div className="bg-gray-1 flex flex-col gap-6 items-start pb-6 pt-5 px-4 md:pb-8 md:pt-6 relative rounded-xl shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] border border-gray-6">
              {/* Header */}
              <div className="flex items-center gap-2 w-full">
                <FinanceIcon className="size-6 text-gray-12 shrink-0" />
                <p className="font-manrope font-bold leading-[1.1] text-lg text-gray-12">
                  Chave PIX
                </p>
              </div>

              {/* PIX keys list */}
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
                            <div className="flex items-center gap-1">
                              <p className="font-manrope font-bold leading-[1.1] text-lg text-gray-12 truncate">
                                {pixKey.bankName || "Banco"}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 text-base leading-[1.3]">
                              <span className="font-family-dm-sans font-normal text-gray-11">
                                Chave pix ({pixKey.keyType || ""}):
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                              <div className="flex flex-col gap-2 items-start">
                                <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                                  Tipo de Chave
                                </label>
                                <Input
                                  type="text"
                                  value={pixKey.keyType || "—"}
                                  onChange={() => { }}
                                  disabled
                                  className="disabled:opacity-50 disabled:cursor-not-allowed bg-gray-6"
                                />
                              </div>

                              <div className="flex flex-col gap-2 items-start">
                                <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                                  Chave cadastrada
                                </label>
                                <Input
                                  type="text"
                                  value={pixKey.key || "—"}
                                  onChange={() => { }}
                                  disabled
                                  className="disabled:opacity-50 disabled:cursor-not-allowed bg-gray-6"
                                />
                              </div>

                              <div className="flex flex-col gap-2 items-start">
                                <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                                  Nome do titular
                                </label>
                                <Input
                                  type="text"
                                  value={pixKey.accountHolderName || "—"}
                                  onChange={() => { }}
                                  disabled
                                  className="disabled:opacity-50 disabled:cursor-not-allowed bg-gray-6"
                                />
                              </div>

                              <div className="flex flex-col gap-2 items-start">
                                <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                                  CPF/CNPJ do titular
                                </label>
                                <Input
                                  type="text"
                                  value={
                                    pixKey.accountHolderDocument
                                      ? maskCPForCNPJ(
                                        pixKey.accountHolderDocument,
                                      )
                                      : "—"
                                  }
                                  onChange={() => { }}
                                  disabled
                                  className="disabled:opacity-50 disabled:cursor-not-allowed bg-gray-6"
                                />
                              </div>

                              <div className="flex flex-col gap-2 items-start">
                                <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                                  Banco
                                </label>
                                <Input
                                  type="text"
                                  value={pixKey.bankName || "—"}
                                  onChange={() => { }}
                                  disabled
                                  className="disabled:opacity-50 disabled:cursor-not-allowed bg-gray-6"
                                />
                              </div>
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
              <div className="flex justify-end w-full">
                <Button
                  onClick={handleRequestChange}
                  variant="outline"
                  className="flex items-center gap-2 border-gray-6 text-gray-12 font-manrope font-bold"
                >
                  <ChatIcon className="size-5" />
                  Solicitar alteração
                </Button>
              </div>
            </div>

            {/* Action Buttons - mobile: full width stacked (Figma); desktop: à direita */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 w-full pb-8 md:pb-0">
              <Button
                onClick={handleRequestChange}
                variant="outline"
                className="md:hidden w-full h-11 flex items-center justify-center gap-2 border-gray-6 text-gray-12 font-manrope font-bold"
              >
                <ChatIcon className="size-5" />
                Solicitar alteração
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                size="lg"
                className="w-full sm:w-auto h-11 font-manrope font-bold text-base"
              >
                {saving ? "Salvando..." : "Salvar alteração"}
              </Button>
            </div>

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
        </div>
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

