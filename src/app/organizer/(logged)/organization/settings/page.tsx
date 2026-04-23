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
import { Plus, ChevronLeft, MapPinIcon, MessageCircleIcon, Phone } from "lucide-react";
import type { Organization } from "@/services/organizer/OrganizerService";
import { ChatIcon } from "@/components/Icons/ChatIcon";
import { ArrowButton } from "@/components/ArrowButton";
import { Loading } from "@/components/Loading";
import {
  ImageUploadWithCrop,
  type ImageUploadWithCropRef,
} from "@/components/ImageUploadWithCrop";
import { EVENT_IMAGE_SPECS } from "@/lib/eventImageSpecs";
import { isCurrentUserOrganizationOwner } from "@/utils/organizationOwner";
import { HotelsIcon } from "@/components/Icons/Organizer/HotelsIcon";
import { FinanceIcon } from "@/components/Icons/Organizer/FinanceIcon";

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

const PIX_KEY_TYPES = [
  { id: "CPF", label: "CPF" },
  { id: "CNPJ", label: "CNPJ" },
  { id: "EMAIL", label: "E-mail" },
  { id: "TELEFONE", label: "Telefone" },
  { id: "ALEATORIA", label: "Chave Aleatória" },
];

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const orgNav = useOrganizerNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [organizer, setOrganizer] = useState<Organization | null>(null);
  const logoCropRef = useRef<ImageUploadWithCropRef>(null);

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
      setFormData({
        document: org.document || "",
        tradeName: org.tradeName || "",
        ownerName: org.ownerName || "",
        ownerDocument: org.accountHolderDocument || "", // Usar accountHolderDocument como fallback
        zipCode: org.zipCode || "",
        street: org.street || "",
        number: org.number || "",
        neighborhood: org.neighborhood || "",
        city: org.city || "",
        state: org.state || "",
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

  const uploadOrganizationLogo = async (file: File) => {
    setUploadingImage(true);
    try {
      const imageUrl = await organizerService.uploadImage(file);
      await organizerService.updateOrganizationLogo(imageUrl);
      toast.success("Imagem atualizada com sucesso!");
      loadOrganization();
    } catch (error: any) {
      console.error("Error uploading image:", error);
      const errorMessage =
        error.message || error.response?.data?.message || "Erro ao fazer upload da imagem";
      toast.error(errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      // Remover logo definindo como string vazia ou null
      await organizerService.updateOrganizationLogo("");
      toast.success("Imagem removida com sucesso!");
      loadOrganization();
    } catch (error: any) {
      console.error("Error removing image:", error);
      const errorMessage =
        error.message || error.response?.data?.message || "Erro ao remover imagem";
      toast.error(errorMessage);
    }
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
        accountHolderDocument: formData.accountHolderDocument.replace(/\D/g, "") || undefined,
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

      await organizerService.updateOrganization(updateData);

      toast.success("Configurações atualizadas com sucesso!");
      loadOrganization();
    } catch (error: any) {
      console.error("Error updating organization:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Erro ao atualizar configurações";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
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
  return (
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
                      src={
                        organizer.logoUrl?.trim()
                          ? getAvatarUrl(organizer.logoUrl)
                          : null
                      }
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
                      {organizer.name || "Nome da organização"}
                    </p>
                    <p className="font-family-dm-sans leading-[1.3] text-sm md:text-xl text-gray-11">
                      CNPJ: {organizer.document ? maskCNPJ(organizer.document.replace(/\D/g, "")) : "00.000.000/0000-00"}
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
                    disabled={uploadingImage}
                    size="default"
                    className="w-full sm:w-auto px-6 py-3 h-11 font-manrope font-bold text-base"
                  >
                    <Plus className="size-5" />
                    {uploadingImage ? "Enviando..." : "Alterar imagem"}
                  </Button>
                  <Button
                    onClick={handleRemoveImage}
                    disabled={uploadingImage || !organizer.logoUrl}
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
                <HotelsIcon className="size-6 text-gray-12" /> Detalhes da organização
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              {/* CNPJ */}
              <div className="flex flex-col gap-2 items-start">
                <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                  CNPJ
                </label>
                <Input
                  type="text"
                  name="document"
                  value={maskCNPJ(formData.document)}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setFormData((prev) => ({ ...prev, document: value }));
                  }}
                  placeholder="00.000.000/0000-00"
                  disabled
                  className="disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-black bg-gray-6"
                />
              </div>

              {/* Nome fantasia (Razão social) */}
              <div className="flex flex-col gap-2 items-start">
                <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                  Nome fantasia (Razão social)
                </label>
                <Input
                  type="text"
                  name="tradeName"
                  value={formData.tradeName}
                  onChange={handleInputChange}
                  placeholder="Digite o nome fantasia"
                  disabled
                  className="disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-black bg-gray-6"
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
                  value={organizer.members?.find((member) => member.role === "OWNER")?.user?.firstName || ""}
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
                  value={maskCPF((organizer.members?.find((member) => member.role === "OWNER")?.user?.documentNumber || "").replace(/\D/g, ""))}
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
                  value={organizer.email}
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
                      setFormData((prev) => ({ ...prev, state: option.id || "" }))
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
                  E-mail para Atendimento
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
                    const value = e.target.value.replace(/\D/g, "");
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
                    const value = e.target.value.replace(/\D/g, "");
                    setFormData((prev) => ({ ...prev, phone: value }));
                  }}
                  placeholder="(00) 0000-0000"
                  maxLength={14}
                />
              </div>
            </div>
          </div>

          {/* Chave PIX */}
          <div className="bg-gray-1 flex flex-col gap-4 md:gap-6 items-start pb-6 pt-5 px-4 md:pb-8 md:pt-6 relative rounded-xl shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] border border-gray-6">
            <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
              <p className="font-manrope font-bold leading-[1.1] text-lg md:text-base text-gray-12 flex items-center gap-2">
                <FinanceIcon className="size-6 text-gray-12" />
                Chave PIX
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              {/* Tipo de Chave */}
              <div className="flex flex-col gap-2 items-start">
                <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                  Tipo de Chave
                </label>

                <span
                  className="border-gray-6 h-10 w-full min-w-0 rounded-md border bg-gray-6 px-3 py-5 md:text-base shadow-xs transition-[color,box-shadow] outline-none flex items-center justify-start opacity-50 text-black"
                >
                  {formData.pixKeyType || "Tipo de chave"}
                </span>
              </div>

              {/* Chave cadastrada */}
              <div className="flex flex-col gap-2 items-start">
                <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                  Chave cadastrada
                </label>
                <span
                  className="border-gray-6 h-10 w-full min-w-0 rounded-md border bg-gray-6 px-3 py-5 md:text-base shadow-xs transition-[color,box-shadow] outline-none flex items-center justify-start opacity-50 text-black"
                >
                  {formData.pix || "Chave cadastrada"}
                </span>
              </div>

              {/* CPF/CNPJ do titular */}
              <div className="flex flex-col gap-2 items-start">
                <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                  CPF/CNPJ do titular
                </label>

                <span
                  className="border-gray-6 h-10 w-full min-w-0 rounded-md border bg-gray-6 px-3 py-5 md:text-base shadow-xs transition-[color,box-shadow] outline-none flex items-center justify-start opacity-50 text-black"
                >
                  {formData.accountHolderDocument ? maskCPForCNPJ(formData.accountHolderDocument) : "CPF/CNPJ do titular"}
                </span>
              </div>

              {/* Nome do titular */}
              <div className="flex flex-col gap-2 items-start">
                <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                  Nome do titular
                </label>

                <span
                  className="border-gray-6 h-10 w-full min-w-0 rounded-md border bg-gray-6 px-3 py-5 md:text-base shadow-xs transition-[color,box-shadow] outline-none flex items-center justify-start opacity-50 text-black"
                >
                  {formData.accountHolderName || "Nome do titular"}
                </span>
              </div>

              {/* Banco */}
              <div className="flex flex-col gap-2 items-start">
                <label className="font-family-dm-sans font-normal leading-[1.3] text-sm text-gray-12">
                  Banco
                </label>
                <span
                  className="border-gray-6 h-10 w-full min-w-0 rounded-md border bg-gray-6 px-3 py-5 md:text-base shadow-xs transition-[color,box-shadow] outline-none flex items-center justify-start opacity-50 text-black"
                >
                  {formData.bankName || "Banco"}
                </span>
              </div>
            </div>
            <div className="hidden md:flex justify-end w-full mt-4">
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
            onCropped={(file) => void uploadOrganizationLogo(file)}
            onInvalidFile={(msg) => toast.error(msg)}
            onCropFailed={(msg) => toast.error(msg)}
          />
        </div>
      </div>
    </div>
  );
}
