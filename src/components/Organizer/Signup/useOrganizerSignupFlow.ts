"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ZodError } from "zod";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { lookupCepDigits } from "@/utils/lookupCep";
import { lookupCnpjDigits } from "@/utils/lookupCnpj";
import { onlyDigits, formatCEP, formatPhone } from "@/utils/masks";
import { ORGANIZER_CONTRACT_IDS } from "@/data/organizerContracts";
import {
  accessStepSchema,
  personTypeStepSchema,
  orgDataStepSchema,
  addressStepSchema,
  contactsStepSchema,
  buildOrganizerSignupPayload,
  emptyOrganizerSignupForm,
  type OrganizerSignupFormData,
  type PersonType,
} from "@/validators/OrganizerSignup.validator";

/** Chaves das etapas, na ordem do wizard. */
export type SignupStepKey =
  | "access"
  | "type"
  | "orgData"
  | "address"
  | "contacts"
  | "contracts"
  | "done";

interface StepMeta {
  key: SignupStepKey;
  title: string;
  subtitle: string;
}

const STEP_META: StepMeta[] = [
  {
    key: "access",
    title: "Dados de acesso",
    subtitle: "E-mail e senha para entrar na sua conta de organizador.",
  },
  {
    key: "type",
    title: "Como você organiza seus eventos?",
    subtitle: "Isso define quais informações serão solicitadas nas próximas etapas",
  },
  {
    key: "orgData",
    title: "Dados da organização",
    subtitle: "Informe os dados da organização responsável pela realização dos eventos",
  },
  {
    key: "address",
    title: "Endereço",
    subtitle: "Informe o endereço da organização.",
  },
  {
    key: "contacts",
    title: "Contatos da organização",
    subtitle: "Informe os meios de contato da organização.",
  },
  {
    key: "contracts",
    title: "Antes de começar, revise os contratos",
    subtitle:
      "Abra cada documento para ler. Você precisa aceitar os quatro para usar a plataforma.",
  },
  {
    // Tela de sucesso (sem cabeçalho/voltar) — renderizada de forma custom.
    key: "done",
    title: "",
    subtitle: "",
  },
];

const CONTRACTS_STEP_INDEX = STEP_META.findIndex((s) => s.key === "contracts");
const DONE_STEP_INDEX = STEP_META.findIndex((s) => s.key === "done");

/**
 * Máquina de passos do auto-cadastro de organizador (single-page). Estado só em
 * memória — nada de senha/PII em storage; recarregar reinicia o fluxo. Espelha
 * o padrão de `useRegisterFlow` (currentStep + validação Zod por etapa +
 * applyZodErrors), sem persistência.
 */
