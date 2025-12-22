"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services";
import toast from "react-hot-toast";
import {
  User,
  Phone,
  Mail,
  Lock,
  Shield,
  ChevronDown,
  Plus,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Checkbox } from "@/components/CheckBox";
import { FlagIcon } from "@/components/Icons/FlagIcon";
import { HeartIcon } from "@/components/Icons/HeartIcon";
import { ArrowButton } from "@/components/ArrowButton";
import { useChangeEmailModal } from "@/stores/modalStore";
import { CPFIcon } from "@/components/Icons/CPFIcon";
import { DateOfBirthPicker } from "@/components/DateOfBirthPicker";
import { getApiClient } from "@/services/base/ApiClient";

export default function UserProfilePage() {
  const { user, refetchUser } = useAuth();
  const { openChangeEmailModal } = useChangeEmailModal();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Initialize formData with user data when available
  const initialFormData = useMemo(
    () => ({
      firstName: (user as any)?.firstName ?? "",
      lastName: (user as any)?.lastName ?? "",
      documentNumber: (user as any)?.documentNumber ?? "",
      dateOfBirth: (user as any)?.dateOfBirth ?? "",
      nationality: (user as any)?.nationality ?? "Brasileira",
      phone: (user as any)?.phone ?? "",
      emergencyPhone: (user as any)?.emergencyPhone ?? "",
      gender: (user as any)?.gender ?? "",
      email: user?.email ?? "",
      currentPassword: "",
      newPassword: "",
    }),
    [user]
  );

  const [formData, setFormData] = useState(initialFormData);

  // Update formData when user data is loaded
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        firstName: (user as any)?.firstName ?? prev.firstName,
        lastName: (user as any)?.lastName ?? prev.lastName,
        documentNumber: (user as any)?.documentNumber ?? prev.documentNumber,
        dateOfBirth: (user as any)?.dateOfBirth ?? prev.dateOfBirth,
        nationality: (user as any)?.nationality ?? prev.nationality,
        phone: (user as any)?.phone ?? prev.phone,
        emergencyPhone: (user as any)?.emergencyPhone ?? prev.emergencyPhone,
        gender: (user as any)?.gender ?? prev.gender,
        email: user?.email ?? prev.email,
        // Don't update passwords
        currentPassword: prev.currentPassword,
        newPassword: prev.newPassword,
      }));
    }
  }, [user]);

  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<"email">("email");
  const [verificationCode, setVerificationCode] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [codeError, setCodeError] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato inválido. Use apenas PNG ou JPEG.");
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      toast.error("Arquivo muito grande. Tamanho máximo: 5MB.");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const response = await userService.uploadAvatar(file);
      toast.success("Foto de perfil atualizada com sucesso!");

      // Refresh user data to get updated avatar URL
      await refetchUser();
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error(
        error?.message || "Erro ao atualizar foto de perfil. Tente novamente."
      );
    } finally {
      setIsUploadingAvatar(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    // TODO: Implement remove avatar endpoint if available
    toast.error("Funcionalidade de remover avatar ainda não implementada.");
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSavePersonalData = () => {
    // TODO: Implement save logic
    console.log("Saving personal data:", formData);
  };

  const handleChangePassword = () => {
    // TODO: Implement password change logic
    console.log("Changing password");
  };

  const handleChangeEmail = () => {
    openChangeEmailModal();
  };

  const handleCodeChange = (index: number, value: string) => {
    // Only allow numbers and limit to 1 character
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    setCodeError(false);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleCodeKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`code-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newCode = pastedData
        .split("")
        .concat(Array(6 - pastedData.length).fill(""));
      setVerificationCode(newCode);
      setCodeError(false);
      // Focus last filled input
      const lastIndex = Math.min(pastedData.length - 1, 5);
      const lastInput = document.getElementById(`code-input-${lastIndex}`);
      lastInput?.focus();
    }
  };

  const handleResendCode = () => {
    // TODO: Implement resend code logic
    console.log("Resending code");
    setVerificationCode(["", "", "", "", "", ""]);
    setCodeError(false);
  };

  const handleConfirmCode = () => {
    const code = verificationCode.join("");
    if (code.length !== 6) {
      setCodeError(true);
      return;
    }
    console.log("Verifying code:", code);
  };

  return (
    <div className="min-h-screen bg-gray-2 pb-32">
      <div className="mx-auto flex max-w-[842px] flex-col items-center justify-center px-5 py-[52px]">
        {/* Profile Card */}
        <div className="w-full rounded-xl bg-gray-2 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)]">
          {/* Header */}
          <div className="flex flex-col gap-6 border-b border-gray-6 px-4 pb-8 pt-6">
            <h1 className="text-[28px] font-extrabold leading-[1.1] text-gray-12">
              Meu perfil
            </h1>

            {/* Profile Picture Section */}
            <div className="flex items-end gap-4">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-full">
                <Image
                  src={
                    user?.avatarUrl
                      ? `${getApiClient().getBaseURL()}${user?.avatarUrl}`
                      : "/images/default-avatar.png"
                  }
                  alt="Profile"
                  fill
                  className="object-cover"
                  onError={(e) => {
                    e.currentTarget.src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Ccircle cx='48' cy='48' r='48' fill='%23d9d9d9'/%3E%3C/svg%3E";
                  }}
                />
              </div>
              <div className="flex flex-1 flex-col gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={isUploadingAvatar}
                />
                <div className="flex gap-[17px]">
                  <Button
                    variant="default"
                    className="h-10 gap-2 px-5"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                  >
                    <Plus className="size-5" />
                    {isUploadingAvatar ? "Enviando..." : "Alterar imagem"}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 text-gray-11 gap-2 px-5"
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar || !user?.avatarUrl}
                  >
                    Remover imagem
                  </Button>
                </div>
                <p className="text-sm text-gray-11">
                  Suportamos imagens em PNGs, JPEGs até 5MB
                </p>
              </div>
            </div>
          </div>

          {/* Personal Data Section */}
          <div className="flex flex-col gap-8 border-b border-gray-6 px-4 py-8">
            <div className="flex flex-col gap-3">
              <h2 className="text-xl font-bold leading-[1.1] text-gray-12">
                Dados pessoais
              </h2>
              <p className="text-base text-gray-11">
                Usamos esses dados nas inscrições de eventos. Preencha
                exatamente como está no seu documento.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Name */}
              <div className="flex min-w-[283px] flex-1 flex-col gap-2">
                <label className="text-base text-gray-12">Nome</label>
                <div className="flex h-12 items-center gap-2.5 rounded-lg border border-gray-6 bg-transparent px-3">
                  <User className="size-5 shrink-0 text-gray-11" />
                  <Input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Nome completo"
                    className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div className="flex min-w-[283px] flex-1 flex-col gap-2">
                <label className="text-base text-gray-12">
                  Data de nascimento
                </label>
                <DateOfBirthPicker
                  value={formData.dateOfBirth}
                  onChange={(value) =>
                    setFormData((prev) => ({ ...prev, dateOfBirth: value }))
                  }
                  placeholder="Selecione sua data de nascimento"
                />
              </div>

              {/* Nationality */}
              <div className="relative flex min-w-[283px] flex-1 flex-col gap-2">
                <label className="text-base text-gray-12">Nacionalidade</label>
                <button
                  type="button"
                  onClick={() =>
                    setShowNationalityDropdown(!showNationalityDropdown)
                  }
                  className="flex h-12 items-center justify-between rounded-lg border border-gray-7 bg-transparent px-3"
                >
                  <div className="flex items-center gap-2.5">
                    <FlagIcon className="size-5 shrink-0 text-gray-11" />
                    <span className="text-base text-gray-11">
                      {formData.nationality}
                    </span>
                  </div>
                  <ArrowButton isOpen={showNationalityDropdown} />
                </button>
                {showNationalityDropdown && (
                  <div className="absolute top-[76px] z-10 w-full rounded-lg border border-gray-6 bg-gray-1 shadow-[0px_2px_4px_0px_rgba(0,0,0,0.25)]">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          nationality: "Brasileira",
                        }));
                        setShowNationalityDropdown(false);
                      }}
                      className="flex w-full items-center gap-2 border-b border-gray-4 px-3 py-4 text-left text-base text-gray-12 hover:bg-gray-2"
                    >
                      Brasileira
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          nationality: "Outra",
                        }));
                        setShowNationalityDropdown(false);
                      }}
                      className="flex w-full items-center gap-2 border-b border-gray-4 px-3 py-4 text-left text-base text-gray-12 hover:bg-gray-2"
                    >
                      Outra
                    </button>
                  </div>
                )}
              </div>

              {/* Phone */}
              <div className="flex min-w-[283px] flex-1 flex-col gap-2">
                <label className="text-base text-gray-12">Telefone</label>
                <div className="flex h-12 items-center gap-2.5 rounded-lg border border-gray-6 bg-transparent px-3">
                  <Phone className="size-5 shrink-0 text-gray-11" />
                  <Input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="(00) 00000-0000"
                    className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="flex min-w-[283px] flex-1 flex-col gap-2">
                <label className="text-base text-gray-12">CPF</label>
                <div className="flex h-12 items-center gap-2.5 rounded-lg border border-gray-6 bg-transparent px-3">
                  <CPFIcon className="size-5 shrink-0 text-gray-11" />
                  <Input
                    type="text"
                    name="documentNumber"
                    value={formData.documentNumber}
                    onChange={handleInputChange}
                    placeholder="000.000.000-00"
                    className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>

              {/* Gender */}
              <div className="relative flex min-w-[283px] flex-1 flex-col gap-2">
                <label className="text-base text-gray-12">Sexo</label>
                <button
                  type="button"
                  onClick={() => setShowGenderDropdown(!showGenderDropdown)}
                  className="flex h-12 items-center justify-between rounded-lg border border-gray-7 bg-transparent px-3"
                >
                  <div className="flex items-center gap-2.5">
                    <HeartIcon className="size-5 shrink-0 text-gray-11" />
                    <span className="text-base text-gray-11">
                      {formData.gender || "Selecione"}
                    </span>
                  </div>
                  <ArrowButton isOpen={showGenderDropdown} />
                </button>
                {showGenderDropdown && (
                  <div className="absolute top-[76px] z-10 w-full rounded-lg border border-gray-6 bg-gray-1 shadow-[0px_2px_4px_0px_rgba(0,0,0,0.25)]">
                    {[
                      "Masculino",
                      "Feminino",
                      "Outro",
                      "Prefiro não informar",
                    ].map((gender) => (
                      <button
                        key={gender}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            gender,
                          }));
                          setShowGenderDropdown(false);
                        }}
                        className="flex w-full items-center gap-2 border-b border-gray-4 px-3 py-4 text-left text-base text-gray-12 hover:bg-gray-2 last:border-0"
                      >
                        {gender}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex min-w-[283px] w-full flex-1 flex-col gap-2">
                <label className="text-base text-gray-12">
                  Telefone de emergência
                </label>
                <div className="flex h-12 items-center gap-2.5 rounded-lg border border-gray-6 bg-transparent px-3">
                  <Phone className="size-5 shrink-0 text-gray-11" />
                  <Input
                    type="tel"
                    name="emergencyPhone"
                    value={formData.emergencyPhone}
                    onChange={handleInputChange}
                    placeholder="Opcional"
                    className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="default"
                className="h-12 gap-2 px-5"
                onClick={handleSavePersonalData}
              >
                Salvar alterações
              </Button>
            </div>
          </div>

          {/* Change Password Section */}
          <div className="flex flex-col gap-8 border-b border-gray-6 px-4 py-8">
            <h2 className="text-xl font-bold leading-[1.1] text-gray-12">
              Alterar senha
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {/* Current Password */}
              <div className="flex min-w-[269px] flex-1 flex-col gap-2">
                <label className="text-base text-gray-12">Senha atual</label>
                <div className="flex h-12 items-center gap-2.5 rounded-lg border border-gray-6 bg-transparent px-3">
                  <Lock className="size-5 shrink-0 text-gray-11" />
                  <Input
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    placeholder="Digite sua senha atual"
                    className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>

              {/* New Password */}
              <div className="flex min-w-[269px] flex-1 flex-col gap-2">
                <label className="text-base text-gray-12">
                  Criar uma senha
                </label>
                <div className="flex h-12 items-center gap-2.5 rounded-lg border border-gray-6 bg-transparent px-3">
                  <Lock className="size-5 shrink-0 text-gray-11" />
                  <Input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    placeholder="Digite uma senha"
                    className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="flex min-w-[269px] flex-1 flex-col gap-2">
                <label className="text-base text-gray-12">
                  Criar uma senha
                </label>
                <div className="flex h-12 items-center gap-2.5 rounded-lg border border-gray-6 bg-transparent px-3">
                  <Lock className="size-5 shrink-0 text-gray-11" />
                  <Input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    placeholder="Digite uma senha"
                    className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-left text-base text-gray-11 hover:text-gray-12"
                onClick={() => {
                  // TODO: Implement forgot password
                  console.log("Forgot password");
                }}
              >
                Esqueci minha senha
              </button>
              <div />
              <Button
                variant="default"
                className="h-12 gap-2 px-5"
                onClick={handleChangePassword}
              >
                Confirmar
              </Button>
            </div>
          </div>

          {/* Account and Security Section */}
          <div className="flex flex-col gap-8 border-b border-gray-6 px-4 py-8">
            <div className="flex flex-col gap-3">
              <h2 className="text-xl font-bold leading-[1.1] text-gray-12">
                Conta e segurança
              </h2>
              <p className="text-base text-gray-11">
                Gerencie o e-mail e a senha que você usa para entrar no
                PódioTicket.
              </p>
            </div>

            <button
              type="button"
              onClick={handleChangeEmail}
              className="flex h-12 w-full max-w-[400px] items-center justify-between gap-2.5 rounded-lg border border-gray-6 bg-transparent px-3"
            >
              <div className="flex items-center gap-2.5">
                <Mail className="size-6 shrink-0 text-gray-12" />
                <span className="text-base text-gray-12">
                  Deseja alterar seu email?
                </span>
              </div>
              <ChevronDown className="size-5 shrink-0 -rotate-90 text-gray-12" />
            </button>
          </div>

          {/* Security Section */}
          <div className="flex flex-col gap-10 border-t border-gray-6 px-4 py-8">
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-bold leading-[1.1] text-gray-12">
                Segurança
              </h2>

              <button
                type="button"
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                className="flex h-12 w-full max-w-[400px] items-center justify-between gap-2.5 rounded-lg border border-gray-6 bg-transparent px-3"
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="size-6 shrink-0 text-gray-12" />
                  <span className="text-base text-gray-12">
                    Ligar dois fatores de segurança
                  </span>
                </div>
                <div
                  className={cn(
                    "relative h-5 w-[37px] rounded-full transition-colors",
                    twoFactorEnabled ? "bg-primary-11" : "bg-gray-6"
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                      twoFactorEnabled
                        ? "translate-x-[17px]"
                        : "translate-x-0.5"
                    )}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
