"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { organizerExternalHref } from "@/lib/organizerPathPresentation";
import { useAuth } from "@/hooks/useAuth";
import { organizerService, userService } from "@/services";
import { Button } from "@/components/Button";
import { useChangeEmailModal, useChangePasswordModal } from "@/stores/modalStore";
import { Mail, Lock, User, Plus } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { getAvatarUrl } from "@/utils/avatar";
import { ArrowButton } from "@/components/ArrowButton";
import { Loading } from "@/components/Loading";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import {
  ImageUploadWithCrop,
  type ImageUploadWithCropRef,
} from "@/components/ImageUploadWithCrop";
import { EVENT_IMAGE_SPECS } from "@/lib/eventImageSpecs";
import { usePendingImageUpload } from "@/hooks/usePendingImageUpload";
import { TwoFASection } from "@/components/TwoFASection";

export default function OrganizerSettingsPage() {
  const router = useRouter();
  const orgNav = useOrganizerNavigate();
  const appSurface = useOrganizerAppSurface();
  const eventsListHref = organizerExternalHref("/organizer/events", appSurface);
  const { isAuthenticated, isLoading: authLoading, user, refetchUser } = useAuth();
  const { openChangeEmailModal } = useChangeEmailModal();
  const { openChangePasswordModal } = useChangePasswordModal();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const avatarCropRef = useRef<ImageUploadWithCropRef>(null);
  // Foto de perfil em STAGING — só persiste no "Salvar alterações". [[usePendingImageUpload]]
  const pendingAvatar = usePendingImageUpload(getAvatarUrl);
  const [formData, setFormData] = useState({
    name: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const userFullName = user ? `${user?.firstName} ${user?.lastName ?? ""}`.trim() : "";
  const hasChanges = formData.name !== userFullName || pendingAvatar.isDirty;

  useEffect(() => {
    if (authLoading) return;

    const hasToken = userService.isAuthenticated();
    if (!hasToken && !isAuthenticated) {
      orgNav.push("/organizer/login");
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
      const currentName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
      setFormData({ name: currentName });
    } catch (error: any) {
      console.error("Error loading organization:", error);
      if (error.response?.status === 404) {
        orgNav.push("/organizer/create");
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

  // Apenas STAGING — a foto só vai pro backend no handleSubmit ("Salvar alterações").
  const handleRemoveImage = () => {
    pendingAvatar.stageRemove();
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
      if (!user?.id) throw new Error("Usuário não encontrado");
      // Nome: só faz PATCH se mudou (evita escrita desnecessária em save de foto-only).
      if (formData.name.trim() !== userFullName) {
        const parts = formData.name.trim().split(/\s+/);
        const firstName = parts[0] ?? "";
        const lastName = parts.slice(1).join(" ") || "";
        await userService.updateUser(user.id, { firstName, lastName });
      }
      // Foto em staging → persiste agora: novo arquivo (upload) ou remoção.
      if (pendingAvatar.file) {
        await userService.uploadAvatar(pendingAvatar.file);
      } else if (pendingAvatar.removed) {
        await userService.removeAvatar();
      }
      await refetchUser();
      pendingAvatar.reset();

      toast.success("Configurações atualizadas com sucesso!");
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
    openChangePasswordModal();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-2">
      {/* Header — estático no mobile (o menu mobile fixo já ocupa o topo);
          sticky só no desktop, onde não há barra fixa no topo. */}
      <div className="md:sticky md:top-0 z-10 bg-gray-1 border-b border-gray-6 flex items-center gap-2 h-16 md:h-[84px] px-4 md:px-8">
        {/* Voltar só no mobile: no desktop a navegação já vive na sidebar.
            Mesmo par (botão + título) de organization/settings. */}
        <Link
          href={eventsListHref}
          className="md:hidden size-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-gray-3 transition-colors rotate-180"
          aria-label="Voltar"
        >
          <ArrowButton isOpen={false} />
        </Link>
        <p className="font-manrope font-extrabold leading-[1.1] text-base md:text-[20px] text-gray-12 truncate">
          Configurações de perfil
        </p>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-4xl flex flex-col gap-6 md:gap-8 px-4 md:px-8 py-6 md:py-8">
        {/* Personal Info Section */}
        <div className="bg-gray-2 flex flex-col gap-8 md:gap-[44px] items-start pb-[32px] pt-[24px] px-4 md:px-[16px] rounded-[12px] shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] w-full">
          {/* Profile Container — empilha no mobile, lado a lado no desktop */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-[16px] items-start sm:items-end w-full">
            <div className="relative shrink-0 size-[96px] rounded-full overflow-hidden">
              <ImageWithInitialFallback
                src={pendingAvatar.resolveSrc(user?.avatarUrl)}
                alt="Profile"
                name={user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.email || "Nome do usuário"}
                fill
                sizes="96px"
                className="size-full rounded-full"
                letterClassName="text-2xl font-semibold"
              />
            </div>
            <div className="flex flex-1 flex-col gap-[16px] items-start justify-center w-full min-w-0">
              <div className="flex flex-wrap gap-3 sm:gap-[17px] items-center w-full">
                <Button
                  onClick={() => avatarCropRef.current?.open()}
                  disabled={saving}
                >
                  <Plus className="size-6" />
                  Alterar imagem
                </Button>
                <Button
                  onClick={handleRemoveImage}
                  disabled={
                    saving ||
                    pendingAvatar.removed ||
                    (!user?.avatarUrl && !pendingAvatar.file)
                  }
                  variant="outline"
                  className="border-[1.5px] border-gray-6 flex gap-2 items-center justify-center px-[32px] py-[20px] rounded-[8px] shrink-0 font-manrope font-bold leading-[1.1] text-[16px] text-gray-12"
                >
                  Remover imagem
                </Button>
              </div>
              <p className="font-family-dm-sans font-normal leading-[1.3] text-[14px] text-gray-11">
                Suportamos imagens em PNGs, JPEGs até 10MB
              </p>
            </div>
          </div>

          {/* Personal Data */}
          <div className="flex flex-col gap-[24px] items-start w-full">
            <div className="flex flex-col gap-[12px] items-start w-full">
              <p className="font-manrope font-bold leading-[1.1] text-[20px] text-gray-12">
                Dados pessoais
              </p>
              <p className="font-family-dm-sans font-normal leading-[1.3] text-[16px] text-gray-11 whitespace-pre-wrap">
                Usamos esses dados nas inscrições de eventos. Preencha exatamente como está no seu documento.
              </p>
            </div>

            {/* Inputs Container */}
            <div className="flex flex-wrap gap-y-[24px] items-center justify-between w-full">
              {/* Name Input — largura fluida no mobile, teto no desktop */}
              <div className="flex flex-col items-start w-full sm:w-[343px]">
                <div className="flex flex-col gap-[8px] items-start w-full">
                  <div className="flex gap-1 items-center">
                    <p className="font-family-dm-sans font-normal leading-[1.3] text-[16px] text-gray-12">
                      Nome
                    </p>
                  </div>
                  <div className="border border-gray-6 flex gap-[10px] h-[48px] items-center justify-center px-[12px] py-[16px] rounded-[8px] w-full">
                    <div className="flex flex-1 gap-[4px] items-center min-w-0">
                      <User className="size-[24px] text-gray-11 shrink-0" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Juliana Silveira Riberth"
                        className="flex-1 min-w-0 border-0 bg-transparent px-0 text-[16px] text-gray-12 placeholder:text-gray-11 focus:ring-0 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSubmit}
              disabled={saving || !hasChanges}
              className="w-full sm:w-auto"
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </div>

        {/* Account Security Section */}
        <div className="bg-gray-2 flex flex-col gap-[24px] items-start pb-[32px] pt-[24px] px-4 md:px-[16px] rounded-[12px] shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] w-full">
          <div className="flex flex-col gap-[12px] items-start w-full">
            <p className="font-manrope font-bold leading-[1.1] text-[20px] text-gray-12">
              Conta e segurança
            </p>
            <p className="font-family-dm-sans font-normal leading-[1.3] text-[16px] text-gray-11 whitespace-pre-wrap">
              Gerencie o e-mail e a senha que você usa para entrar no PódioTicket.
            </p>
          </div>

          <div className="flex flex-wrap gap-[24px_12px] items-center w-full">
            {/* Change Email Button */}
            <button
              onClick={() => openChangeEmailModal()}
              className="border border-gray-6 flex gap-[10px] h-[48px] items-center justify-center overflow-clip px-[12px] py-[16px] rounded-[8px] w-full sm:w-[375px] hover:bg-gray-3 transition-colors"
            >
              <div className="flex flex-1 gap-2 items-center min-w-0">
                <Mail className="size-6 text-gray-12 shrink-0" />
                <p className="font-family-dm-sans font-normal leading-[1.3] text-[16px] text-gray-12 truncate">
                  Deseja alterar seu email?
                </p>
              </div>
              <div className="flex gap-1 items-center justify-end shrink-0">
                <ArrowButton isOpen={false} />
              </div>
            </button>

            {/* Change Password Button */}
            <button
              onClick={handleChangePassword}
              className="border border-gray-6 flex h-[48px] items-center justify-between overflow-clip px-[12px] py-[16px] rounded-[8px] w-full sm:w-[462px] hover:bg-gray-3 transition-colors"
            >
              <div className="flex flex-1 gap-2 items-center min-w-0">
                <Lock className="size-6 text-gray-12 shrink-0" />
                <p className="font-family-dm-sans font-medium leading-[1.3] text-[14px] text-gray-12 text-left truncate">
                  Deseja alterar sua senha?
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-gray-2 flex flex-col gap-[24px] items-start pb-[32px] pt-[24px] px-4 md:px-[16px] rounded-[12px] shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] w-full">
          <TwoFASection
            userEmail={user?.email ?? ""}
            initialEnabled={!!user?.mfaEnabled}
            onToggled={refetchUser}
            variant="organizer"
          />
        </div>

        <ImageUploadWithCrop
          ref={avatarCropRef}
          spec={EVENT_IMAGE_SPECS.organizationLogo}
          outputBaseName="profile-avatar"
          cropShape="round"
          maxFileSizeMb={10}
          accept="image/jpeg,image/jpg,image/png"
          modalTitle="Ajustar foto de perfil"
          onCropped={(file) => pendingAvatar.stageFile(file)}
          onInvalidFile={(msg) => toast.error(msg)}
          onCropFailed={(msg) => toast.error(msg)}
        />
      </div>
    </div>
  );
}
