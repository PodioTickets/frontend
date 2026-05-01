"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRegisterModal, useLoginModal } from "@/stores/modalStore";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services";
import type { AuthError } from "@/services/user/UserService";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { Mail, Lock, User, Phone, Search, Eye, EyeOff } from "lucide-react";
import { ArrowButton } from "../ArrowButton";
import { FlagIcon } from "../Icons/FlagIcon";
import { SuccessIcon } from "../Icons/SuccessIcon";
import {
  registerStep1Schema,
  registerStep2Schema,
  type RegisterStep1FormData,
  type RegisterStep2FormData,
} from "@/validators/Auth.validator";
import { ZodError } from "zod";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { CPFIcon } from "../Icons/CPFIcon";
import { HeartIcon } from "../Icons/HeartIcon";
import { DatePickerWithConfirm } from "../DateOfBirthPicker/DatePickerWithConfirm";
import Image from "next/image";
import { COUNTRIES_PT_BR } from "@/data/countries";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

type RegisterStep = 1 | 2 | 3;

export function RegisterModal() {
  const { isOpen, closeRegisterModal, data: modalData } = useRegisterModal();
  const { openLoginModal } = useLoginModal();
  const { register, isLoading: authLoading, user, refetchUser } = useAuth();
  const [currentStep, setCurrentStep] = useState<RegisterStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const mobileTurnstileRef = useRef<TurnstileInstance>(null);
  const desktopTurnstileRef = useRef<TurnstileInstance>(null);

  // Verifica se é para completar cadastro
  const isCompletingProfile = modalData?.completeProfile === true && !!user;

  // Form data state
  const [formData, setFormData] = useState({
    // Step 1: Personal Information
    nome: "",
    nacionalidade: "Brasil",
    cpf: "",
    dataNascimento: null as Date | null,
    telefone: "",
    telefoneEmergencia: "",
    sexo: "",
    // Step 2: Account Access
    email: "",
    senha: "",
    confirmarSenha: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);
  const [nationalitySearch, setNationalitySearch] = useState("");
  const nationalityDropdownRef = useRef<HTMLDivElement>(null);

  // Reset step quando modal fecha
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1);
      setTurnstileToken(null);
      mobileTurnstileRef.current?.reset();
      desktopTurnstileRef.current?.reset();
    }
  }, [isOpen]);

  useEffect(() => {
    // Não resetar se já estivermos no step 3 (sucesso) ou se o modal estiver fechado
    if (currentStep === 3 || !isOpen) {
      return;
    }

    if (isCompletingProfile && user && isOpen) {
      let birthDate: Date | null = null;
      if ((user as any)?.dateOfBirth) {
        const dateStr = (user as any).dateOfBirth;
        birthDate = new Date(dateStr);
        if (isNaN(birthDate.getTime())) {
          birthDate = null;
        }
      }

      // Parse nome completo
      const firstName = (user as any)?.firstName || "";
      const lastName = (user as any)?.lastName || "";
      const fullName = `${firstName} ${lastName}`.trim() || "";

      setFormData({
        nome: fullName,
        nacionalidade:
          (user as any)?.nationality || (user as any)?.country || "Brasil",
        cpf: (user as any)?.documentNumber || "",
        dataNascimento: birthDate,
        telefone: (user as any)?.phone || "",
        telefoneEmergencia: (user as any)?.emergencyPhone || "",
        sexo: (() => {
          const raw = (user as any)?.gender || (user as any)?.sex || "";
          const map: Record<string, string> = {
            MALE: "Masculino",
            FEMALE: "Feminino",
            OTHER: "Outro",
            PREFER_NOT_TO_SAY: "Prefiro não informar",
          };
          return map[raw.toUpperCase().trim()] ?? raw;
        })(),
        email: user.email || "",
        senha: "",
        confirmarSenha: "",
      });
      // Completar cadastro: começar no step 2 (só informações pessoais)
      setCurrentStep(2);
    } else if (!isCompletingProfile && isOpen) {
      // Novo cadastro: começar no step 1 (dados de acesso)
      setFormData({
        nome: "",
        nacionalidade: "Brasil",
        cpf: "",
        dataNascimento: null,
        telefone: "",
        telefoneEmergencia: "",
        sexo: "",
        email: "",
        senha: "",
        confirmarSenha: "",
      });
      setCurrentStep(1);
    }
  }, [isCompletingProfile, user, isOpen]);

  const handleBack = () => {
    if (currentStep === 1) {
      closeRegisterModal();
      openLoginModal();
    } else {
      setCurrentStep((prev) => (prev - 1) as RegisterStep);
    }
  };

  const validateStep1 = (): boolean => {
    try {
      const step1Data: RegisterStep1FormData = {
        nome: formData.nome,
        nacionalidade: formData.nacionalidade,
        cpf: formData.cpf,
        dataNascimento: formData.dataNascimento!,
        telefone: formData.telefone,
        telefoneEmergencia: formData.telefoneEmergencia || "",
        sexo: formData.sexo,
      };
      registerStep1Schema.parse(step1Data);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path.length > 0) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
        // Show first error as toast
        const firstError = error.issues[0];
        if (firstError) {
          toast.error(firstError.message);
        }
      }
      return false;
    }
  };

  const validateStep2 = (): boolean => {
    try {
      if (isCompletingProfile) {
        if (!formData.email || !formData.email.includes("@")) {
          setErrors({ email: "Email é obrigatório" });
          toast.error("Email é obrigatório");
          return false;
        }
        setErrors({});
        return true;
      }

      // Validação normal para novo cadastro
      const step2Data: RegisterStep2FormData = {
        email: formData.email,
        senha: formData.senha,
        confirmarSenha: formData.confirmarSenha,
      };
      registerStep2Schema.parse(step2Data);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path.length > 0) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
        // Show first error as toast
        const firstError = error.issues[0];
        if (firstError) {
          toast.error(firstError.message);
        }
      }
      return false;
    }
  };

  const buildPersonalUpdateData = (data: typeof formData) => {
    const updateData: any = {};
    const nameParts = data.nome.trim().split(" ");
    updateData.firstName = nameParts[0] || "";
    updateData.lastName = nameParts.slice(1).join(" ") || "";

    if (data.sexo) {
      const genderMap: Record<string, string> = {
        masculino: "MALE",
        feminino: "FEMALE",
        outro: "OTHER",
        "prefiro não informar": "PREFER_NOT_TO_SAY",
        "prefiro-nao-dizer": "PREFER_NOT_TO_SAY",
      };
      updateData.gender = genderMap[data.sexo.toLowerCase().trim()] ?? data.sexo;
    }
    if (data.telefone) updateData.phone = data.telefone.replace(/\D/g, "");
    if (data.telefoneEmergencia) updateData.emergencyPhone = data.telefoneEmergencia.replace(/\D/g, "");
    if (data.dataNascimento) {
      const date = data.dataNascimento;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      updateData.dateOfBirth = `${year}-${month}-${day}`;
    }
    if (data.nacionalidade) updateData.country = data.nacionalidade;
    if (data.cpf) {
      updateData.documentNumber = data.cpf.replace(/\D/g, "");
      updateData.documentType = "CPF";
    }
    return updateData;
  };

  const handleNext = async () => {
    // Step 1: email + senha → só valida e avança, sem chamada de API
    if (currentStep === 1) {
      if (!validateStep2()) return;
      setCurrentStep(2);
      return;
    }

    // Step 2: dados pessoais
    if (currentStep === 2) {
      if (!validateStep1()) return;

      setIsSubmitting(true);
      try {
        // Fluxo: completar perfil Google OAuth
        if (isCompletingProfile) {
          await userService.updateUser(user!.id, buildPersonalUpdateData(formData));
          await refetchUser();
          setCurrentStep(3);
          toast.success("Cadastro finalizado com sucesso!");
          setTimeout(() => {
            closeRegisterModal();
            if (typeof window !== "undefined") {
              sessionStorage.removeItem("redirectAfterLogin");
            }
          }, 1500);
          return;
        }

        // Fluxo: novo cadastro com email/senha — uma única chamada com todos os dados
        const genderMap: Record<string, string> = {
          masculino: "MALE",
          feminino: "FEMALE",
          outro: "OTHER",
          "prefiro não informar": "PREFER_NOT_TO_SAY",
        };
        const date = formData.dataNascimento!;
        const dateOfBirth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

        await register({
          email: formData.email,
          password: formData.senha,
          complete_name: formData.nome.trim(),
          gender: genderMap[formData.sexo.toLowerCase().trim()] ?? formData.sexo,
          phone: formData.telefone,
          reserve_phone: formData.telefoneEmergencia || undefined,
          dateOfBirth,
          country: formData.nacionalidade,
          documentNumber: formData.cpf,
          documentType: "CPF",
          acceptedTerms: true,
          acceptedPrivacyPolicy: true,
        });

        setCurrentStep(3);
        toast.success("Cadastro realizado com sucesso!");
      } catch (error: unknown) {
        const e = error as Error & Partial<Pick<AuthError, "formFieldErrors">>;
        const msg = e?.message || "Erro ao criar conta. Tente novamente.";
        if (e.formFieldErrors?.email) {
          setErrors((prev) => ({ ...prev, email: e.formFieldErrors!.email! }));
        }
        if (e.formFieldErrors?.cpf) {
          setErrors((prev) => ({ ...prev, cpf: e.formFieldErrors!.cpf! }));
        }
        toast.error(msg);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleFinish = () => {
    // Marcar que o usuário dispensou (para não reabrir o modal ao navegar)
    if (typeof window !== "undefined" && user?.id) {
      sessionStorage.setItem(
        "completeProfileModalDismissed",
        `${user.id}:${Date.now()}`
      );
    }
    // Resetar formulário e step antes de fechar
    setFormData({
      nome: "",
      nacionalidade: "Brasil",
      cpf: "",
      dataNascimento: null,
      telefone: "",
      telefoneEmergencia: "",
      sexo: "",
      email: "",
      senha: "",
      confirmarSenha: "",
    });
    setErrors({});
    setCurrentStep(1);
    closeRegisterModal();
  };

  // Mask functions
  const maskCPF = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, "");
    // Aplica a máscara
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
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, "");
    // Aplica a máscara (99) 99999-9999
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7)
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(
      7,
      11
    )}`;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCPFChange = (value: string) => {
    const masked = maskCPF(value);
    handleInputChange("cpf", masked);
  };

  const handlePhoneChange = (
    field: "telefone" | "telefoneEmergencia",
    value: string
  ) => {
    const masked = maskPhone(value);
    handleInputChange(field, masked);
  };

  // Nacionalidade options (todos os países; Brasil já é o padrão)
  const nacionalidadeOptions = useMemo(
    () =>
      COUNTRIES_PT_BR.map((name) => ({
        id: name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, "-"),
        label: name,
      })),
    []
  );

  const normalizeForSearch = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");

  const filteredNacionalidadeOptions = useMemo(() => {
    if (!nationalitySearch.trim()) return nacionalidadeOptions;
    const q = normalizeForSearch(nationalitySearch);
    return nacionalidadeOptions.filter((opt) => normalizeForSearch(opt.label).includes(q));
  }, [nacionalidadeOptions, nationalitySearch]);

  useEffect(() => {
    if (!showNationalityDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const el = nationalityDropdownRef.current;
      if (el && !el.contains(e.target as Node)) setShowNationalityDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNationalityDropdown]);

  // Sexo options (igual à tela do usuário)
  const sexoOptions = [
    { id: "masculino", label: "Masculino" },
    { id: "feminino", label: "Feminino" },
    { id: "outro", label: "Outro" }
  ];

  const renderStep1Mobile = () => (
    <div className="md:hidden h-screen">
      {/* Mobile Header */}
      <div className="md:hidden border-b border-gray-6 flex items-center justify-center h-[52px] px-4 py-2 relative shrink-0 w-full">
        <div className="flex gap-2 items-center flex-1">
          {!isCompletingProfile && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center shrink-0 size-8 transition-colors rotate-90 cursor-pointer hover:bg-gray-3 rounded-lg"
              aria-label="Voltar"
            >
              <ArrowButton isOpen={true} />
            </button>
          )}
          <p className="font-medium text-base leading-[1.3] text-gray-12 font-family-dm-sans">
            Informações pessoais
          </p>
        </div>
      </div>

      {/* Mobile Form content */}
      <div className="md:hidden flex flex-col gap-8 items-center px-4 py-6 relative shrink-0 w-full overflow-y-auto h-full">
        <div className="flex flex-col gap-5 items-start relative shrink-0 w-full">
          {/* Nome */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Nome completo
            </label>
            <div className="relative w-full">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type="text"
                placeholder="Digite seu nome completo"
                value={formData.nome}
                onChange={(e) => handleInputChange("nome", e.target.value)}
                className={`pl-10 h-12 ${errors.nome ? "border-red-9 focus-visible:border-red-9" : ""
                  }`}
                aria-invalid={!!errors.nome}
              />
            </div>
            {errors.nome && (
              <p className="text-sm text-red-9 font-family-dm-sans">{errors.nome}</p>
            )}
          </div>

          {/* Nacionalidade */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Nacionalidade
            </label>
            <div className="w-full relative" ref={nationalityDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setShowNationalityDropdown((v) => !v);
                  if (!showNationalityDropdown) setNationalitySearch("");
                }}
                className="border border-gray-6 rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors cursor-pointer text-left"
              >
                <div className="flex gap-1 items-center flex-1 min-w-0">
                  <FlagIcon className="w-5 h-5 text-gray-11 shrink-0" />
                  <span
                    className={`font-normal text-base leading-[1.3] font-family-dm-sans truncate ${formData.nacionalidade
                      ? "text-gray-12"
                      : "text-gray-11"
                      }`}
                  >
                    {formData.nacionalidade || "Selecione"}
                  </span>
                </div>
                <div className="flex-none -scale-y-100 shrink-0">
                  <ArrowButton isOpen={showNationalityDropdown} />
                </div>
              </button>
              {showNationalityDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 z-60 bg-gray-1 border border-gray-6 rounded-lg shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-gray-6">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-11" />
                      <input
                        type="text"
                        placeholder="Pesquisar país"
                        value={nationalitySearch}
                        onChange={(e) => setNationalitySearch(e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full h-9 pl-8 pr-3 rounded-md border border-gray-6 bg-gray-2 text-sm font-family-dm-sans text-gray-12 placeholder:text-gray-10 focus:outline-none focus:ring-2 focus:ring-primary-8 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="max-h-[220px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {filteredNacionalidadeOptions.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-gray-11 font-family-dm-sans text-center">
                        Nenhum país encontrado
                      </div>
                    ) : (
                      filteredNacionalidadeOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            handleInputChange("nacionalidade", option.label);
                            setShowNationalityDropdown(false);
                          }}
                          className="w-full px-3 py-2.5 text-left text-sm font-family-dm-sans text-gray-12 hover:bg-gray-3 transition-colors"
                        >
                          {option.label}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {errors.nacionalidade && (
              <p className="text-sm text-red-9 font-family-dm-sans">
                {errors.nacionalidade}
              </p>
            )}
          </div>

          {/* CPF */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              CPF
            </label>
            <div className="relative w-full">
              <CPFIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type="text"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={(e) => handleCPFChange(e.target.value)}
                maxLength={14}
                className={`pl-10 h-12 ${errors.cpf ? "border-red-9 focus-visible:border-red-9" : ""
                  }`}
                aria-invalid={!!errors.cpf}
              />
            </div>
            {errors.cpf && (
              <p className="text-sm text-red-9 font-family-dm-sans">{errors.cpf}</p>
            )}
          </div>

          {/* Data de nascimento */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Data de nascimento
            </label>
            <div className="w-full">
              <DatePickerWithConfirm
                value={formData.dataNascimento}
                onChange={(date) => {
                  setFormData((prev) => ({
                    ...prev,
                    dataNascimento: date,
                  }));
                  if (errors.dataNascimento && date) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.dataNascimento;
                      return newErrors;
                    });
                  }
                }}
                error={!!errors.dataNascimento}
              />
            </div>
            {errors.dataNascimento && (
              <p className="text-sm text-red-9 font-family-dm-sans">
                {errors.dataNascimento}
              </p>
            )}
          </div>

          {/* Telefone */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Telefone
            </label>
            <div className="relative w-full">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type="tel"
                placeholder="(00) 99999-9999"
                value={formData.telefone}
                onChange={(e) => handlePhoneChange("telefone", e.target.value)}
                maxLength={15}
                className={`pl-10 h-12 ${errors.telefone
                  ? "border-red-9 focus-visible:border-red-9"
                  : ""
                  }`}
                aria-invalid={!!errors.telefone}
              />
            </div>
            {errors.telefone && (
              <p className="text-sm text-red-9 font-family-dm-sans">
                {errors.telefone}
              </p>
            )}
          </div>

          {/* Sexo */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Sexo
            </label>
            <div className="w-full">
              <Dropdown
                width="w-full"
                className="z-60"
                trigger={(open: boolean) => (
                  <div className="border border-gray-6 rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors cursor-pointer">
                    <div className="flex gap-1 items-center flex-1 min-w-0">
                      <HeartIcon className="w-5 h-5 text-gray-11 shrink-0" />
                      <span
                        className={`font-normal text-base leading-[1.3] font-family-dm-sans truncate ${formData.sexo ? "text-gray-12" : "text-gray-11"
                          }`}
                      >
                        {formData.sexo || "Selecione"}
                      </span>
                    </div>
                    <div className="flex-none -scale-y-100 shrink-0">
                      <ArrowButton isOpen={open} />
                    </div>
                  </div>
                )}
                options={sexoOptions}
                onSelect={(option) => handleInputChange("sexo", option.label)}
              />
            </div>
            {errors.sexo && (
              <p className="text-sm text-red-9 font-family-dm-sans">{errors.sexo}</p>
            )}
          </div>
        </div>

        {/* Mobile: step 2 = último passo, botão Criar conta / Finalizar cadastro */}
        <div className="flex flex-col items-start relative shrink-0 w-full gap-4">
          {!isCompletingProfile && TURNSTILE_SITE_KEY && (
            <Turnstile
              ref={mobileTurnstileRef}
              siteKey={TURNSTILE_SITE_KEY}
              onSuccess={setTurnstileToken}
              onError={() => setTurnstileToken(null)}
              onExpire={() => setTurnstileToken(null)}
              options={{ theme: "auto", size: "flexible" }}
              className="w-full"
            />
          )}
          <Button
            onClick={handleNext}
            disabled={isSubmitting || authLoading || (!isCompletingProfile && !!TURNSTILE_SITE_KEY && !turnstileToken)}
            className="w-full h-12 bg-primary-11 text-primary-2 hover:bg-primary-10 font-bold text-base font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || authLoading
              ? isCompletingProfile
                ? "Finalizando cadastro..."
                : "Criando conta..."
              : isCompletingProfile
                ? "Finalizar cadastro"
                : "Criar conta"}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <>
      {/* Desktop Header */}
      <div className="hidden md:flex border-b border-gray-6 gap-0.5 items-center px-4 py-3 relative shrink-0 w-full overflow-visible">
        {!isCompletingProfile && (
          <button
            onClick={handleBack}
            className="flex items-center justify-center rounded-lg shrink-0 size-8 transition-colors rotate-90 cursor-pointer hover:bg-gray-3"
            aria-label="Voltar"
          >
            <ArrowButton isOpen={true} />
          </button>
        )}
        <p className="font-semibold text-xl leading-[1.3] text-gray-12 font-family-dm-sans">
          Informações pessoais
        </p>
      </div>

      {/* Desktop Form content */}
      <div className="hidden md:flex flex-col items-start relative shrink-0 w-full overflow-visible">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start p-6 relative shrink-0 w-full overflow-visible">
          {/* Nome */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Nome completo
            </label>
            <div className="relative w-full">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type="text"
                placeholder="Digite seu nome completo"
                value={formData.nome}
                onChange={(e) => handleInputChange("nome", e.target.value)}
                className={`pl-10 h-12 ${errors.nome ? "border-red-9 focus-visible:border-red-9" : ""
                  }`}
                aria-invalid={!!errors.nome}
              />
            </div>
            {errors.nome && (
              <p className="text-sm text-red-9 font-family-dm-sans">{errors.nome}</p>
            )}
          </div>

          {/* Nacionalidade */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Nacionalidade
            </label>
            <div className="w-full relative" ref={nationalityDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setShowNationalityDropdown((v) => !v);
                  if (!showNationalityDropdown) setNationalitySearch("");
                }}
                className="border border-gray-6 rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors cursor-pointer text-left"
              >
                <div className="flex gap-1 items-center flex-1 min-w-0">
                  <FlagIcon className="w-5 h-5 text-gray-11 shrink-0" />
                  <span
                    className={`font-normal text-base leading-[1.3] font-family-dm-sans truncate ${formData.nacionalidade
                      ? "text-gray-12"
                      : "text-gray-11"
                      }`}
                  >
                    {formData.nacionalidade || "Selecione"}
                  </span>
                </div>
                <ArrowButton isOpen={showNationalityDropdown} />
              </button>
              {showNationalityDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 z-60 bg-gray-1 border border-gray-6 rounded-lg shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-gray-6">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-11" />
                      <input
                        type="text"
                        placeholder="Pesquisar país"
                        value={nationalitySearch}
                        onChange={(e) => setNationalitySearch(e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full h-9 pl-8 pr-3 rounded-md border border-gray-6 bg-gray-2 text-sm font-family-dm-sans text-gray-12 placeholder:text-gray-10 focus:outline-none focus:ring-2 focus:ring-primary-8 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="max-h-[220px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {filteredNacionalidadeOptions.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-gray-11 font-family-dm-sans text-center">
                        Nenhum país encontrado
                      </div>
                    ) : (
                      filteredNacionalidadeOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            handleInputChange("nacionalidade", option.label);
                            setShowNationalityDropdown(false);
                          }}
                          className="w-full px-3 py-2.5 text-left text-sm font-family-dm-sans text-gray-12 hover:bg-gray-3 transition-colors"
                        >
                          {option.label}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {errors.nacionalidade && (
              <p className="text-sm text-red-9 font-family-dm-sans">
                {errors.nacionalidade}
              </p>
            )}
          </div>

          {/* CPF */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              CPF
            </label>
            <div className="relative w-full">
              <CPFIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type="text"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={(e) => handleCPFChange(e.target.value)}
                maxLength={14}
                className={`pl-10 h-12 ${errors.cpf ? "border-red-9 focus-visible:border-red-9" : ""
                  }`}
                aria-invalid={!!errors.cpf}
              />
            </div>
            {errors.cpf && (
              <p className="text-sm text-red-9 font-family-dm-sans">{errors.cpf}</p>
            )}
          </div>

          {/* Data de nascimento */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Data de nascimento
            </label>
            <div className="w-full">
              <DatePickerWithConfirm
                value={formData.dataNascimento}
                onChange={(date) => {
                  setFormData((prev) => ({
                    ...prev,
                    dataNascimento: date,
                  }));
                  if (errors.dataNascimento && date) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.dataNascimento;
                      return newErrors;
                    });
                  }
                }}
                error={!!errors.dataNascimento}
              />
            </div>
            {errors.dataNascimento && (
              <p className="text-sm text-red-9 font-family-dm-sans">
                {errors.dataNascimento}
              </p>
            )}
          </div>

          {/* Telefone */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Telefone
            </label>
            <div className="relative w-full">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type="tel"
                placeholder="(00) 99999-9999"
                value={formData.telefone}
                onChange={(e) => handlePhoneChange("telefone", e.target.value)}
                maxLength={15}
                className={`pl-10 h-12 ${errors.telefone
                  ? "border-red-9 focus-visible:border-red-9"
                  : ""
                  }`}
                aria-invalid={!!errors.telefone}
              />
            </div>
            {errors.telefone && (
              <p className="text-sm text-red-9 font-family-dm-sans">
                {errors.telefone}
              </p>
            )}
          </div>

          {/* Sexo */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Sexo
            </label>
            <div className="w-full">
              <Dropdown
                width="w-full"
                className="z-60"
                trigger={(open: boolean) => (
                  <div className="border border-gray-6 rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors cursor-pointer">
                    <div className="flex gap-1 items-center flex-1 min-w-0">
                      <HeartIcon className="w-5 h-5 text-gray-11 shrink-0" />
                      <span
                        className={`font-normal text-base leading-[1.3] font-family-dm-sans truncate ${formData.sexo ? "text-gray-12" : "text-gray-11"
                          }`}
                      >
                        {formData.sexo || "Selecione"}
                      </span>
                    </div>
                    <div className="flex-none -scale-y-100 shrink-0">
                      <ArrowButton isOpen={open} />
                    </div>
                  </div>
                )}
                options={sexoOptions}
                onSelect={(option) => handleInputChange("sexo", option.label)}
              />
            </div>
            {errors.sexo && (
              <p className="text-sm text-red-9 font-family-dm-sans">{errors.sexo}</p>
            )}
          </div>
        </div>

        {/* Desktop: step 2 = último passo, botão Criar conta / Finalizar cadastro */}
        <div className="flex flex-col items-end justify-end pb-8 pt-4 px-6 relative shrink-0 w-full gap-4">
          {!isCompletingProfile && TURNSTILE_SITE_KEY && (
            <Turnstile
              ref={desktopTurnstileRef}
              siteKey={TURNSTILE_SITE_KEY}
              onSuccess={setTurnstileToken}
              onError={() => setTurnstileToken(null)}
              onExpire={() => setTurnstileToken(null)}
              options={{ theme: "auto", size: "flexible" }}
              className="w-full"
            />
          )}
          <Button
            onClick={handleNext}
            disabled={isSubmitting || authLoading || (!isCompletingProfile && !!TURNSTILE_SITE_KEY && !turnstileToken)}
            className="px-8 font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || authLoading
              ? isCompletingProfile
                ? "Finalizando cadastro..."
                : "Criando conta..."
              : isCompletingProfile
                ? "Finalizar cadastro"
                : "Criar conta"}
          </Button>
        </div>
      </div>
    </>
  );

  const renderStep2Mobile = () => (
    <>
      {/* Mobile Header */}
      <div className="md:hidden border-b border-gray-6 flex items-center justify-center h-[52px] px-4 py-2 relative shrink-0 w-full">
        <div className="flex gap-2 items-center flex-1">
          {!isCompletingProfile && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center shrink-0 size-8 transition-colors rotate-90 cursor-pointer hover:bg-gray-3 rounded-lg"
              aria-label="Voltar"
            >
              <ArrowButton isOpen={true} />
            </button>
          )}
          <p className="font-medium text-base leading-[1.3] text-gray-12 font-family-dm-sans">
            Dados de acesso a conta
          </p>
        </div>
      </div>

      {/* Mobile Form content */}
      <div className="md:hidden flex flex-col gap-8 items-center px-4 py-6 relative shrink-0 w-full overflow-y-auto">
        <div className="flex flex-col gap-5 items-start relative shrink-0 w-full">
          {/* Email input */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Email
            </label>
            <div className="relative w-full">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type="email"
                placeholder="Digite seu email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                disabled={isCompletingProfile}
                className={`pl-10 h-12 ${errors.email ? "border-red-9 focus-visible:border-red-9" : ""
                  } ${isCompletingProfile ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                aria-invalid={!!errors.email}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-9 font-family-dm-sans">{errors.email}</p>
            )}
          </div>

          {/* Password input */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Criar uma senha
            </label>
            <div className="relative w-full">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Digite uma senha"
                value={formData.senha}
                onChange={(e) => handleInputChange("senha", e.target.value)}
                className={`pl-10 pr-10 h-12 ${errors.senha ? "border-red-9 focus-visible:border-red-9" : ""}`}
                aria-invalid={!!errors.senha}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            {errors.senha && (
              <p className="text-sm text-red-9 font-family-dm-sans">{errors.senha}</p>
            )}
          </div>

          {/* Confirm password input */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Sua senha novamente
            </label>
            <div className="relative w-full">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Digite novamente"
                value={formData.confirmarSenha}
                onChange={(e) => handleInputChange("confirmarSenha", e.target.value)}
                className={`pl-10 pr-10 h-12 ${errors.confirmarSenha ? "border-red-9 focus-visible:border-red-9" : ""}`}
                aria-invalid={!!errors.confirmarSenha}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors"
                aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showConfirmPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            {errors.confirmarSenha && (
              <p className="text-sm text-red-9 font-family-dm-sans">
                {errors.confirmarSenha}
              </p>
            )}
          </div>
        </div>

        {/* Mobile: step 1 = dados de acesso, botão Próximo */}
        <div className="flex flex-col items-start relative shrink-0 w-full">
          <Button
            onClick={handleNext}
            disabled={isSubmitting || authLoading}
            className="w-full h-12 bg-primary-11 text-primary-2 hover:bg-primary-10 font-bold text-lg font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || authLoading ? "Criando conta..." : "Próximo"}
          </Button>
        </div>
      </div>
    </>
  );

  const renderStep2 = () => (
    <>
      {/* Desktop Header */}
      <div className="hidden md:flex border-b border-gray-6 gap-0.5 items-center px-4 py-3 relative shrink-0 w-full overflow-visible">
        {!isCompletingProfile && (
          <button
            onClick={handleBack}
            className="flex items-center justify-center rounded-lg shrink-0 size-8 transition-colors rotate-90 cursor-pointer hover:bg-gray-3"
            aria-label="Voltar"
          >
            <ArrowButton isOpen={true} />
          </button>
        )}
        <p className="font-semibold text-xl leading-[1.3] text-gray-12 font-family-dm-sans">
          Dados de acesso a conta
        </p>
      </div>

      {/* Desktop Form content */}
      <div className="hidden md:flex flex-col items-start relative shrink-0 w-full overflow-visible">
        {/* Input fields */}
        <div className="flex flex-col gap-6 items-start p-6 relative shrink-0 w-full">
          {/* Email input */}
          <div className="flex flex-col gap-2 items-start min-w-[230px] relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Email
            </label>
            <div className="relative w-full">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type="email"
                placeholder="Digite seu email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                disabled={isCompletingProfile}
                className={`pl-10 h-12 ${errors.email ? "border-red-9 focus-visible:border-red-9" : ""
                  } ${isCompletingProfile ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                aria-invalid={!!errors.email}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-9 font-family-dm-sans">{errors.email}</p>
            )}
          </div>

          {/* Password input - oculto quando for completar cadastro */}
          {!isCompletingProfile && (
            <>
              <div className="flex flex-col gap-2 items-start min-w-[230px] relative shrink-0 w-full">
                <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                  Criar uma senha
                </label>
                <div className="relative w-full">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite uma senha"
                    value={formData.senha}
                    onChange={(e) => handleInputChange("senha", e.target.value)}
                    className={`pl-10 pr-10 h-12 ${errors.senha ? "border-red-9 focus-visible:border-red-9" : ""}`}
                    aria-invalid={!!errors.senha}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
                {errors.senha && (
                  <p className="text-sm text-red-9 font-family-dm-sans">
                    {errors.senha}
                  </p>
                )}
              </div>

              {/* Confirm password input */}
              <div className="flex flex-col gap-2 items-start min-w-[230px] relative shrink-0 w-full">
                <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                  Sua senha novamente
                </label>
                <div className="relative w-full">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Digite novamente"
                    value={formData.confirmarSenha}
                    onChange={(e) => handleInputChange("confirmarSenha", e.target.value)}
                    className={`pl-10 pr-10 h-12 ${errors.confirmarSenha ? "border-red-9 focus-visible:border-red-9" : ""}`}
                    aria-invalid={!!errors.confirmarSenha}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors"
                    aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showConfirmPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
                {errors.confirmarSenha && (
                  <p className="text-sm text-red-9 font-family-dm-sans">
                    {errors.confirmarSenha}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Desktop: step 1 = dados de acesso, botão Próximo */}
        <div className="flex flex-col items-end justify-end pb-8 pt-4 px-6 relative shrink-0 w-full">
          <Button
            onClick={handleNext}
            disabled={isSubmitting || authLoading}
            className="px-8 font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || authLoading ? "Criando conta..." : "Próximo"}
          </Button>
        </div>
      </div>
    </>
  );

  const renderStep3 = () => (
    <>
      {/* Success content */}
      <div className="flex flex-col items-center justify-center relative shrink-0 w-full">
        <div className="flex flex-col gap-4 items-center justify-center pb-[52px] pt-6 px-6 relative shrink-0 w-full max-w-[460px] mx-auto">
          <Image src="/images/successIcon.png" alt="Success" width={100} height={100} />

          <div className="flex flex-col gap-4 items-center justify-center relative shrink-0 w-full">
            <h2 className="font-extrabold text-xl leading-[1.1] text-gray-12 font-manrope text-center">
              Cadastro realizado!
            </h2>
            <div className="font-normal text-base leading-[1.3] text-gray-11 text-center font-family-dm-sans">
              <p className="mb-0">Sua conta PódioTicket foi criada.</p>
            </div>
          </div>
        </div>

        {/* Continue button */}
        <div className="flex flex-col items-center justify-center pb-8 pt-4 px-6 relative shrink-0 w-full">
          <Button onClick={handleFinish} className="px-8 font-bold text-xl">
            Continuar navegando
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile Version */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-99999 bg-gray-2 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-gray-1 rounded-t-[12px] min-h-full relative overflow-hidden"
            >
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div
                    key="step1-mobile"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderStep2Mobile()}
                  </motion.div>
                )}
                {currentStep === 2 && (
                  <motion.div
                    key="step2-mobile"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderStep1Mobile()}
                  </motion.div>
                )}
                {currentStep === 3 && (
                  <motion.div
                    key="step3-mobile"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                  >
                    {renderStep3()}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          {/* Desktop Version */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden md:flex fixed inset-0 z-99999 items-center justify-center bg-black/50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-gray-1 rounded-xl shadow-2xl w-full max-w-[600px] mx-4 relative overflow-visible"
            >
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div
                    key="step1-desktop"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderStep2()}
                  </motion.div>
                )}
                {currentStep === 2 && (
                  <motion.div
                    key="step2-desktop"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderStep1()}
                  </motion.div>
                )}
                {currentStep === 3 && (
                  <motion.div
                    key="step3-desktop"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                  >
                    {renderStep3()}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
