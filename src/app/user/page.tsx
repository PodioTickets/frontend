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
import { getAvatarUrl } from "@/utils/avatar";
import { DatePickerWithConfirm } from "@/components/DateOfBirthPicker/DatePickerWithConfirm";

// Função para converter gênero do backend para a tela
const formatGenderFromBackend = (
  backendGender: string | null | undefined
): string => {
  console.log("🔍 formatGenderFromBackend chamado com:", backendGender);
  
  if (!backendGender || backendGender.trim() === "") {
    console.log("❌ Valor vazio, retornando string vazia");
    return "";
  }

  const genderUpper = backendGender.toUpperCase().trim();
  console.log("🔍 genderUpper:", genderUpper);

  switch (genderUpper) {
    case "MALE":
      console.log("✅ Convertendo MALE para Masculino");
      return "Masculino";
    case "FEMALE":
      console.log("✅ Convertendo FEMALE para Feminino");
      return "Feminino";
    case "OTHER":
      console.log("✅ Convertendo OTHER para Outro");
      return "Outro";
    case "PREFER_NOT_TO_SAY":
      console.log("✅ Convertendo PREFER_NOT_TO_SAY para Prefiro não informar");
      return "Prefiro não informar";
    default:
      // Se já estiver no formato da tela, retorna como está
      const genderLower = backendGender.toLowerCase().trim();
      console.log("⚠️ Valor não reconhecido no switch, tentando lowercase:", genderLower);
      if (genderLower === "masculino") return "Masculino";
      if (genderLower === "feminino") return "Feminino";
      if (genderLower === "outro") return "Outro";
      if (
        genderLower === "prefiro não informar" ||
        genderLower === "prefiro não dizer" ||
        genderLower === "prefiro-nao-dizer" ||
        genderLower === "prefiro-nao-informar"
      ) {
        return "Prefiro não informar";
      }
      // Se não reconhecer, retorna o valor original (pode ser um valor não mapeado)
      console.log("❌ Valor não reconhecido, retornando original:", backendGender);
      return backendGender;
  }
};

// Função para converter gênero da tela para o backend
const formatGenderToBackend = (
  displayGender: string | null | undefined
): string => {
  if (!displayGender) return "";

  const genderLower = displayGender.toLowerCase().trim();

  // Se já estiver no formato do backend, retorna como está
  if (
    genderLower === "male" ||
    genderLower === "female" ||
    genderLower === "other" ||
    genderLower === "prefer_not_to_say"
  ) {
    return displayGender.toUpperCase();
  }

  // Converte do formato da tela para o formato do backend
  if (genderLower === "masculino") {
    return "MALE";
  } else if (genderLower === "feminino") {
    return "FEMALE";
  } else if (genderLower === "outro") {
    return "OTHER";
  } else if (
    genderLower === "prefiro não informar" ||
    genderLower === "prefiro não dizer" ||
    genderLower === "prefiro-nao-dizer" ||
    genderLower === "prefiro-nao-informar"
  ) {
    return "PREFER_NOT_TO_SAY";
  }

  return displayGender;
};

