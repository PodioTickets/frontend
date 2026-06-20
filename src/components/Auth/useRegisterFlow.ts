import { useState, useEffect, useRef, useMemo } from "react";
import { useRegisterModal, useLoginModal } from "@/stores/modalStore";
import { clearReturnPath } from "@/utils/authRedirect";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services";
import type { AuthError } from "@/services/user/UserService";
import { ZodError } from "zod";
import toast from "react-hot-toast";
import { COUNTRIES_PT_BR } from "@/data/countries";
import { type TurnstileInstance } from "@marsidev/react-turnstile";
import {
  registerStep1aSchema,
  buildRegisterStep1bSchema,
  isBrazilianCountry,
  registerStep2Schema,
  type RegisterStep1aFormData,
  type RegisterStep1bFormData,
  type RegisterStep2FormData,
} from "@/validators/Auth.validator";
import {
  formatPhoneForCountry,
  getPhonePlaceholderForCountry,
  getPhoneMaxLengthForCountry,
  getPhoneDigitsForBackend,
} from "@/utils/phone";

// 1 = email/senha · 2 = nome+nacionalidade · 3 = resto dos dados pessoais · 4 = tela de sucesso (UX expõe 3 etapas; 4 é só confirmação pós-cadastro).
export type RegisterStep = 1 | 2 | 3 | 4;

/**
 * Máquina de estado do cadastro (steps 1-4: acesso → nome/nacionalidade → dados
 * pessoais → sucesso), incluindo o fluxo "completar perfil" pós Google OAuth.
 * Extraída do `RegisterModal` (Fase 2): estado, efeitos (reset ao fechar, prefill
 * do perfil, click-outside da nacionalidade), validações e handlers. Comportamento
 * idêntico ao que estava inline; o render (`renderStepX`) consome o retorno.
 */
