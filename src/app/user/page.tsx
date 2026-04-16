"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
  Search,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Checkbox } from "@/components/CheckBox";
import { FlagIcon } from "@/components/Icons/FlagIcon";
import { HeartIcon } from "@/components/Icons/HeartIcon";
import { ArrowButton } from "@/components/ArrowButton";
import { useChangeEmailModal, useChangePasswordModal } from "@/stores/modalStore";
import { CPFIcon } from "@/components/Icons/CPFIcon";
import { getCpfValidationMessage } from "@/utils/cpf";
import { getAvatarUrl } from "@/utils/avatar";
import { DatePickerWithConfirm } from "@/components/DateOfBirthPicker/DatePickerWithConfirm";
import {
  ImageUploadWithCrop,
  type ImageUploadWithCropRef,
} from "@/components/ImageUploadWithCrop";
import { EVENT_IMAGE_SPECS } from "@/lib/eventImageSpecs";
import { COUNTRIES_PT_BR } from "@/data/countries";

/** Alinha valores antigos da API («Brasileira», etc.) ao nome do país da lista de cadastro. */
function mapStoredCountryToPickerValue(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) return "Brasil";
  const lower = t.toLowerCase();
  if (lower === "brasileira" || lower === "brazil") return "Brasil";
  if (COUNTRIES_PT_BR.includes(t)) return t;
  return t;
}

