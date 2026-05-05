"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useAuth } from "@/hooks/useAuth";
import { organizerService, userService } from "@/services";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { OrganizerSidebar } from "@/components/Organizer/OrganizerSidebar";
import { useChangeEmailModal, useChangePasswordModal } from "@/stores/modalStore";
import { Download, Mail, Lock, ShieldCheck, User, ArrowRight, Plus } from "lucide-react";
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
import { cn } from "@/utils/cn";

export default function OrganizerSettingsPage() {
  const router = useRouter();
  const orgNav = useOrganizerNavigate();
  const { isAuthenticated, isLoading: authLoading, user, refetchUser } = useAuth();
  const { openChangeEmailModal } = useChangeEmailModal();
  const { openChangePasswordModal } = useChangePasswordModal();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FAInput, setShow2FAInput] = useState(false);
  const [pendingAction2FA, setPendingAction2FA] = useState<'enable' | 'disable' | null>(null);
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
  const [code2FAError, setCode2FAError] = useState('');
  const [sending2FACode, setSending2FACode] = useState(false);
  const [confirming2FA, setConfirming2FA] = useState(false);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const avatarCropRef = useRef<ImageUploadWithCropRef>(null);
  const [formData, setFormData] = useState({
    name: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const userFullName = user ? `${user?.firstName} ${user?.lastName ?? ""}`.trim() : "";
  const hasChanges = formData.name !== userFullName;

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

  const uploadProfileAvatar = async (file: File) => {
    setUploadingImage(true);
    try {
      await userService.uploadAvatar(file);
      toast.success("Imagem atualizada com sucesso!");
      window.location.reload();
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error("Erro ao fazer upload da imagem");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    setUploadingImage(true);
    try {
      await userService.removeAvatar();
      await refetchUser();
      toast.success("Imagem removida com sucesso!");
    } catch (error: any) {
      console.error("Error removing image:", error);
      toast.error(error?.message || "Erro ao remover imagem.");
    } finally {
      setUploadingImage(false);
    }
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
      const parts = formData.name.trim().split(/\s+/);
      const firstName = parts[0] ?? "";
      const lastName = parts.slice(1).join(" ") || "";
      await userService.updateUser(user.id, { firstName, lastName });
      await refetchUser();

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

  // Sincroniza estado do 2FA com o perfil carregado
  useEffect(() => {
    if (user) {
      setTwoFactorEnabled(!!user.mfaEnabled);
    }
  }, [user]);

  const handleToggle2FA = async () => {
    const action = twoFactorEnabled ? 'disable' : 'enable';
    setSending2FACode(true);
    setCode2FAError('');
    try {
      await userService.send2FACode();
      setPendingAction2FA(action);
      setShow2FAInput(true);
      setCodeDigits(['', '', '', '', '', '']);
      setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao enviar código. Tente novamente.');
    } finally {
      setSending2FACode(false);
    }
  };

  const handleResend2FACode = async () => {
    setSending2FACode(true);
    setCode2FAError('');
    try {
      await userService.send2FACode();
      toast.success('Novo código enviado para o seu e-mail.');
      setCodeDigits(['', '', '', '', '', '']);
      setTimeout(() => codeInputRefs.current[0]?.focus(), 100);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao reenviar código.');
    } finally {
      setSending2FACode(false);
    }
  };

  const handleConfirm2FA = async () => {
    if (!pendingAction2FA) return;
    const code = codeDigits.join('');
    if (code.length < 6) {
      setCode2FAError('Preencha todos os 6 dígitos do código.');
      return;
    }
    setConfirming2FA(true);
    setCode2FAError('');
    try {
      if (pendingAction2FA === 'enable') {
        await userService.enable2FA(code);
        setTwoFactorEnabled(true);
        toast.success('2FA ativado com sucesso!');
      } else {
        await userService.disable2FA(code);
        setTwoFactorEnabled(false);
        toast.success('2FA desativado com sucesso!');
      }
      setShow2FAInput(false);
      setPendingAction2FA(null);
      setCodeDigits(['', '', '', '', '', '']);
      // Sincroniza o perfil no contexto para refletir mfaEnabled atualizado
      await refetchUser();
    } catch {
      setCode2FAError('Código incorreto ou expirado. Tente novamente ou reenvie um novo código.');
    } finally {
      setConfirming2FA(false);
    }
  };

  const handleCodeDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...codeDigits];
    newDigits[index] = digit;
    setCodeDigits(newDigits);
    setCode2FAError('');
    if (digit && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      void handleConfirm2FA();
    }
  };

  const handleCodeDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = Array(6).fill('');
    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
    setCodeDigits(newDigits);
    const nextEmpty = Math.min(pasted.length, 5);
    codeInputRefs.current[nextEmpty]?.focus();
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
                  className="size-full rounded-full"
                  letterClassName="text-2xl font-semibold"
                />
              </div>
              <div className="flex flex-1 flex-col gap-[16px] items-start justify-center">
                <div className="flex gap-[17px] items-center relative shrink-0">
                  <Button
                    onClick={() => avatarCropRef.current?.open()}
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


              </div>

              {/* Save Button */}
              <Button
                onClick={handleSubmit}
                disabled={saving || !hasChanges}
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

              {/* Toggle 2FA */}
              <button
                onClick={!sending2FACode && !confirming2FA ? handleToggle2FA : undefined}
                disabled={sending2FACode || confirming2FA}
                className="border border-gray-6 flex gap-[10px] h-[44px] items-center justify-center overflow-clip px-[12px] py-[16px] relative rounded-[8px] shrink-0 w-[462px] hover:bg-gray-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="flex flex-1 gap-2 items-center relative shrink-0">
                  <ShieldCheck className="size-6 text-gray-12 shrink-0" />
                  <p className="flex-1 font-family-dm-sans font-medium leading-[1.3] relative shrink-0 text-[14px] text-gray-12 text-left whitespace-pre-wrap">
                    {sending2FACode ? 'Enviando código...' : 'Ligar dois fatores de segurança'}
                  </p>
                </div>
                <div className="flex gap-1 h-[20px] items-center justify-center relative rounded-[1.667px] shrink-0">
                  <div className={cn("h-[20px] relative shrink-0 w-[37px] rounded-full transition-all", twoFactorEnabled ? "bg-primary-11" : "bg-gray-6")}>
                    <div className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-all", twoFactorEnabled ? "right-0.5" : "left-0.5")} />
                  </div>
                </div>
              </button>

              {/* Painel de confirmação com código */}
              {show2FAInput && (
                <div className="flex flex-col gap-6 w-full max-w-[462px] rounded-[8px] border border-gray-6 bg-gray-1 p-6">
                  <p className="font-family-dm-sans text-[14px] text-gray-11">
                    Digite o código de 6 dígitos enviado para o seu e-mail <strong className="text-gray-12">{user?.email}</strong>.
                  </p>

                  {/* 6 caixas de código */}
                  <div className="flex gap-2 items-center">
                    {codeDigits.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { codeInputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeDigitChange(i, e.target.value)}
                        onKeyDown={(e) => handleCodeDigitKeyDown(i, e)}
                        onPaste={i === 0 ? handleCodeDigitPaste : undefined}
                        className={cn(
                          "w-[52px] h-[64px] text-center text-2xl font-extrabold font-manrope rounded-[8px] border-2 bg-gray-2 outline-none transition-colors",
                          code2FAError ? "border-red-500" : "border-gray-6 focus:border-primary-11",
                        )}
                      />
                    ))}
                  </div>

                  {/* Mensagem de erro */}
                  {code2FAError && (
                    <p className="font-family-dm-sans text-[14px] text-red-500 -mt-2">
                      {code2FAError}
                    </p>
                  )}

                  {/* Botões de ação */}
                  <div className="flex flex-wrap gap-3 items-center">
                    <button
                      type="button"
                      onClick={handleResend2FACode}
                      disabled={sending2FACode || confirming2FA}
                      className="h-[44px] px-6 rounded-[8px] border border-gray-6 font-manrope font-bold text-[14px] text-gray-12 bg-transparent hover:bg-gray-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {sending2FACode ? 'Reenviando...' : 'Reenviar código'}
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirm2FA}
                      disabled={sending2FACode || confirming2FA || codeDigits.join('').length < 6}
                      className="h-[44px] px-6 rounded-[8px] bg-primary-11 font-manrope font-bold text-[14px] text-primary-2 hover:bg-primary-10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {confirming2FA ? 'Confirmando...' : 'Confirmar código'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShow2FAInput(false); setPendingAction2FA(null); setCodeDigits(['', '', '', '', '', '']); setCode2FAError(''); }}
                      className="font-family-dm-sans text-[14px] text-gray-11 hover:text-gray-12 underline"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <ImageUploadWithCrop
            ref={avatarCropRef}
            spec={EVENT_IMAGE_SPECS.organizationLogo}
            outputBaseName="profile-avatar"
            cropShape="round"
            maxFileSizeMb={10}
            accept="image/jpeg,image/jpg,image/png"
            modalTitle="Ajustar foto de perfil"
            onCropped={(file) => void uploadProfileAvatar(file)}
            onInvalidFile={(msg) => toast.error(msg)}
            onCropFailed={(msg) => toast.error(msg)}
          />
        </div>
      </div>
    </div>
  );
}
