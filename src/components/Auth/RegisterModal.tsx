"use client";

import { useState } from "react";
import { useRegisterModal, useLoginModal } from "@/stores/modalStore";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import {
  Mail,
  Lock,
  User,
  Phone,
  Calendar as CalendarIconLucide,
  Flag,
  Heart,
  CreditCard,
  ArrowRight,
} from "lucide-react";
import { ArrowButton } from "../ArrowButton";
import { CalendarIcon } from "../Icons/CalendarIcon";
import { FlagIcon } from "../Icons/FlagIcon";
import { SuccessIcon } from "../Icons/SuccessIcon";
import { Calendar } from "@/components/ui/calendar";
import {
  registerStep1Schema,
  registerStep2Schema,
  type RegisterStep1FormData,
  type RegisterStep2FormData,
} from "@/validators/Auth.validator";
import { ZodError } from "zod";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

type RegisterStep = 1 | 2 | 3;

export function RegisterModal() {
  const { isOpen, closeRegisterModal } = useRegisterModal();
  const { openLoginModal } = useLoginModal();
  const { register, isLoading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState<RegisterStep>(1);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data state
  const [formData, setFormData] = useState({
    // Step 1: Personal Information
    nome: "",
    nacionalidade: "",
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

  // Validation errors state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Format date for display
  const formatDate = (date: Date | null) => {
    if (!date) return "00/00/0000";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

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

  const handleNext = async () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      if (validateStep2()) {
        // Quando valida o passo 2, faz o registro
        await handleRegister();
      }
    }
  };

  const handleRegister = async () => {
    setIsSubmitting(true);
    try {
      // Prepara os dados para o registro conforme EmailRegisterDto
      const registerData: any = {
        email: formData.email,
        password: formData.senha,
        complete_name: formData.nome.trim(), // Nome completo
        acceptedTerms: true, // Assumindo que o usuário aceitou os termos ao chegar no passo 3
        acceptedPrivacyPolicy: true, // Assumindo que o usuário aceitou a política ao chegar no passo 3
      };

      // Campos opcionais conforme o DTO
      if (formData.sexo) {
        registerData.sex = formData.sexo;
      }
      if (formData.telefone) {
        registerData.phone = formData.telefone.replace(/\D/g, ""); // Remove formatação
      }
      if (formData.telefoneEmergencia) {
        registerData.reserve_phone = formData.telefoneEmergencia.replace(
          /\D/g,
          ""
        ); // Remove formatação
      }
      if (formData.dataNascimento) {
        // Converte Date para string no formato YYYY-MM-DD
        const date = formData.dataNascimento;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        registerData.dateOfBirth = `${year}-${month}-${day}`;
      }
      if (formData.nacionalidade) {
        registerData.country = formData.nacionalidade;
      }
      if (formData.cpf) {
        // CPF vai como documentNumber com documentType "CPF"
        registerData.documentNumber = formData.cpf.replace(/\D/g, ""); // Remove formatação
        registerData.documentType = "CPF"; // Assumindo que CPF é o tipo de documento
      }

      await register(registerData);

      // Se o registro for bem-sucedido, vai para o passo 3 (sucesso)
      setCurrentStep(3);
      toast.success("Cadastro realizado com sucesso!");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erro ao realizar cadastro. Tente novamente.";
      toast.error(errorMessage);
      // Não avança para o passo 3 se houver erro
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    closeRegisterModal();
    router.push("/");
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

  // Nacionalidade options
  const nacionalidadeOptions = [
    { id: "brasil", label: "Brasil" },
    { id: "argentina", label: "Argentina" },
    { id: "chile", label: "Chile" },
    { id: "outro", label: "Outro" },
  ];

  // Sexo options
  const sexoOptions = [
    { id: "masculino", label: "Masculino" },
    { id: "feminino", label: "Feminino" },
    { id: "outro", label: "Outro" },
    { id: "prefiro-nao-dizer", label: "Prefiro não dizer" },
  ];

  const renderStep1 = () => (
    <>
      {/* Header */}
      <div className="border-b border-gray-6 flex gap-0.5 items-center px-4 py-3 relative shrink-0 w-full overflow-visible">
        <button
          onClick={handleBack}
          className="flex items-center justify-center rounded-lg shrink-0 size-8 transition-colors rotate-90 cursor-pointer hover:bg-gray-3"
          aria-label="Voltar"
        >
          <ArrowButton isOpen={true} />
        </button>
        <p className="font-semibold text-xl leading-[1.3] text-gray-12 font-dm-sans">
          Informações pessoais
        </p>
      </div>

      {/* Form content */}
      <div className="flex flex-col items-start relative shrink-0 w-full overflow-visible">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start p-6 relative shrink-0 w-full overflow-visible">
          {/* Nome */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-dm-sans">
              Nome
            </label>
            <div className="relative w-full">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type="text"
                placeholder="Digite seu nome completo"
                value={formData.nome}
                onChange={(e) => handleInputChange("nome", e.target.value)}
                className={`pl-10 h-12 ${
                  errors.nome ? "border-red-9 focus-visible:border-red-9" : ""
                }`}
                aria-invalid={!!errors.nome}
              />
            </div>
            {errors.nome && (
              <p className="text-sm text-red-9 font-dm-sans">{errors.nome}</p>
            )}
          </div>

          {/* Nacionalidade */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-dm-sans">
              Nacionalidade
            </label>
            <div className="w-full">
              <Dropdown
                width="w-full"
                className="z-60"
                trigger={(open: boolean) => (
                  <div className="border border-gray-7 rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors cursor-pointer">
                    <div className="flex gap-1 items-center flex-1 min-w-0">
                      <FlagIcon className="w-5 h-5 text-gray-11 shrink-0" />
                      <span className="font-normal text-base leading-[1.3] text-gray-11 font-dm-sans truncate">
                        {formData.nacionalidade || "Selecione"}
                      </span>
                    </div>
                    <ArrowButton isOpen={open} />
                  </div>
                )}
                options={nacionalidadeOptions}
                onSelect={(option) => {
                  handleInputChange("nacionalidade", option.label);
                }}
              />
            </div>
            {errors.nacionalidade && (
              <p className="text-sm text-red-9 font-dm-sans">
                {errors.nacionalidade}
              </p>
            )}
          </div>

          {/* CPF */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-dm-sans">
              CPF
            </label>
            <div className="relative w-full">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type="text"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={(e) => handleCPFChange(e.target.value)}
                maxLength={14}
                className={`pl-10 h-12 ${
                  errors.cpf ? "border-red-9 focus-visible:border-red-9" : ""
                }`}
                aria-invalid={!!errors.cpf}
              />
            </div>
            {errors.cpf && (
              <p className="text-sm text-red-9 font-dm-sans">{errors.cpf}</p>
            )}
          </div>

          {/* Data de nascimento */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-dm-sans">
              Data de nascimento
            </label>
            <div className="w-full">
              <Dropdown
                width="w-full"
                className="z-60"
                trigger={(open: boolean) => (
                  <div
                    className={`border rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors cursor-pointer ${
                      errors.dataNascimento ? "border-red-9" : "border-gray-7"
                    }`}
                  >
                    <div className="flex gap-1 items-center flex-1 min-w-0">
                      <CalendarIconLucide className="w-5 h-5 text-gray-11 shrink-0" />
                      <span className="font-normal text-base leading-[1.3] text-gray-11 font-dm-sans truncate">
                        {formatDate(formData.dataNascimento)}
                      </span>
                    </div>
                    <ArrowButton isOpen={open} />
                  </div>
                )}
              >
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  fromYear={1900}
                  toYear={new Date().getFullYear()}
                  selected={formData.dataNascimento || undefined}
                  onSelect={(date: Date | undefined) => {
                    setFormData((prev) => ({
                      ...prev,
                      dataNascimento: date || null,
                    }));
                    // Clear error when date is selected
                    if (errors.dataNascimento && date) {
                      setErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.dataNascimento;
                        return newErrors;
                      });
                    }
                  }}
                  disabled={(date: Date) => {
                    const today = new Date();
                    today.setHours(23, 59, 59, 999);
                    return date > today;
                  }}
                  className="rounded-md border-0 bg-transparent w-full"
                />
              </Dropdown>
            </div>
            {errors.dataNascimento && (
              <p className="text-sm text-red-9 font-dm-sans">
                {errors.dataNascimento}
              </p>
            )}
          </div>

          {/* Telefone */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-dm-sans">
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
                className={`pl-10 h-12 ${
                  errors.telefone
                    ? "border-red-9 focus-visible:border-red-9"
                    : ""
                }`}
                aria-invalid={!!errors.telefone}
              />
            </div>
            {errors.telefone && (
              <p className="text-sm text-red-9 font-dm-sans">
                {errors.telefone}
              </p>
            )}
          </div>

          {/* Telefone de emergência */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-dm-sans">
              Telefone de emergência
            </label>
            <div className="relative w-full">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type="tel"
                placeholder="(00) 99999-9999"
                value={formData.telefoneEmergencia}
                onChange={(e) =>
                  handlePhoneChange("telefoneEmergencia", e.target.value)
                }
                maxLength={15}
                className={`pl-10 h-12 ${
                  errors.telefoneEmergencia
                    ? "border-red-9 focus-visible:border-red-9"
                    : ""
                }`}
                aria-invalid={!!errors.telefoneEmergencia}
              />
            </div>
            {errors.telefoneEmergencia && (
              <p className="text-sm text-red-9 font-dm-sans">
                {errors.telefoneEmergencia}
              </p>
            )}
          </div>

          {/* Sexo */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-dm-sans">
              Sexo
            </label>
            <div className="w-full">
              <Dropdown
                width="w-full"
                className="z-60"
                trigger={(open: boolean) => (
                  <div className="border border-gray-7 rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors cursor-pointer">
                    <div className="flex gap-1 items-center flex-1 min-w-0">
                      <Heart className="w-5 h-5 text-gray-11 shrink-0" />
                      <span className="font-normal text-base leading-[1.3] text-gray-11 font-dm-sans truncate">
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
              <p className="text-sm text-red-9 font-dm-sans">{errors.sexo}</p>
            )}
          </div>
        </div>

        {/* Next button */}
        <div className="flex flex-col items-end justify-end pb-8 pt-4 px-6 relative shrink-0 w-full">
          <Button onClick={handleNext} className="px-8 font-bold text-xl">
            Próximo
          </Button>
        </div>
      </div>
    </>
  );

  const renderStep2 = () => (
    <>
      {/* Header */}
      <div className="border-b border-gray-6 flex gap-0.5 items-center px-4 py-3 relative shrink-0 w-full overflow-visible">
        <button
          onClick={handleBack}
          className="flex items-center justify-center rounded-lg shrink-0 size-8 transition-colors rotate-90 cursor-pointer hover:bg-gray-3"
          aria-label="Voltar"
        >
          <ArrowButton isOpen={true} />
        </button>
        <p className="font-semibold text-xl leading-[1.3] text-gray-12 font-dm-sans">
          Dados de acesso a conta
        </p>
      </div>

      {/* Form content */}
      <div className="flex flex-col items-start relative shrink-0 w-full overflow-visible">
        {/* Input fields */}
        <div className="flex flex-col gap-6 items-start p-6 relative shrink-0 w-full">
          {/* Email input */}
          <div className="flex flex-col gap-2 items-start min-w-[230px] relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-dm-sans">
              Email
            </label>
            <div className="relative w-full">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type="email"
                placeholder="Digite seu email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className={`pl-10 h-12 ${
                  errors.email ? "border-red-9 focus-visible:border-red-9" : ""
                }`}
                aria-invalid={!!errors.email}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-9 font-dm-sans">{errors.email}</p>
            )}
          </div>

          {/* Password input */}
          <div className="flex flex-col gap-2 items-start min-w-[230px] relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-dm-sans">
              Criar uma senha
            </label>
            <div className="relative w-full">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type="password"
                placeholder="Digite uma senha"
                value={formData.senha}
                onChange={(e) => handleInputChange("senha", e.target.value)}
                className={`pl-10 h-12 ${
                  errors.senha ? "border-red-9 focus-visible:border-red-9" : ""
                }`}
                aria-invalid={!!errors.senha}
              />
            </div>
            {errors.senha && (
              <p className="text-sm text-red-9 font-dm-sans">{errors.senha}</p>
            )}
          </div>

          {/* Confirm password input */}
          <div className="flex flex-col gap-2 items-start min-w-[230px] relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-dm-sans">
              Sua senha novamente
            </label>
            <div className="relative w-full">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type="password"
                placeholder="Digite novamente"
                value={formData.confirmarSenha}
                onChange={(e) =>
                  handleInputChange("confirmarSenha", e.target.value)
                }
                className={`pl-10 h-12 ${
                  errors.confirmarSenha
                    ? "border-red-9 focus-visible:border-red-9"
                    : ""
                }`}
                aria-invalid={!!errors.confirmarSenha}
              />
            </div>
            {errors.confirmarSenha && (
              <p className="text-sm text-red-9 font-dm-sans">
                {errors.confirmarSenha}
              </p>
            )}
          </div>
        </div>

        {/* Next button */}
        <div className="flex flex-col items-end justify-end pb-8 pt-4 px-6 relative shrink-0 w-full">
          <Button
            onClick={handleNext}
            disabled={isSubmitting || authLoading}
            className="px-8 font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || authLoading ? "Criando conta..." : "Criar conta"}
          </Button>
        </div>
      </div>
    </>
  );

  const renderStep3 = () => (
    <>
      {/* Success content */}
      <div className="flex flex-col items-center relative shrink-0 w-full">
        <div className="flex flex-col gap-4 items-center justify-center pb-[52px] pt-6 px-6 relative shrink-0 w-full max-w-[460px] mx-auto">
          {/* Success icon with glow effect */}
          <div className="relative flex items-center justify-center p-5">
            {/* Glow effects */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute bg-linear-to-t blur-sm from-gray-2 to-primary-5 h-[28px] w-[28px] top-[45.66%] left-1/2 -translate-x-1/2" />
              <div className="absolute bg-linear-to-b blur-sm from-primary-5 to-gray-2 h-[28px] w-[28px] bottom-[45.66%] left-1/2 -translate-x-1/2" />
              <div className="absolute bg-linear-to-l blur-sm from-primary-5 to-gray-2 h-[28px] w-[14px] left-[43.66%] top-1/2 -translate-y-1/2" />
              <div className="absolute bg-linear-to-r blur-sm from-primary-5 to-gray-2 h-[28px] w-[14px] right-[43.66%] top-1/2 -translate-y-1/2" />
              <div className="absolute bg-linear-to-br blur-sm from-primary-5 to-gray-2 h-[28px] w-[14px] top-[9.19%] left-[10.02%] rotate-45" />
              <div className="absolute bg-linear-to-br blur-sm from-primary-5 to-gray-2 h-[28px] w-[14px] bottom-[9.19%] left-[10.02%] -rotate-45" />
              <div className="absolute bg-linear-to-bl blur-sm from-primary-5 to-gray-2 h-[28px] w-[14px] top-[9.19%] right-[10.02%] -rotate-45" />
              <div className="absolute bg-linear-to-bl blur-sm from-primary-5 to-gray-2 h-[28px] w-[14px] bottom-[9.19%] right-[10.02%] rotate-45" />
            </div>
            <SuccessIcon className="relative z-10 w-[67px] h-[64px]" />
          </div>

          {/* Success text */}
          <div className="flex flex-col gap-4 items-center justify-center relative shrink-0 w-full">
            <h2 className="font-extrabold text-xl leading-[1.1] text-gray-12 font-manrope text-center">
              Cadastro realizado!
            </h2>
            <div className="font-normal text-base leading-[1.3] text-gray-11 text-center font-dm-sans">
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50"
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
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderStep1()}
                </motion.div>
              )}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderStep2()}
                </motion.div>
              )}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
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
      )}
    </AnimatePresence>
  );
}