// Função para converter gênero do backend para a tela
const formatGenderFromBackend = (
  backendGender: string | null | undefined
): string => {
  if (!backendGender || backendGender.trim() === "") {
    return "";
  }

  const genderUpper = backendGender.toUpperCase().trim();

  switch (genderUpper) {
    case "MALE":
      return "Masculino";
    case "FEMALE":
      return "Feminino";
    case "OTHER":
      return "Outro";
    case "PREFER_NOT_TO_SAY":
      return "Prefiro não informar";
    default:
      // Se já estiver no formato da tela, retorna como está
      const genderLower = backendGender.toLowerCase().trim();
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
  const router = useRouter();
  const { user, refetchUser } = useAuth();
  const { openChangeEmailModal } = useChangeEmailModal();
  const { openChangePasswordModal } = useChangePasswordModal();
  const avatarCropRef = useRef<ImageUploadWithCropRef>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Redirecionar para home se não estiver logado
  useEffect(() => {
    const hasToken = userService.isAuthenticated();
    if (!hasToken) {
      router.replace("/");
      return;
    }
    const timer = setTimeout(() => setAuthChecked(true), 300);
    return () => clearTimeout(timer);
  }, [router]);

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
      nationality: mapStoredCountryToPickerValue(
        (user as any)?.nationality || (user as any)?.country,
      ),
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
  const [fullNameInput, setFullNameInput] = useState(
    () => [initialFormData.firstName, initialFormData.lastName].filter(Boolean).join(" ")
  );

  /** Valores persistidos (espelho do `user`) para habilitar «Salvar» só com alteração real. */
  const profileBaseline = useMemo(() => {
    if (!user) return null;
    const u = user as any;
    return {
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      documentNumber: maskCPFForInit(u.documentNumber || ""),
      dateOfBirth: u.dateOfBirth ?? "",
      nationality: mapStoredCountryToPickerValue(u.nationality || u.country),
      phone: maskPhoneForInit(u.phone || ""),
      emergencyPhone: maskPhoneForInit(u.emergencyPhone || ""),
      gender:
        formatGenderFromBackend(u.gender || u.sex) || "",
    };
  }, [user]);

  const isProfileDirty = useMemo(() => {
    if (!profileBaseline) return false;
    const d = (s: string) => (s || "").replace(/\D/g, "");
    const b = profileBaseline;
    const f = formData;
    if ((f.firstName || "").trim() !== (b.firstName || "").trim()) return true;
    if ((f.lastName || "").trim() !== (b.lastName || "").trim()) return true;
    if (d(f.documentNumber) !== d(b.documentNumber)) return true;
    if ((f.dateOfBirth || "") !== (b.dateOfBirth || "")) return true;
    if ((f.nationality || "") !== (b.nationality || "")) return true;
    if (d(f.phone) !== d(b.phone)) return true;
    if (d(f.emergencyPhone) !== d(b.emergencyPhone)) return true;
    if ((f.gender || "") !== (b.gender || "")) return true;
    return false;
  }, [formData, profileBaseline]);

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
        nationality: mapStoredCountryToPickerValue(
          (user as any)?.nationality || (user as any)?.country,
        ),
        phone: rawPhone ? maskPhoneForInit(rawPhone) : prev.phone,
        emergencyPhone: rawEmergencyPhone
          ? maskPhoneForInit(rawEmergencyPhone)
          : prev.emergencyPhone,
        gender: (() => {
          const userGender = (user as any)?.gender;
          const userSex = (user as any)?.sex;
          const genderValue = userGender || userSex;

          if (genderValue) {
            const formatted = formatGenderFromBackend(genderValue);
            return formatted;
          }
          return prev.gender;
        })(),
        email: user?.email ?? prev.email,
        currentPassword: prev.currentPassword,
        newPassword: prev.newPassword,
      }));
      const fn = (user as any)?.firstName ?? "";
      const ln = (user as any)?.lastName ?? "";
      setFullNameInput([fn, ln].filter(Boolean).join(" "));
    }
  }, [user]);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);
  const [nationalitySearch, setNationalitySearch] = useState("");
  const nationalityDropdownRef = useRef<HTMLDivElement>(null);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const nationalityOptions = useMemo(
    () =>
      COUNTRIES_PT_BR.map((name) => ({
        id: name
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .replace(/\s+/g, "-"),
        label: name,
      })),
    [],
  );

  const normalizeNationalitySearch = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");

  const filteredNationalityOptions = useMemo(() => {
    if (!nationalitySearch.trim()) return nationalityOptions;
    const q = normalizeNationalitySearch(nationalitySearch);
    return nationalityOptions.filter((opt) =>
      normalizeNationalitySearch(opt.label).includes(q),
    );
  }, [nationalityOptions, nationalitySearch]);

  useEffect(() => {
    if (!showNationalityDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const el = nationalityDropdownRef.current;
      if (el && !el.contains(e.target as Node)) {
        setShowNationalityDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNationalityDropdown]);

  const handleToggle2FA = () => {
    const newValue = !twoFactorEnabled;
    setTwoFactorEnabled(newValue);
    if (newValue) {
      toast.success("2FA ativado com sucesso!");
    } else {
      toast.success("2FA desativado com sucesso!");
    }
  };

  const uploadUserAvatar = async (file: File) => {
    setIsUploadingAvatar(true);
    try {
      await userService.uploadAvatar(file);
      toast.success("Foto de perfil atualizada com sucesso!");
      await refetchUser();
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error(
        error?.message || "Erro ao atualizar foto de perfil. Tente novamente."
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      await userService.removeAvatar();
      await refetchUser();
      toast.success("Imagem removida com sucesso!");
    } catch (error: any) {
      toast.error(error?.message || "Erro ao remover imagem.");
    } finally {
      setIsUploadingAvatar(false);
    }
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

    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSavePersonalData = async () => {
    if (!user) return;

    const errors: Record<string, string> = {};

    const fullNameTrimmed = fullNameInput.trim();
    const nameParts = fullNameTrimmed.split(/\s+/).filter(Boolean);
    if (!fullNameTrimmed) {
      errors.firstName = "Nome completo é obrigatório";
    } else if (nameParts.length < 2) {
      errors.firstName = "Informe nome e sobrenome";
    }

    if (!formData.phone?.trim()) {
      errors.phone = "Telefone é obrigatório";
    }

    if (!formData.documentNumber?.trim()) {
      errors.documentNumber = "CPF é obrigatório";
    } else {
      const cpfError = getCpfValidationMessage(formData.documentNumber);
      if (cpfError) errors.documentNumber = cpfError;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (!isProfileDirty) return;

    setFormErrors({});

    setIsSavingProfile(true);
    try {
      // Prepara os dados para atualização
      const updateData: any = {};

      // Parse nome completo em firstName e lastName
      const fullName = `${formData.firstName || ""} ${formData.lastName || ""
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

      updateData.phone = formData.phone.replace(/\D/g, "") || null;

      updateData.emergencyPhone = formData.emergencyPhone.replace(/\D/g, "") || null;

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
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = () => {
    openChangePasswordModal();
  };

  const handleChangeEmail = () => {
    openChangeEmailModal();
  };

  if (!authChecked) {
    return null;
  }

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
                {/* Mobile: Column layout */}
                <div className="flex flex-col gap-3 items-start w-full md:hidden">
                  <Button
                    variant="default"
                    className="w-full h-11 gap-2 px-5 bg-primary-11 text-primary-2 hover:bg-primary-10 font-bold text-base font-manrope"
                    onClick={() => avatarCropRef.current?.open()}
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
                    onClick={() => avatarCropRef.current?.open()}
                    disabled={isUploadingAvatar}
                  >
                    <Plus className="size-5" />
                    {isUploadingAvatar ? "Enviando..." : "Alterar imagem"}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 text-gray-12 gap-2 px-5 border-gray-6"
                    onClick={handleRemoveAvatar}
                    disabled={isUploadingAvatar || !user?.avatarUrl}
                  >
                    Remover imagem
                  </Button>
                </div>
                <p className="text-sm text-gray-11 font-family-dm-sans md:text-sm">
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
              <p className="text-sm text-gray-11 font-family-dm-sans md:text-base">
                Usamos esses dados nas inscrições de eventos. Preencha
                exatamente como está no seu documento.
              </p>
            </div>

            <div className="flex flex-wrap gap-6 items-start w-full md:grid md:grid-cols-2 md:gap-3">
              {/* Name */}
              <div className="flex flex-1 flex-col gap-2 min-w-[283px] w-full md:w-auto">
                <label className="text-base text-gray-12 font-family-dm-sans md:text-base md:text-gray-12">
                  Nome
                </label>
                <div className={cn("flex h-12 items-center gap-1 rounded-lg border bg-transparent px-3 md:gap-2.5", formErrors.firstName ? "border-red-500" : "border-gray-6")}>
                  <User className="size-5 shrink-0 text-gray-11" />
                  {/* Mobile Input */}
                  <Input
                    type="text"
                    name="firstName"
                    value={fullNameInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setFullNameInput(raw);
                      const parts = raw.trim().split(/\s+/);
                      setFormData((prev) => ({
                        ...prev,
                        firstName: parts[0] || "",
                        lastName: parts.slice(1).join(" ") || "",
                      }));
                      if (formErrors.firstName) setFormErrors((prev) => ({ ...prev, firstName: "" }));
                    }}
                    placeholder="Seu nome"
                    className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 text-base text-gray-11 font-family-dm-sans placeholder:text-gray-11 md:hidden"
                  />
                  {/* Desktop Input */}
                  <Input
                    type="text"
                    name="firstName"
                    value={fullNameInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setFullNameInput(raw);
                      const parts = raw.trim().split(/\s+/);
                      setFormData((prev) => ({
                        ...prev,
                        firstName: parts[0] || "",
                        lastName: parts.slice(1).join(" ") || "",
                      }));
                      if (formErrors.firstName) setFormErrors((prev) => ({ ...prev, firstName: "" }));
                    }}
                    placeholder="Nome completo"
                    className="hidden md:block h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                  />
                </div>
                {formErrors.firstName && (
                  <p className="text-xs text-red-500">{formErrors.firstName}</p>
                )}
              </div>

              {/* Date of Birth */}
              <div className="flex flex-1 flex-col gap-2 min-w-[283px] w-full md:w-auto">
                <label className="text-base text-gray-12 font-family-dm-sans md:text-base md:text-gray-12">
                  Data de nascimento
                </label>
                {/* Mobile DateOfBirthPicker */}
                <div className="md:hidden">
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

              {/* Nationality — mesma lista + busca do cadastro (RegisterModal) */}
              <div className="relative flex flex-1 flex-col gap-2 min-w-[283px] w-full md:w-auto">
                <label className="text-base text-gray-12 font-family-dm-sans md:text-base md:text-gray-12">
                  Nacionalidade
                </label>
                <div className="w-full relative" ref={nationalityDropdownRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNationalityDropdown((prev) => {
                        const next = !prev;
                        if (next) setNationalitySearch("");
                        return next;
                      });
                    }}
                    className="flex h-12 w-full items-center justify-between rounded-lg border border-gray-6 bg-transparent px-3 transition-colors hover:bg-gray-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-1 md:gap-2.5">
                      <FlagIcon className="size-5 shrink-0 text-gray-11" />
                      <span
                        className={`truncate font-family-dm-sans text-base leading-[1.3] ${formData.nationality ? "text-gray-12" : "text-gray-11"}`}
                      >
                        {formData.nationality || "Selecione"}
                      </span>
                    </div>
                    <div className="flex-none -scale-y-100 shrink-0 md:scale-y-100">
                      <ArrowButton isOpen={showNationalityDropdown} />
                    </div>
                  </button>
                  {showNationalityDropdown && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-gray-6 bg-gray-1 shadow-lg">
                      <div className="border-b border-gray-6 p-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-11" />
                          <input
                            type="text"
                            placeholder="Pesquisar país"
                            value={nationalitySearch}
                            onChange={(e) =>
                              setNationalitySearch(e.target.value)
                            }
                            onMouseDown={(e) => e.stopPropagation()}
                            className="h-9 w-full rounded-md border border-gray-6 bg-gray-2 pl-8 pr-3 font-family-dm-sans text-sm text-gray-12 placeholder:text-gray-10 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-8"
                          />
                        </div>
                      </div>
                      <div className="max-h-[220px] overflow-y-auto [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar]:w-2">
                        {filteredNationalityOptions.length === 0 ? (
                          <div className="px-3 py-4 text-center font-family-dm-sans text-sm text-gray-11">
                            Nenhum país encontrado
                          </div>
                        ) : (
                          filteredNationalityOptions.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  nationality: option.label,
                                }));
                                setShowNationalityDropdown(false);
                                setNationalitySearch("");
                              }}
                              className="w-full px-3 py-2.5 text-left font-family-dm-sans text-sm text-gray-12 transition-colors hover:bg-gray-3"
                            >
                              {option.label}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div className="flex flex-1 flex-col gap-2 min-w-[283px] w-full md:w-auto">
                <label className="text-base text-gray-12 font-family-dm-sans md:text-base md:text-gray-12">
                  Telefone
                </label>
                <div className={cn("flex h-12 items-center gap-1 rounded-lg border bg-transparent px-3 md:gap-2.5", formErrors.phone ? "border-red-500" : "border-gray-6")}>
                  <Phone className="size-5 shrink-0 text-gray-11" />
                  {/* Mobile Input */}
                  <Input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 text-base text-gray-11 font-family-dm-sans placeholder:text-gray-11 md:hidden"
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
                {formErrors.phone && (
                  <p className="text-xs text-red-500">{formErrors.phone}</p>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-2 min-w-[283px] w-full md:w-auto">
                <label className="text-base text-gray-12 font-family-dm-sans md:text-base md:text-gray-12">
                  CPF
                </label>
                <div className={cn("flex h-12 items-center gap-1 rounded-lg border bg-transparent px-3 md:gap-2.5", formErrors.documentNumber ? "border-red-500" : "border-gray-6")}>
                  <CPFIcon className="size-5 shrink-0 text-gray-11" />
                  {/* Mobile Input */}
                  <Input
                    type="text"
                    name="documentNumber"
                    value={formData.documentNumber}
                    onChange={handleInputChange}
                    placeholder="000.000.000-00"
                    className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 text-base text-gray-11 font-family-dm-sans placeholder:text-gray-11 md:hidden"
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
                {formErrors.documentNumber && (
                  <p className="text-xs text-red-500">{formErrors.documentNumber}</p>
                )}
              </div>

              {/* Gender */}
              <div className="relative flex flex-1 flex-col gap-2 min-w-[283px] w-full md:w-auto">
                <label className="text-base text-gray-12 font-family-dm-sans md:text-base md:text-gray-12">
                  Sexo
                </label>
                <button
                  type="button"
                  onClick={() => setShowGenderDropdown(!showGenderDropdown)}
                  className="flex h-12 items-center justify-between rounded-lg border border-gray-6 bg-transparent px-3"
                >
                  <div className="flex items-center gap-1 md:gap-2.5">
                    <HeartIcon className="size-5 shrink-0 text-gray-11" />
                    <span className="text-base text-gray-11 font-family-dm-sans">
                      {formData.gender || "Selecione"}
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
                disabled={
                  !isProfileDirty || !user || isSavingProfile
                }
              >
                {isSavingProfile ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
            {/* Desktop: Right aligned button */}
            <div className="hidden md:flex md:justify-end">
              <Button
                variant="default"
                className="h-12 gap-2 px-5"
                onClick={handleSavePersonalData}
                disabled={
                  !isProfileDirty || !user || isSavingProfile
                }
              >
                {isSavingProfile ? "Salvando..." : "Salvar alterações"}
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
              <p className="text-sm text-gray-11 font-family-dm-sans md:text-base">
                Gerencie o e-mail e a senha que você usa para entrar no
                PódioTicket.
              </p>
            </div>

            {/* Mobile: Column layout */}
            <div className="flex flex-col gap-4 items-center w-full md:hidden">
              <button
                type="button"
                onClick={handleChangeEmail}
                className="flex h-12 w-full items-center justify-between gap-2.5 rounded-lg border-[1.5px] border-gray-6 bg-transparent px-3 cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <Mail className="size-6 shrink-0 text-gray-12" />
                  <span className="text-base text-gray-12 font-family-dm-sans">
                    Deseja alterar seu email?
                  </span>
                </div>
                <ChevronDown className="size-5 shrink-0 -rotate-90 text-gray-12" />
              </button>

              <button
                type="button"
                onClick={handleChangePassword}
                className="flex h-12 w-full items-center justify-between gap-2.5 rounded-lg border-[1.25px] border-gray-6 bg-transparent px-3 cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <Lock className="size-6 shrink-0 text-gray-12" />
                  <span className="text-base text-gray-12 font-medium font-family-dm-sans">
                    Deseja alterar sua senha?
                  </span>
                </div>
                <ChevronDown className="size-5 shrink-0 -rotate-90 text-gray-12" />
              </button>
            </div>

            {/* Desktop: Two buttons side by side */}
            <div className="hidden md:flex flex-row gap-6 items-center w-full">
              <button
                type="button"
                onClick={handleChangeEmail}
                className="flex h-[52px] items-center justify-between gap-2.5 rounded-lg border border-gray-6 bg-transparent px-3 w-full cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Mail className="size-6 shrink-0 text-gray-12" />
                  <span className="text-base text-gray-12 font-family-dm-sans">
                    Deseja alterar seu email?
                  </span>
                </div>
                <ChevronDown className="size-5 shrink-0 -rotate-90 text-gray-12" />
              </button>

              <button
                type="button"
                onClick={handleChangePassword}
                className="flex h-[52px] items-center justify-between gap-2.5 rounded-lg border border-gray-6 bg-transparent px-3 w-full cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Lock className="size-6 shrink-0 text-gray-12" />
                  <span className="text-base text-gray-12 font-family-dm-sans">
                    Deseja alterar sua senha?
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Security Section */}
          <div className="flex flex-col gap-8 px-4 py-8 md:gap-10">
            <div className="flex flex-col gap-4 items-start w-full md:flex-col md:gap-4">
              <h2 className="text-lg font-bold leading-[1.1] text-gray-12 font-manrope md:text-xl md:font-bold">
                Segurança
              </h2>

              <button
                type="button"
                onClick={handleToggle2FA}
                className="flex h-12 w-full items-center justify-between gap-2.5 rounded-lg border-[1.5px] border-gray-6 bg-transparent px-3 md:hidden"
              >
                <div className="flex items-center gap-1 flex-1">
                  <Shield className="size-6 shrink-0 text-gray-12" />
                  <span className="text-sm text-gray-12 font-family-dm-sans text-left">
                    Ligar dois fatores de segurança
                  </span>
                </div>
                <div
                  className={cn(
                    "relative h-5 w-[37px] rounded-full transition-colors shrink-0 cursor-pointer",
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

              <p className="text-base text-gray-11 font-family-dm-sans">
                Ative o 2FA para adicionar uma camada extra de segurança à sua
                conta. Sempre que fizer login em um novo dispositivo, você
                precisará informar um código enviado para o seu e-mail.
              </p>
              <button
                type="button"
                className="hidden md:flex h-12 w-full max-w-[400px] items-center justify-between gap-2.5 rounded-lg border border-gray-6 bg-transparent px-3"
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="size-6 shrink-0 text-gray-12" />
                  <span className="text-base text-gray-12">
                    Ligar dois fatores de segurança
                  </span>
                </div>
                <div
                  onClick={handleToggle2FA}
                  className={cn(
                    "relative h-5 w-[37px] rounded-full transition-colors cursor-pointer",
                    twoFactorEnabled ? "bg-primary-11" : "bg-gray-6"
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                      twoFactorEnabled
                        ? "translate-x-[19px]"
                        : "translate-x-0.5"
                    )}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>

        <ImageUploadWithCrop
          ref={avatarCropRef}
          spec={EVENT_IMAGE_SPECS.organizationLogo}
          outputBaseName="user-avatar"
          cropShape="round"
          maxFileSizeMb={10}
          accept="image/jpeg,image/jpg,image/png"
          modalTitle="Ajustar foto de perfil"
          onCropped={(file) => void uploadUserAvatar(file)}
          onInvalidFile={(msg) => toast.error(msg)}
          onCropFailed={(msg) => toast.error(msg)}
        />
      </div>
    </div>
  );
}
