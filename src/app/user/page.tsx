"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useAuth } from "@/hooks/useAuth";
import {
  User,
  Calendar,
  Phone,
  Mail,
  Lock,
  Shield,
  ChevronDown,
  Plus,
  Download,
  Check,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Checkbox } from "@/components/CheckBox";

export default function UserProfilePage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    firstName: (user as any)?.firstName ?? "",
    lastName: (user as any)?.lastName ?? "",
    documentNumber: (user as any)?.documentNumber ?? "",
    dateOfBirth: (user as any)?.dateOfBirth ?? "",
    nationality: "Brasileira",
    phone: (user as any)?.phone ?? "",
    emergencyPhone: "",
    gender: (user as any)?.gender ?? "",
    email: user?.email ?? "",
    currentPassword: "",
    newPassword: "",
  });

  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<
    "sms" | "authenticator"
  >("sms");
  const [verificationCode, setVerificationCode] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [codeError, setCodeError] = useState(false);

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
    // TODO: Implement email change logic
    console.log("Changing email");
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
                  src="/images/default-avatar.png"
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
                <div className="flex gap-[17px]">
                  <Button
                    variant="default"
                    className="h-10 gap-2 px-5"
                    onClick={() => {
                      // TODO: Implement image upload
                      console.log("Change image");
                    }}
                  >
                    <Plus className="size-5" />
                    Alterar imagem
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 gap-2 px-5"
                    onClick={() => {
                      // TODO: Implement image removal
                      console.log("Remove image");
                    }}
                  >
                    <Plus className="size-5" />
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

            <div className="flex flex-wrap gap-3">
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
                <div className="flex h-12 items-center gap-2.5 rounded-lg border border-gray-6 bg-transparent px-3">
                  <Calendar className="size-5 shrink-0 text-gray-11" />
                  <Input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  />
                </div>
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
                    <div className="size-5 shrink-0 rounded-sm border border-gray-11" />
                    <span className="text-base text-gray-11">
                      {formData.nationality}
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-6 shrink-0 text-gray-11 transition-transform",
                      showNationalityDropdown && "rotate-180"
                    )}
                  />
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

              {/* CPF */}
              <div className="flex min-w-[283px] flex-1 flex-col gap-2">
                <label className="text-base text-gray-12">CPF</label>
                <div className="flex h-12 items-center gap-2.5 rounded-lg border border-gray-6 bg-transparent px-3">
                  <div className="size-5 shrink-0" />
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

              {/* Emergency Phone */}
              <div className="flex min-w-[283px] flex-1 flex-col gap-2">
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

              {/* Gender */}
              <div className="relative flex min-w-[283px] flex-1 flex-col gap-2">
                <label className="text-base text-gray-12">Sexo</label>
                <button
                  type="button"
                  onClick={() => setShowGenderDropdown(!showGenderDropdown)}
                  className="flex h-12 items-center justify-between rounded-lg border border-gray-7 bg-transparent px-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-5 shrink-0" />
                    <span className="text-base text-gray-11">
                      {formData.gender || "Selecione"}
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-6 shrink-0 text-gray-11 transition-transform",
                      showGenderDropdown && "rotate-180"
                    )}
                  />
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

            <div className="flex flex-wrap gap-3">
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
            </div>

            <div className="flex items-center justify-between">
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

            {/* Method Selection */}
            {twoFactorEnabled && (
              <>
                <div className="flex flex-col gap-3">
                  <p className="text-base font-medium text-gray-12">
                    Selecione a forma que deseja receber a mensagem do código
                  </p>
                  <div className="flex gap-8">
                    <button
                      type="button"
                      onClick={() => setTwoFactorMethod("sms")}
                      className="flex items-center gap-2"
                    >
                      <Checkbox
                        checked={twoFactorMethod === "sms"}
                        onCheckedChange={() => setTwoFactorMethod("sms")}
                      />
                      <span className="text-base text-gray-12">Via SMS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTwoFactorMethod("authenticator")}
                      className="flex items-center gap-2"
                    >
                      <Checkbox
                        checked={twoFactorMethod === "authenticator"}
                        onCheckedChange={() =>
                          setTwoFactorMethod("authenticator")
                        }
                      />
                      <span className="text-base text-gray-12">
                        Google Authenticator
                      </span>
                    </button>
                  </div>
                </div>

                {/* Code Input Section */}
                <div className="flex flex-col gap-7">
                  <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold leading-[1.1] text-gray-12">
                      Informe o código de segurança
                    </h3>
                    <p className="text-base font-medium text-gray-11">
                      Para continuar com a verificação em duas etapas em nossa
                      plataforma, por favor, insira abaixo o código recebido
                      através de SMS em seu dispositivo móvel
                    </p>
                    <p className="text-base font-medium text-gray-11">
                      <span className="font-bold text-yellow-11">ATENÇÃO!</span>
                      {` Observe se o número cadastrado não tem bloqueio de recebimento de SMS.`}
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex gap-2">
                      {verificationCode.map((digit, index) => (
                        <input
                          key={index}
                          id={`code-input-${index}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) =>
                            handleCodeChange(index, e.target.value)
                          }
                          onKeyDown={(e) => handleCodeKeyDown(index, e)}
                          onPaste={handlePaste}
                          className={cn(
                            "size-[72.67px] rounded-lg border-2 bg-gray-2 text-center text-[32px] font-extrabold leading-[1.1] text-gray-11 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-11/50",
                            codeError
                              ? "border-red-10"
                              : "border-gray-6 focus:border-primary-11"
                          )}
                        />
                      ))}
                    </div>
                    {codeError && (
                      <p className="text-base text-red-10 text-center">
                        Código incorreto ou expirado. Tente novamente ou reenvie
                        um novo código
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      className="h-12 px-8 text-gray-12 border border-gray-6"
                      onClick={handleResendCode}
                    >
                      Reenviar código
                    </Button>
                    <Button
                      variant="default"
                      className="h-12 px-8"
                      onClick={handleConfirmCode}
                    >
                      Confirmar código
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