export function useRegisterFlow() {
  const { isOpen, closeRegisterModal, data: modalData } = useRegisterModal();
  const { openLoginModal } = useLoginModal();
  const { register, isLoading: authLoading, user, refetchUser, logout } = useAuth();
  const [currentStep, setCurrentStep] = useState<RegisterStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  /* Aceite explícito dos termos de uso. Marca quando o usuário clica em
   * "Aceitar termos" no modal OU toggla o checkbox direto. Backend exige
   * acceptedTerms=true no /auth/register. */
  const [acceptedTermsChecked, setAcceptedTermsChecked] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const mobileTurnstileRef = useRef<TurnstileInstance>(null);
  const desktopTurnstileRef = useRef<TurnstileInstance>(null);

  // Verifica se é para completar cadastro
  const isCompletingProfile = modalData?.completeProfile === true && !!user;

  /* Botão "voltar" sempre visível. Normal: step 1 volta pro login. Google
   * (completar perfil): step 3 volta pro 2; step 2 (1ª tela) = desloga, pois o
   * usuário entrou via Google e não quer terminar o cadastro. */
  const canGoBack = true;

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
      setAcceptedTermsChecked(false);
      setShowTermsModal(false);
      mobileTurnstileRef.current?.reset();
      desktopTurnstileRef.current?.reset();
    }
  }, [isOpen]);

  useEffect(() => {
    // Não resetar se já estivermos na tela de sucesso (step 4) ou se o modal estiver fechado
    if (currentStep === 4 || !isOpen) {
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
    // Fluxo Google (completar perfil): começa no step 2.
    if (isCompletingProfile) {
      if (currentStep > 2) {
        setCurrentStep((prev) => (prev - 1) as RegisterStep);
      } else {
        // Step 2 é a 1ª tela do Google: voltar = não quer terminar o cadastro → desloga.
        logout();
        closeRegisterModal();
      }
      return;
    }
    if (currentStep === 1) {
      closeRegisterModal();
      openLoginModal();
    } else {
      setCurrentStep((prev) => (prev - 1) as RegisterStep);
    }
  };

  // Aplica erros do Zod no state + dispara toast da primeira issue.
  const applyZodErrors = (error: unknown): false => {
    if (error instanceof ZodError) {
      const newErrors: Record<string, string> = {};
      error.issues.forEach((err) => {
        if (err.path.length > 0) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      const firstError = error.issues[0];
      if (firstError) {
        toast.error(firstError.message);
      }
    }
    return false;
  };

  const validateStep1a = (): boolean => {
    try {
      const data: RegisterStep1aFormData = {
        nome: formData.nome,
        nacionalidade: formData.nacionalidade,
      };
      registerStep1aSchema.parse(data);
      setErrors({});
      return true;
    } catch (error) {
      return applyZodErrors(error);
    }
  };

  const validateStep1b = (): boolean => {
    try {
      const data: RegisterStep1bFormData = {
        cpf: formData.cpf,
        dataNascimento: formData.dataNascimento!,
        telefone: formData.telefone,
        telefoneEmergencia: formData.telefoneEmergencia || "",
        sexo: formData.sexo,
      };
      /* Schema dinâmico: para brasileiros (formData.nacionalidade BR/Brasil/Brazil)
       * exige CPF válido; para estrangeiros aceita documento genérico. */
      buildRegisterStep1bSchema(formData.nacionalidade).parse(data);
      setErrors({});
      return true;
    } catch (error) {
      return applyZodErrors(error);
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
      return applyZodErrors(error);
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
    /* Telefone: extrai dígitos nacionais via libphonenumber-js (BR: 11 dígitos,
     * US: 10, etc.). Sem fallback regex pra evitar enviar máscara residual. */
    if (data.telefone) updateData.phone = getPhoneDigitsForBackend(data.telefone, data.nacionalidade);
    if (data.telefoneEmergencia) updateData.emergencyPhone = getPhoneDigitsForBackend(data.telefoneEmergencia, data.nacionalidade);
    if (data.dataNascimento) {
      const date = data.dataNascimento;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      updateData.dateOfBirth = `${year}-${month}-${day}`;
    }
    if (data.nacionalidade) updateData.country = data.nacionalidade;
    if (data.cpf) {
      /* Brasileiros: strip de máscara para padronizar (xxx.xxx.xxx-xx → 11 dígitos).
       * Estrangeiros: documento vai cru (passaporte preserva letras). */
      if (isBrazilianCountry(data.nacionalidade)) {
        updateData.documentNumber = data.cpf.replace(/\D/g, "");
        updateData.documentType = "CPF";
      } else {
        updateData.documentNumber = data.cpf.trim();
        updateData.documentType = "PASSPORT";
      }
    }
    return updateData;
  };

  const handleNext = async () => {
    // Step 1: email + senha → valida, verifica disponibilidade do email, avança
    if (currentStep === 1) {
      if (!validateStep2()) return;
      if (!isCompletingProfile) {
        setIsSubmitting(true);
        try {
          const result = await userService.checkEmailAvailability(formData.email);
          if (!result.available) {
            setErrors((prev) => ({ ...prev, email: result.message || "Este e-mail já está cadastrado." }));
            toast.error(result.message || "Este e-mail já está cadastrado.");
            return;
          }
        } finally {
          setIsSubmitting(false);
        }
      }
      setCurrentStep(2);
      return;
    }

    // Step 2: nome + nacionalidade → valida e avança (sem hit no backend).
    if (currentStep === 2) {
      if (!validateStep1a()) return;
      setCurrentStep(3);
      return;
    }

    // Step 3: documentos + contato → valida tudo e dispara o cadastro.
    if (currentStep === 3) {
      if (!validateStep1b()) return;

      // Aceite de termos é obrigatório — botão já fica disabled, mas validamos
      // de novo aqui pra defender contra bypass via DevTools.
      if (!isCompletingProfile && !acceptedTermsChecked) {
        toast.error("É preciso aceitar os Termos de uso pra criar conta.");
        return;
      }

      setIsSubmitting(true);
      try {
        // Fluxo: completar perfil Google OAuth
        if (isCompletingProfile) {
          await userService.updateUser(user!.id, buildPersonalUpdateData(formData));
          await refetchUser();
          setCurrentStep(4);
          toast.success("Cadastro finalizado com sucesso!");
          setTimeout(() => {
            closeRegisterModal();
            clearReturnPath();
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
          /* Brasileiros: envia CPF formatado (backend faz strip de máscara).
           * Estrangeiros: envia documento cru e marca como PASSPORT. */
          documentNumber: formData.cpf,
          documentType: isBrazilianCountry(formData.nacionalidade) ? "CPF" : "PASSPORT",
          acceptedTerms: acceptedTermsChecked,
          acceptedPrivacyPolicy: acceptedTermsChecked,
        });

        setCurrentStep(4);
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

  /* Máscara/placeholder/length dinâmicos baseados na nacionalidade
   * selecionada. Usa libphonenumber-js — cobre todos os países. */
  const phonePlaceholder = getPhonePlaceholderForCountry(formData.nacionalidade);
  const phoneMaxLength = getPhoneMaxLengthForCountry(formData.nacionalidade);

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

  /* Aplica máscara CPF só para brasileiros. Estrangeiros podem digitar
   * passaporte/RNE livremente (letras + dígitos). */
  const isBrUser = isBrazilianCountry(formData.nacionalidade);
  const docLabel = isBrUser ? "CPF" : "Documento";
  const docPlaceholder = isBrUser ? "000.000.000-00" : "12345...";
  const docMaxLength = isBrUser ? 14 : 30;

  const handleCPFChange = (value: string) => {
    if (!isBrUser) {
      setFormData((prev) => ({ ...prev, cpf: value.slice(0, docMaxLength) }));
      if (errors.cpf) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.cpf;
          return next;
        });
      }
      return;
    }
    const masked = maskCPF(value);
    handleInputChange("cpf", masked);
  };

  const handlePhoneChange = (
    field: "telefone" | "telefoneEmergencia",
    value: string
  ) => {
    const masked = formatPhoneForCountry(value, formData.nacionalidade);
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

  return {
    // store / auth
    isOpen,
    closeRegisterModal,
    authLoading,
    user,
    isCompletingProfile,
    canGoBack,
    // navegação
    currentStep,
    handleBack,
    handleNext,
    handleFinish,
    isSubmitting,
    // formulário
    formData,
    setFormData,
    errors,
    setErrors,
    handleInputChange,
    handleCPFChange,
    handlePhoneChange,
    // visibilidade de senha
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    // documento / telefone derivados
    isBrUser,
    docLabel,
    docPlaceholder,
    docMaxLength,
    phonePlaceholder,
    phoneMaxLength,
    // nacionalidade
    showNationalityDropdown,
    setShowNationalityDropdown,
    nationalitySearch,
    setNationalitySearch,
    nationalityDropdownRef,
    filteredNacionalidadeOptions,
    sexoOptions,
    // termos
    acceptedTermsChecked,
    setAcceptedTermsChecked,
    showTermsModal,
    setShowTermsModal,
    // turnstile
    turnstileToken,
    setTurnstileToken,
    mobileTurnstileRef,
    desktopTurnstileRef,
  };
}