export function useOrganizerSignupFlow() {
  const router = useRouter();
  const orgNav = useOrganizerNavigate();
  const { signupOrganizer } = useAuth();

  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState<OrganizerSignupFormData>({
    ...emptyOrganizerSignupForm,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [acceptedContracts, setAcceptedContracts] = useState<Set<string>>(
    () => new Set(),
  );
  const lastFetchedCepRef = useRef<string>("");
  const lastFetchedCnpjRef = useRef<string>("");

  const allContractsAccepted =
    ORGANIZER_CONTRACT_IDS.length > 0 &&
    ORGANIZER_CONTRACT_IDS.every((id) => acceptedContracts.has(id));

  const acceptContract = useCallback((id: string) => {
    setAcceptedContracts((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  /** Marca/desmarca o aceite de um contrato (usado pelo leitor). */
  const setContractAccepted = useCallback((id: string, accepted: boolean) => {
    setAcceptedContracts((prev) => {
      if (accepted === prev.has(id)) return prev;
      const next = new Set(prev);
      if (accepted) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  /** Aceita/limpa TODOS os contratos de uma vez (checkbox mestre). */
  const setAllContractsAccepted = useCallback((accepted: boolean) => {
    setAcceptedContracts(accepted ? new Set(ORGANIZER_CONTRACT_IDS) : new Set());
  }, []);

  const currentMeta = STEP_META[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEP_META.length - 1;

  const setField = useCallback(
    (name: keyof OrganizerSignupFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [name]: value }));
      setErrors((prev) => {
        if (!prev[name]) return prev;
        const next = { ...prev };
        delete next[name as string];
        return next;
      });
    },
    [],
  );

  /** Aplica erros do Zod ao mapa `errors` + toast da 1ª issue. */
  const applyZodErrors = useCallback((error: ZodError) => {
    const next: Record<string, string> = {};
    error.issues.forEach((issue) => {
      const path = issue.path[0];
      if (path != null) next[String(path)] = issue.message;
    });
    setErrors(next);
    const first = error.issues[0];
    if (first) toast.error(first.message);
  }, []);

  /** Valida a etapa atual; retorna true se ok. */
  const validateCurrentStep = useCallback((): boolean => {
    // Etapa de contratos: gate por aceite dos 4 (não é Zod).
    if (currentMeta.key === "contracts") {
      if (!allContractsAccepted) {
        toast.error("Leia e aceite os quatro contratos para continuar.");
        return false;
      }
      return true;
    }
    if (currentMeta.key === "done") return true;

    try {
      switch (currentMeta.key) {
        case "access":
          accessStepSchema.parse(formData);
          break;
        case "type":
          personTypeStepSchema.parse(formData);
          break;
        case "orgData":
          orgDataStepSchema(formData.personType).parse(formData);
          break;
        case "address":
          addressStepSchema.parse(formData);
          break;
        case "contacts":
          contactsStepSchema.parse(formData);
          break;
      }
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof ZodError) applyZodErrors(err);
      return false;
    }
  }, [currentMeta.key, formData, allContractsAccepted, applyZodErrors]);

  /**
   * Cria a conta (na etapa de contratos). O backend autologa (cookies
   * organizer). Em caso de sucesso avança para a tela de conclusão; em erro
   * permanece na etapa para o usuário corrigir/reenviar.
   */
  const submit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const payload = buildOrganizerSignupPayload(formData, turnstileToken);
      await signupOrganizer(payload);
      setStepIndex(DONE_STEP_INDEX);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao criar conta de organizador.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, turnstileToken, signupOrganizer]);

  const handleNext = useCallback(() => {
    if (!validateCurrentStep()) return;
    // A etapa de contratos é o ponto de submit (cria a conta → conclusão).
    if (currentMeta.key === "contracts") {
      void submit();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, CONTRACTS_STEP_INDEX));
  }, [validateCurrentStep, currentMeta.key, submit]);

  const handleBack = useCallback(() => {
    if (currentMeta.key === "done") return; // sucesso não volta
    if (isFirstStep) {
      // Sai do wizard de volta ao login do organizador.
      orgNav.push("/organizer/login");
      return;
    }
    setErrors({});
    setStepIndex((i) => Math.max(i - 1, 0));
  }, [currentMeta.key, isFirstStep, orgNav]);

  /** Botão "Entrar na plataforma" da tela de conclusão. */
  const goToPlatform = useCallback(() => {
    router.refresh();
    orgNav.push("/organizer/events");
  }, [router, orgNav]);

  const selectPersonType = useCallback(
    (type: PersonType) => setField("personType", type),
    [setField],
  );

  /**
   * CNPJ com máscara já aplicada; ao completar 14 dígitos consulta a Receita
   * (cnpj.ws + fallback BrasilAPI) e autopreenche organização + endereço +
   * contatos — assim as próximas etapas já chegam preenchidas. Espelha
   * `handleZipChange`; a API sempre vence quando traz o campo (`valor || prev`).
   */
  const handleCnpjChange = useCallback((masked: string) => {
    setField("document", masked);
    const digits = onlyDigits(masked);
    if (digits.length === 14 && digits !== lastFetchedCnpjRef.current) {
      lastFetchedCnpjRef.current = digits;
      void (async () => {
        setLoadingCnpj(true);
        try {
          const result = await lookupCnpjDigits(digits);
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          const { data } = result;
          const phoneDigits = onlyDigits(data.phone);
          setFormData((prev) => ({
            ...prev,
            // Organização
            legalName: data.legalName || prev.legalName,
            tradeName: data.tradeName || prev.tradeName,
            ownerName: data.responsibleName || prev.ownerName,
            // Endereço (próxima etapa) — pré-preenchido
            zipCode: data.zipCode ? formatCEP(data.zipCode) : prev.zipCode,
            street: data.street || prev.street,
            number: data.number || prev.number,
            neighborhood: data.neighborhood || prev.neighborhood,
            city: data.city || prev.city,
            state: data.state || prev.state,
            // Contatos (próxima etapa) — pré-preenchidos
            orgEmail: data.email || prev.orgEmail,
            // 11 dígitos = celular → WhatsApp; 10 = fixo → Telefone.
            whatsapp:
              phoneDigits.length === 11
                ? formatPhone(phoneDigits)
                : prev.whatsapp,
            phone:
              phoneDigits.length > 0 && phoneDigits.length < 11
                ? formatPhone(phoneDigits)
                : prev.phone,
          }));
          // O CEP já veio preenchido; evita refetch redundante ao abrir o endereço.
          if (data.zipCode) lastFetchedCepRef.current = onlyDigits(data.zipCode);
          toast.success("Dados do CNPJ preenchidos!");
        } finally {
          setLoadingCnpj(false);
        }
      })();
    } else if (digits.length < 14) {
      lastFetchedCnpjRef.current = "";
    }
  }, [setField]);

  /** CEP com máscara já aplicada; autopreenche endereço ao completar 8 dígitos. */
  const handleZipChange = useCallback((masked: string) => {
    setField("zipCode", masked);
    const cepDigits = onlyDigits(masked);
    if (cepDigits.length === 8 && cepDigits !== lastFetchedCepRef.current) {
      lastFetchedCepRef.current = cepDigits;
      void (async () => {
        setLoadingCep(true);
        try {
          const result = await lookupCepDigits(cepDigits);
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          const { data } = result;
          setFormData((prev) => ({
            ...prev,
            state: data.uf || prev.state,
            street: data.logradouro || prev.street,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
          }));
          toast.success("Endereço encontrado!");
        } finally {
          setLoadingCep(false);
        }
      })();
    } else if (cepDigits.length < 8) {
      lastFetchedCepRef.current = "";
    }
  }, [setField]);

  // Sem useMemo manual: o React Compiler (ativo no projeto) memoiza o retorno;
  // um useMemo com deps incompletas quebraria o lint.
  return {
    stepIndex,
    currentMeta,
    totalSteps: STEP_META.length,
    isFirstStep,
    isLastStep,
    formData,
    errors,
    isSubmitting,
    loadingCep,
    loadingCnpj,
    turnstileToken,
    setTurnstileToken,
    acceptedContracts,
    acceptContract,
    setContractAccepted,
    setAllContractsAccepted,
    allContractsAccepted,
    setField,
    selectPersonType,
    handleCnpjChange,
    handleZipChange,
    handleNext,
    handleBack,
    goToPlatform,
  };
}

export type OrganizerSignupFlow = ReturnType<typeof useOrganizerSignupFlow>;
