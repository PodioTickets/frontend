"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { organizerService, userService } from "@/services";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { OrganizerSidebar } from "@/components/Organizer/OrganizerSidebar";
import { useChangeEmailModal } from "@/stores/modalStore";
import { Download, Mail, Lock, ShieldCheck, User, ArrowRight, Plus } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { getAvatarUrl } from "@/utils/avatar";
import { ArrowButton } from "@/components/ArrowButton";
import { Loading } from "@/components/Loading";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";

export default function OrganizerSettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { openChangeEmailModal } = useChangeEmailModal();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [organizer, setOrganizer] = useState<any>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (authLoading) return;

    const hasToken = userService.isAuthenticated();
    if (!hasToken && !isAuthenticated) {
      router.push("/");
      return;
    }

    if (!authChecked) {
      setAuthChecked(true);
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!authChecked || authLoading) return;
    loadOrganizer();
  }, [authChecked]);

  const loadOrganizer = async () => {
    try {
      setLoading(true);
      const org = await organizerService.getOrganization();
      setOrganizer(org);
      setFormData({
        name: org.name || "",
      });
    } catch (error: any) {
      console.error("Error loading organization:", error);
      if (error.response?.status === 404) {
        router.push("/organizer/create");
        return;
      }
      toast.error("Erro ao carregar dados da organização");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato inválido. Use JPG ou PNG.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo de 2MB.");
      return;
    }

    setUploadingImage(true);
    try {
      const result = await userService.uploadAvatar(file);
      toast.success("Imagem atualizada com sucesso!");
      // Recarregar dados do usuário
      window.location.reload();
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error("Erro ao fazer upload da imagem");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      // TODO: Implementar remoção de imagem
      toast.success("Imagem removida com sucesso!");
      window.location.reload();
    } catch (error: any) {
      console.error("Error removing image:", error);
      toast.error("Erro ao remover imagem");
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setErrors({ name: "Nome é obrigatório" });
      toast.error("Por favor, preencha o nome");
      return;
    }

    setSaving(true);
    try {
      await organizerService.updateOrganization({
        name: formData.name,
      });

      toast.success("Configurações atualizadas com sucesso!");
      loadOrganizer();
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

  const handleChangePassword = () => {
    // TODO: Implementar modal de alteração de senha
    toast("Funcionalidade em desenvolvimento", { icon: "ℹ️" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!organizer) {
    return null;
  }

  return (
    <div className="flex items-start relative size-full min-h-screen">

      <div className="flex flex-col items-start relative shrink-0 max-w-7xl mx-auto">
        <div className="fixed top-0 left-[218px] p-8 right-0 z-10 bg-gray-1 border-b border-gray-6 flex items-center h-[84px] shrink-0 w-full">
          <div className="flex items-center relative shrink-0">
            <div className="flex flex-col items-start relative shrink-0">
              <p className="font-manrope font-extrabold leading-[1.1] relative shrink-0 text-2xl text-gray-12">
                Configurações de perfil
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-gray-2 flex flex-col gap-[32px] items-start overflow-clip pb-6 mt-20 pt-[64px] px-[32px] relative shrink-0 w-full">
          {/* Personal Info Section */}
          <div className="bg-gray-2 flex flex-col gap-[44px] items-start pb-[32px] pt-[24px] px-[16px] relative rounded-[12px] shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] shrink-0 w-full">
            {/* Profile Container */}
            <div className="flex gap-[16px] items-end relative shrink-0 w-full">
              <div className="relative shrink-0 size-[96px] rounded-full overflow-hidden">
                <ImageWithInitialFallback
                  src={user?.avatarUrl ? getAvatarUrl(user?.avatarUrl) : null}
                  alt="Profile"
                  name={user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email || "Nome do usuário"}
                  fill
                  sizes="96px"
                  className="size-full"
                  letterClassName="text-2xl font-semibold"
                />
              </div>
              <div className="flex flex-1 flex-col gap-[16px] items-start justify-center">
                <div className="flex gap-[17px] items-center relative shrink-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    <Plus className="size-6" />
                    {uploadingImage ? "Enviando..." : "Alterar imagem"}
                  </Button>
                  <Button
                    onClick={handleRemoveImage}
                    disabled={uploadingImage || !user?.avatarUrl}
                    variant="outline"
                    className="border-[1.5px] border-gray-6 flex gap-2 items-center justify-center px-[32px] py-[20px] rounded-[8px] shrink-0 font-manrope font-bold leading-[1.1] text-[16px] text-gray-12"
                  >
                    Remover imagem
                  </Button>
                </div>
                <p className="font-family-dm-sans font-normal leading-[1.3] relative shrink-0 text-[14px] text-gray-11">
                  Suportamos imagens em PNGs, JPEGs até 10MB
                </p>
              </div>
            </div>

            {/* Personal Data */}
            <div className="flex flex-col gap-[24px] items-start relative shrink-0 w-full">
              <div className="flex flex-col gap-[12px] items-start relative shrink-0 w-full">
                <p className="font-manrope font-bold leading-[1.1] relative shrink-0 text-[20px] text-gray-12">
                  Dados pessoais
                </p>
                <p className="font-family-dm-sans font-normal leading-[1.3] relative shrink-0 text-[16px] text-gray-11 whitespace-pre-wrap">
                  Usamos esses dados nas inscrições de eventos. Preencha exatamente como está no seu documento.
                </p>
              </div>

              {/* Inputs Container */}
              <div className="flex flex-wrap gap-y-[24px] items-center justify-between relative shrink-0 w-full">
                {/* Name Input */}
                <div className="flex flex-col items-start relative shrink-0 w-[343px]">
                  <div className="flex flex-col gap-[8px] items-start relative shrink-0 w-full">
                    <div className="flex gap-1 items-center relative shrink-0">
                      <p className="font-family-dm-sans font-normal leading-[1.3] relative shrink-0 text-[16px] text-gray-12">
                        Nome
                      </p>
                    </div>
                    <div className="border border-gray-6 flex gap-[10px] h-[48px] items-center justify-center px-[12px] py-[16px] relative rounded-[8px] shrink-0 w-full">
                      <div className="flex flex-1 gap-[4px] items-center relative shrink-0">
                        <User className="size-[24px] text-gray-11 shrink-0" />
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Juliana Silveira Riberth"
                          className="flex-1 border-0 bg-transparent px-0 text-[16px] text-gray-12 placeholder:text-gray-11 focus:ring-0 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Organizer Container */}
                <div className="bg-gray-2 border border-gray-6 flex gap-[16px] items-center px-[20px] py-[12px] relative rounded-[12px] shrink-0">
                  <div className="flex flex-col gap-[12px] items-start relative shrink-0">
                    <p className="font-family-dm-sans font-normal leading-[1.3] relative shrink-0 text-[16px] text-gray-11">
                      Organização
                    </p>
                    <div className="flex gap-2 items-center relative shrink-0">
                      <div className="relative shrink-0 size-[40px] rounded-full overflow-hidden">
                        <ImageWithInitialFallback
                          src={organizer?.avatarUrl ? getAvatarUrl(organizer?.avatarUrl) : null}
                          alt="Organization"
                          name={organizer.name || "Nome da organização"}
                          fill
                          sizes="40px"
                          className="size-full"
                          letterClassName="text-base font-semibold"
                        />
                      </div>
                      <div className="flex flex-col items-start justify-center leading-[1.3] relative shrink-0">
                        <p className="font-family-dm-sans font-semibold relative shrink-0 text-[18px] text-gray-12">
                          {organizer.name || "Nome da organização"}
                        </p>
                        <p className="font-family-dm-sans font-normal relative shrink-0 text-[14px] text-gray-11">
                          CNPJ: {organizer.document ? maskCNPJ(organizer.document.replace(/\D/g, "")) : "00.000.000/0000-00"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-6 h-full shrink-0 w-px" />
                  <div className="flex flex-col gap-[12px] items-start relative shrink-0">
                    <p className="font-family-dm-sans font-normal leading-[1.3] relative shrink-0 text-[16px] text-gray-11">
                      Dono da organização
                    </p>
                    <div className="flex gap-2 items-center relative shrink-0">
                      <div className="relative shrink-0 size-[40px] rounded-full overflow-hidden">
                        <ImageWithInitialFallback
                          src={user?.avatarUrl ? getAvatarUrl(user?.avatarUrl) : null}
                          alt="Owner"
                          name={user?.firstName && user?.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user?.email || "Nome do dono"}
                          fill
                          sizes="40px"
                          className="size-full"
                          letterClassName="text-base font-semibold"
                        />
                      </div>
                      <div className="flex flex-col items-start justify-center relative shrink-0">
                        <p className="font-family-dm-sans font-medium leading-[1.3] relative shrink-0 text-[18px] text-gray-12">
                          {user?.firstName && user?.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user?.email || "Nome do dono"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </div>

          {/* Account Security Section */}
          <div className="bg-gray-2 flex flex-col gap-[24px] items-start pb-[32px] pt-[24px] px-[16px] relative rounded-[12px] shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] shrink-0 w-full">
            <div className="flex flex-col gap-[12px] items-start relative shrink-0 w-full">
              <p className="font-manrope font-bold leading-[1.1] relative shrink-0 text-[20px] text-gray-12">
                Conta e segurança
              </p>
              <p className="font-family-dm-sans font-normal leading-[1.3] relative shrink-0 text-[16px] text-gray-11 whitespace-pre-wrap">
                Gerencie o e-mail e a senha que você usa para entrar no PódioTicket.
              </p>
            </div>

            <div className="flex flex-wrap gap-[24px_12px] items-center relative shrink-0 w-full">
              {/* Change Email Button */}
              <button
                onClick={() => openChangeEmailModal()}
                className="border border-gray-6 flex gap-[10px] h-[48px] items-center justify-center overflow-clip px-[12px] py-[16px] relative rounded-[8px] shrink-0 w-[375px] hover:bg-gray-3 transition-colors"
              >
                <div className="flex flex-1 gap-2 items-center relative shrink-0">
                  <Mail className="size-6 text-gray-12 shrink-0" />
                  <p className="font-family-dm-sans font-normal leading-[1.3] relative shrink-0 text-[16px] text-gray-12">
                    Deseja alterar seu email?
                  </p>
                </div>
                <div className="flex gap-1 items-center justify-end relative shrink-0">
                  <ArrowButton isOpen={false} />
                </div>
              </button>

              {/* Change Password Button */}
              <button
                onClick={handleChangePassword}
                className="border border-gray-6 flex h-[48px] items-center justify-between overflow-clip px-[12px] py-[16px] relative rounded-[8px] shrink-0 w-[462px] hover:bg-gray-3 transition-colors"
              >
                <div className="flex flex-1 gap-2 items-center relative shrink-0">
                  <Lock className="size-6 text-gray-12 shrink-0" />
                  <p className="font-family-dm-sans font-medium leading-[1.3] relative shrink-0 text-[14px] text-gray-12 text-left">
                    Deseja alterar sua senha?
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-gray-2 flex flex-col gap-[24px] items-start pb-[32px] pt-[24px] px-[16px] relative rounded-[12px] shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] shrink-0 w-full">
            <div className="flex flex-col gap-[32px] items-start relative shrink-0 w-full">
              <div className="flex flex-col gap-[16px] items-start relative shrink-0 w-full">
                <div className="flex items-center relative shrink-0 w-full">
                  <p className="font-manrope font-bold leading-[1.1] relative shrink-0 text-[20px] text-gray-12">
                    Segurança
                  </p>
                </div>
                <p className="font-family-dm-sans font-normal leading-[1.3] relative shrink-0 text-[16px] text-gray-11 w-full whitespace-pre-wrap">
                  Ative o 2FA para adicionar uma camada extra de segurança à sua conta. Sempre que fizer login em um novo dispositivo, você precisará informar um código enviado para o seu e-mail.
                </p>
              </div>

              {/* 2FA Toggle Button */}
              <button
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                className="border border-gray-6 flex gap-[10px] h-[44px] items-center justify-center overflow-clip px-[12px] py-[16px] relative rounded-[8px] shrink-0 w-[462px] hover:bg-gray-3 transition-colors"
              >
                <div className="flex flex-1 gap-2 items-center relative shrink-0">
                  <ShieldCheck className="size-6 text-gray-12 shrink-0" />
                  <p className="flex-1 font-family-dm-sans font-medium leading-[1.3] relative shrink-0 text-[14px] text-gray-12 text-left whitespace-pre-wrap">
                    Ligar dois fatores de segurança
                  </p>
                </div>
                <div className="flex gap-1 h-[20px] items-center justify-center relative rounded-[1.667px] shrink-0">
                  <div
                    className={`h-[20px] relative shrink-0 w-[37px] rounded-full transition-all ${twoFactorEnabled ? "bg-primary-11" : "bg-gray-6"
                      }`}
                  >
                    <div
                      className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${twoFactorEnabled ? "right-0.5" : "left-0.5"
                        }`}
                    />
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