export default function UserProfilePage() {
  const { user, refetchUser } = useAuth();
  const { openChangeEmailModal } = useChangeEmailModal();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Mask functions (declared before useMemo to use in it)
  const maskCPFForInit = (value: string) => {
    if (!value) return "";
    const numbers = value.replace(/\D/g, "");
    if (numbers.length === 0) return "";
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6)
      return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9)
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(
        6
      )}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(
      6,
      9
    )}-${numbers.slice(9, 11)}`;
  };

  const maskPhoneForInit = (value: string) => {
    if (!value) return "";
    const numbers = value.replace(/\D/g, "");
    if (numbers.length === 0) return "";
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(
      7,
      11
    )}`;
  };

  // Initialize formData with user data when available
  const initialFormData = useMemo(
    () => ({
      firstName: (user as any)?.firstName ?? "",
      lastName: (user as any)?.lastName ?? "",
      documentNumber: maskCPFForInit((user as any)?.documentNumber || ""),
      dateOfBirth: (user as any)?.dateOfBirth ?? "",
      nationality:
        (user as any)?.nationality || (user as any)?.country || "Brasileira",
      phone: maskPhoneForInit((user as any)?.phone || ""),
      emergencyPhone: maskPhoneForInit((user as any)?.emergencyPhone || ""),
      gender:
        formatGenderFromBackend((user as any)?.gender || (user as any)?.sex) ||
        "",
      email: user?.email ?? "",
      currentPassword: "",
      newPassword: "",
    }),
    [user]
  );

  const [formData, setFormData] = useState(initialFormData);

  // Garantir que o gênero formatado seja sempre usado
  // Usa o valor do user diretamente se disponível, senão usa o formData
  const displayGender = useMemo(() => {
    const userGender = (user as any)?.gender;
    const userSex = (user as any)?.sex;
    const formDataGender = formData.gender;
    
    console.log("🔍 displayGender useMemo:", {
      userGender,
      userSex,
      formDataGender,
      user: user ? "existe" : "não existe",
    });
    
    const genderValue = userGender || userSex || formDataGender;
    console.log("🔍 genderValue escolhido:", genderValue);
    
    const formatted = formatGenderFromBackend(genderValue);
    console.log("🔍 formatted result:", formatted);
    
    return formatted;
  }, [formData.gender, user]);

  // Update formData when user data is loaded
  useEffect(() => {
    if (user) {
      // Formata CPF e telefones ao carregar do backend
      const rawDocumentNumber = (user as any)?.documentNumber || "";
      const rawPhone = (user as any)?.phone || "";
      const rawEmergencyPhone = (user as any)?.emergencyPhone || "";

      setFormData((prev) => ({
        ...prev,
        firstName: (user as any)?.firstName ?? prev.firstName,
        lastName: (user as any)?.lastName ?? prev.lastName,
        documentNumber: rawDocumentNumber
          ? maskCPFForInit(rawDocumentNumber)
          : prev.documentNumber,
        dateOfBirth: (user as any)?.dateOfBirth ?? prev.dateOfBirth,
        nationality:
          (user as any)?.nationality ||
          (user as any)?.country ||
          prev.nationality,
        phone: rawPhone ? maskPhoneForInit(rawPhone) : prev.phone,
        emergencyPhone: rawEmergencyPhone
          ? maskPhoneForInit(rawEmergencyPhone)
          : prev.emergencyPhone,
        gender: (() => {
          const userGender = (user as any)?.gender;
          const userSex = (user as any)?.sex;
          const genderValue = userGender || userSex;
          
          console.log("🔍 useEffect atualizando gender:", {
            userGender,
            userSex,
            genderValue,
            prevGender: prev.gender,
          });
          
          if (genderValue) {
            const formatted = formatGenderFromBackend(genderValue);
            console.log("🔍 gender formatado no useEffect:", formatted);
            return formatted;
          }
          return prev.gender;
        })(),
        email: user?.email ?? prev.email,
        currentPassword: prev.currentPassword,
        newPassword: prev.newPassword,
      }));
    }
  }, [user]);

  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato inválido. Use apenas PNG ou JPEG.");
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      toast.error("Arquivo muito grande. Tamanho máximo: 10MB.");
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

  // Mask functions
  const maskCPF = (value: string) => {
    if (!value) return "";
    // Se já está formatado, retorna como está
    if (value.includes(".") || value.includes("-")) {
      // Remove formatação e reaplica para garantir consistência
      const numbers = value.replace(/\D/g, "");
      if (numbers.length === 0) return "";
      if (numbers.length <= 3) return numbers;
      if (numbers.length <= 6)
        return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
      if (numbers.length <= 9)
        return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(
          6
        )}`;
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(
        6,
        9
      )}-${numbers.slice(9, 11)}`;
    }
    // Se não está formatado, aplica máscara
    const numbers = value.replace(/\D/g, "");
    if (numbers.length === 0) return "";
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6)
      return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9)
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(
        6
      )}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(
      6,
      9
    )}-${numbers.slice(9, 11)}`;
  };

  const maskPhone = (value: string) => {
    if (!value) return "";
    // Se já está formatado, retorna como está
    if (value.includes("(") || value.includes(")")) {
      // Remove formatação e reaplica para garantir consistência
      const numbers = value.replace(/\D/g, "");
      if (numbers.length === 0) return "";
      if (numbers.length <= 2) return numbers;
      if (numbers.length <= 7)
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(
        7,
        11
      )}`;
    }
    // Se não está formatado, aplica máscara
    const numbers = value.replace(/\D/g, "");
    if (numbers.length === 0) return "";
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(
      7,
      11
    )}`;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Aplica máscara para CPF e telefones
    let processedValue = value;
    if (name === "documentNumber") {
      processedValue = maskCPF(value);
    } else if (name === "phone" || name === "emergencyPhone") {
      processedValue = maskPhone(value);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));
  };

  const handleSavePersonalData = async () => {
    if (!user) return;

    try {
      // Prepara os dados para atualização
      const updateData: any = {};

      // Parse nome completo em firstName e lastName
      const fullName = `${formData.firstName || ""} ${
        formData.lastName || ""
      }`.trim();
      if (fullName) {
        const nameParts = fullName.split(" ");
        if (nameParts.length > 0) {
          updateData.firstName = nameParts[0];
          updateData.lastName = nameParts.slice(1).join(" ") || "";
        }
      }

      if (formData.documentNumber) {
        updateData.documentNumber = formData.documentNumber.replace(/\D/g, "");
        updateData.documentType = "CPF";
      }

      if (formData.dateOfBirth) {
        updateData.dateOfBirth = formData.dateOfBirth;
      }

      if (formData.nationality) {
        updateData.country = formData.nationality;
      }

      if (formData.phone) {
        updateData.phone = formData.phone.replace(/\D/g, "");
      }

      if (formData.emergencyPhone) {
        updateData.emergencyPhone = formData.emergencyPhone.replace(/\D/g, "");
      }

      if (formData.gender) {
        // Converter do formato da tela para o formato do backend
        updateData.gender = formatGenderToBackend(formData.gender);
      }

      await userService.updateUser(user.id, updateData);
      await refetchUser();

      toast.success("Dados atualizados com sucesso!");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(
        error?.message || "Erro ao atualizar dados. Tente novamente."
      );
    }
  };

  const handleChangePassword = () => {
    // TODO: Implement password change logic
    console.log("Changing password");
  };

  const handleChangeEmail = () => {
    openChangeEmailModal();
  };

  return (
    <div className="min-h-screen bg-gray-2 md:pb-32">
      <div className="mx-auto flex max-w-[842px] flex-col items-center justify-center px-4 py-10 md:px-5 md:py-[52px]">
        {/* Profile Card */}
        <div className="w-full rounded-xl bg-gray-1 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)]">
          {/* Header */}
          <div className="flex flex-col gap-6 border-b border-gray-6 px-4 pb-8 pt-6">
            {/* Mobile: Centered title */}
            <div className="flex items-center justify-center px-4 py-0 md:hidden">
              <h1 className="text-2xl font-extrabold leading-[1.1] text-gray-12 font-manrope">
                Meu perfil
              </h1>
            </div>
            {/* Desktop: Left aligned title */}
            <h1 className="hidden md:block text-[28px] font-extrabold leading-[1.1] text-gray-12">
              Meu perfil
            </h1>

            {/* Profile Picture Section */}
            <div className="flex flex-col gap-6 items-center px-4 py-0 md:flex-row md:items-end md:gap-4 md:px-0">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-full">
                <Image
                  src={getAvatarUrl(user?.avatarUrl)}
                  alt="Profile"
                  fill
                  className="object-cover"
                  onError={(e) => {
                    e.currentTarget.src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Ccircle cx='48' cy='48' r='48' fill='%23d9d9d9'/%3E%3C/svg%3E";
                  }}
                />
              </div>
              <div className="flex flex-col gap-4 items-start justify-center w-full md:flex-1 md:items-start">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={isUploadingAvatar}
                />
                {/* Mobile: Column layout */}
                <div className="flex flex-col gap-3 items-start w-full md:hidden">
                  <Button
                    variant="default"
                    className="w-full h-11 gap-2 px-5 bg-primary-11 text-primary-2 hover:bg-primary-10 font-bold text-base font-manrope"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                  >
                    <Plus className="size-5" />
                    {isUploadingAvatar ? "Enviando..." : "Alterar imagem"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-11 gap-2 px-5 text-gray-12 border-[1.5px] border-gray-6 font-bold text-base font-manrope"
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar || !user?.avatarUrl}
                  >
                    Remover imagem
                  </Button>
                </div>
                {/* Desktop: Row layout */}
                <div className="hidden md:flex gap-[17px]">
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
                <p className="text-sm text-gray-11 font-dm-sans md:text-sm">
                  Suportamos imagens em PNGs, JPEGs até 10MB
                </p>
              </div>
            </div>
          </div>

          {/* Personal Data Section */}
          <div className="flex flex-col gap-8 border-b border-gray-6 px-4 py-8 md:gap-8">
            {/* Mobile: Left aligned */}
            <div className="flex flex-col gap-3 items-start w-full md:flex-col md:gap-3">
              <h2 className="text-lg font-bold leading-[1.1] text-gray-12 font-manrope md:text-xl md:font-bold">
                Dados pessoais
              </h2>
              <p className="text-sm text-gray-11 font-dm-sans md:text-base">
                Usamos esses dados nas inscrições de eventos. Preencha
                exatamente como está no seu documento.
              </p>
            </div>

            <div className="flex flex-wrap gap-6 items-start w-full md:grid md:grid-cols-2 md:gap-3">
              {/* Name */}
              <div className="flex flex-1 flex-col gap-2 min-w-[283px] w-full md:w-auto">
                <label className="text-base text-gray-12 font-dm-sans md:text-base md:text-gray-12">
                  Nome
                </label>
                <div className="flex h-12 items-center gap-1 rounded-lg border border-gray-6 bg-transparent px-3 md:gap-2.5">
                  <User className="size-5 shrink-0 text-gray-11" />
                  {/* Mobile Input */}
                  <Input
                    type="text"
                    name="firstName"
                    value={
                      `${formData.firstName || ""} ${
                        formData.lastName || ""
                      }`.trim() || ""
                    }
                    onChange={(e) => {
                      const fullName = e.target.value;
                      const parts = fullName.split(" ");
                      setFormData((prev) => ({
                        ...prev,
                        firstName: parts[0] || "",
                        lastName: parts.slice(1).join(" ") || "",
                      }));
                    }}
                    placeholder="Seu nome"
                    className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 text-base text-gray-11 font-dm-sans placeholder:text-gray-11 md:hidden"
                  />
                  {/* Desktop Input */}
                  <Input
                    type="text"
                    name="firstName"
                    value={
                      `${formData.firstName || ""} ${
                        formData.lastName || ""
                      }`.trim() || ""
                    }
                    onChange={(e) => {
                      const fullName = e.target.value;
                      const parts = fullName.split(" ");
                      setFormData((prev) => ({
                        ...prev,
                        firstName: parts[0] || "",
                        lastName: parts.slice(1).join(" ") || "",
                      }));
                    }}
                    placeholder="Nome completo"
                    className="hidden md:block h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div className="flex flex-1 flex-col gap-2 min-w-[283px] w-full md:w-auto">
                <label className="text-base text-gray-12 font-dm-sans md:text-base md:text-gray-12">
                  Data de nascimento
                </label>
                {/* Mobile DateOfBirthPicker */}
                <div className="md:hidden">
                  <DatePickerWithConfirm
                    value={formData.dateOfBirth}
                    onChange={(value) => {
                      // Convert Date to YYYY-MM-DD string format
                      const dateString = value
                        ? `${value.getFullYear()}-${String(
                            value.getMonth() + 1
                          ).padStart(2, "0")}-${String(
                            value.getDate()
                          ).padStart(2, "0")}`
                        : "";
                      setFormData((prev) => ({
                        ...prev,
                        dateOfBirth: dateString,
                      }));
                    }}
                  />
                </div>
                {/* Desktop DateOfBirthPicker */}
                <div className="hidden md:block">
                  <DatePickerWithConfirm
                    value={formData.dateOfBirth}
                    onChange={(value) => {
                      const dateString = value
                        ? `${value.getFullYear()}-${String(
                            value.getMonth() + 1
                          ).padStart(2, "0")}-${String(
                            value.getDate()
                          ).padStart(2, "0")}`
                        : "";
                      setFormData((prev) => ({
                        ...prev,
                        dateOfBirth: dateString,
                      }));
                    }}
                  />
                </div>
              </div>

              {/* Nationality */}
              <div className="relative flex flex-1 flex-col gap-2 min-w-[283px] w-full md:w-auto">
                <label className="text-base text-gray-12 font-dm-sans md:text-base md:text-gray-12">
                  Nacionalidade
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setShowNationalityDropdown(!showNationalityDropdown)
                  }
                  className="flex h-12 items-center justify-between rounded-lg border border-gray-7 bg-transparent px-3"
                >
                  <div className="flex items-center gap-1 md:gap-2.5">
                    <FlagIcon className="size-5 shrink-0 text-gray-11" />
                    <span className="text-base text-gray-11 font-dm-sans">
                      {formData.nationality || "Selecione"}
                    </span>
                  </div>
                  <div className="flex-none -scale-y-100 shrink-0 md:scale-y-100">
                    <ArrowButton isOpen={showNationalityDropdown} />
                  </div>
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
              <div className="flex flex-1 flex-col gap-2 min-w-[283px] w-full md:w-auto">
                <label className="text-base text-gray-12 font-dm-sans md:text-base md:text-gray-12">
                  Telefone
                </label>
                <div className="flex h-12 items-center gap-1 rounded-lg border border-gray-6 bg-transparent px-3 md:gap-2.5">
                  <Phone className="size-5 shrink-0 text-gray-11" />
                  {/* Mobile Input */}
                  <Input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 text-base text-gray-11 font-dm-sans placeholder:text-gray-11 md:hidden"
                  />
                  {/* Desktop Input */}
                  <Input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="hidden md:block h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>

              {/* Emergency Phone */}
              <div className="flex flex-1 flex-col gap-2 min-w-[283px] w-full md:w-auto">
                <label className="text-base text-gray-12 font-dm-sans md:text-base md:text-gray-12">
                  Telefone de emergência{" "}
                  <span className="text-gray-11">(Opcional)</span>
                </label>
                <div className="flex h-12 items-center gap-1 rounded-lg border border-gray-6 bg-transparent px-3 md:gap-2.5">
                  <Phone className="size-5 shrink-0 text-gray-11" />
                  {/* Mobile Input */}
                  <Input
                    type="tel"
                    name="emergencyPhone"
                    value={formData.emergencyPhone}
                    onChange={handleInputChange}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 text-base text-gray-11 font-dm-sans placeholder:text-gray-11 md:hidden"
                  />
                  {/* Desktop Input */}
                  <Input
                    type="tel"
                    name="emergencyPhone"
                    value={formData.emergencyPhone}
                    onChange={handleInputChange}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="hidden md:block h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 min-w-[283px] w-full md:w-auto">
                <label className="text-base text-gray-12 font-dm-sans md:text-base md:text-gray-12">
                  CPF
                </label>
                <div className="flex h-12 items-center gap-1 rounded-lg border border-gray-6 bg-transparent px-3 md:gap-2.5">
                  <CPFIcon className="size-5 shrink-0 text-gray-11" />
                  {/* Mobile Input */}
                  <Input
                    type="text"
                    name="documentNumber"
                    value={formData.documentNumber}
                    onChange={handleInputChange}
                    placeholder="000.000.000-00"
                    className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 text-base text-gray-11 font-dm-sans placeholder:text-gray-11 md:hidden"
                  />
                  {/* Desktop Input */}
                  <Input
                    type="text"
                    name="documentNumber"
                    value={formData.documentNumber}
                    onChange={handleInputChange}
                    placeholder="000.000.000-00"
                    className="hidden md:block h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>

              {/* Gender */}
              <div className="relative flex flex-1 flex-col gap-2 min-w-[283px] w-full md:w-auto">
                <label className="text-base text-gray-12 font-dm-sans md:text-base md:text-gray-12">
                  Sexo
                </label>
                <button
                  type="button"
                  onClick={() => setShowGenderDropdown(!showGenderDropdown)}
                  className="flex h-12 items-center justify-between rounded-lg border border-gray-7 bg-transparent px-3"
                >
                  <div className="flex items-center gap-1 md:gap-2.5">
                    <HeartIcon className="size-5 shrink-0 text-gray-11" />
                    <span className="text-base text-gray-11 font-dm-sans">
                      {displayGender || "Selecione"}
                    </span>
                  </div>
                  <div className="flex-none -scale-y-100 shrink-0 md:scale-y-100">
                    <ArrowButton isOpen={showGenderDropdown} />
                  </div>
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

            {/* Mobile: Divider */}
            <div className="h-px bg-gray-6 w-full my-0 md:hidden" />

            {/* Mobile: Full width button */}
            <div className="flex justify-start w-full md:hidden">
              <Button
                variant="default"
                className="w-full h-11 gap-2 px-5 bg-primary-11 text-primary-2 hover:bg-primary-10 font-bold text-base font-manrope"
                onClick={handleSavePersonalData}
              >
                Salvar alterações
              </Button>
            </div>
            {/* Desktop: Right aligned button */}
            <div className="hidden md:flex md:justify-end">
              <Button
                variant="default"
                className="h-12 gap-2 px-5"
                onClick={handleSavePersonalData}
              >
                Salvar alterações
              </Button>
            </div>
          </div>

          {/* Change Password Section - Desktop Only */}
          <div className="hidden md:flex flex-col gap-8 border-b border-gray-6 px-4 py-8">
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
          <div className="flex flex-col gap-8 border-b border-gray-6 px-4 py-8 md:gap-8">
            {/* Mobile: Left aligned */}
            <div className="flex flex-col gap-3 items-start w-full md:flex-col md:gap-3">
              <h2 className="text-lg font-bold leading-[1.1] text-gray-12 font-manrope md:text-xl md:font-bold">
                Conta e segurança
              </h2>
              <p className="text-sm text-gray-11 font-dm-sans md:text-base">
                Gerencie o e-mail e a senha que você usa para entrar no
                PódioTicket.
              </p>
            </div>

            {/* Mobile: Column layout */}
            <div className="flex flex-col gap-4 items-center w-full md:hidden">
              <button
                type="button"
                onClick={handleChangeEmail}
                className="flex h-12 w-full items-center justify-between gap-2.5 rounded-lg border-[1.5px] border-gray-6 bg-transparent px-3"
              >
                <div className="flex items-center gap-1">
                  <Mail className="size-6 shrink-0 text-gray-12" />
                  <span className="text-base text-gray-12 font-dm-sans">
                    Deseja alterar seu email?
                  </span>
                </div>
                <ChevronDown className="size-5 shrink-0 -rotate-90 text-gray-12" />
              </button>

              <button
                type="button"
                onClick={handleChangePassword}
                className="flex h-12 w-full items-center justify-between gap-2.5 rounded-lg border-[1.25px] border-gray-6 bg-transparent px-3"
              >
                <div className="flex items-center gap-1">
                  <Lock className="size-6 shrink-0 text-gray-12" />
                  <span className="text-base text-gray-12 font-medium font-dm-sans">
                    Deseja alterar sua senha?
                  </span>
                </div>
                <ChevronDown className="size-5 shrink-0 -rotate-90 text-gray-12" />
              </button>
            </div>

            {/* Desktop: Single button */}
            <button
              type="button"
              onClick={handleChangeEmail}
              className="hidden md:flex h-12 w-full max-w-[400px] items-center justify-between gap-2.5 rounded-lg border border-gray-6 bg-transparent px-3"
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
          <div className="flex flex-col gap-8 px-4 py-8 md:gap-10">
            <div className="flex flex-col gap-4 items-start w-full md:flex-col md:gap-4">
              <h2 className="text-lg font-bold leading-[1.1] text-gray-12 font-manrope md:text-xl md:font-bold">
                Segurança
              </h2>

              <button
                type="button"
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                className="flex h-12 w-full items-center justify-between gap-2.5 rounded-lg border-[1.5px] border-gray-6 bg-transparent px-3 md:hidden"
              >
                <div className="flex items-center gap-1 flex-1">
                  <Shield className="size-6 shrink-0 text-gray-12" />
                  <span className="text-sm text-gray-12 font-dm-sans text-left">
                    Ligar dois fatores de segurança
                  </span>
                </div>
                <div
                  className={cn(
                    "relative h-5 w-[37px] rounded-full transition-colors shrink-0",
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

              <p className="text-base text-gray-11 font-dm-sans">
                Ative o 2FA para adicionar uma camada extra de segurança à sua
                conta. Sempre que fizer login em um novo dispositivo, você
                precisará informar um código enviado para o seu e-mail.
              </p>
              <button
                type="button"
                onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                className="hidden md:flex h-12 w-full max-w-[400px] items-center justify-between gap-2.5 rounded-lg border border-gray-6 bg-transparent px-3"
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
