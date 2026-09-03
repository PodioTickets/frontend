"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ZodError } from "zod";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { organizerService } from "@/services";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { lookupCepDigits } from "@/utils/lookupCep";
import { lookupCnpjDigits } from "@/utils/lookupCnpj";
import { onlyDigits, formatCEP, formatPhone } from "@/utils/masks";
import { ORGANIZER_CONTRACT_IDS } from "@/data/organizerContracts";
import { trackPlatformMetaPixel } from "@/lib/metaPixel";
import { trackPlatformSignupConversion } from "@/lib/googleTag";
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

const EMAIL_TAKEN_MSG = "Já existe uma conta de organizador com este e-mail.";
const ORG_EMAIL_TAKEN_MSG =
  "Já existe uma organização cadastrada com este e-mail de contato.";

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
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isCheckingOrgEmail, setIsCheckingOrgEmail] = useState(false);
  // `true` só quando o "Nome do responsável" veio da Receita (PJ) — nesse caso o
  // campo é read-only (fonte autoritativa). Quando cai no fallback do nome completo
  // (etapa 1), o campo segue editável para o organizador poder corrigir.
  const [ownerNameFromReceita, setOwnerNameFromReceita] = useState(false);
  const lastFetchedCepRef = useRef<string>("");
  const lastFetchedCnpjRef = useRef<string>("");
  // Dígitos do CNPJ CONFIRMADO pela Receita (lookup ok = existe + válido). Estado
  // (reativo) porque governa DUAS coisas: (1) o reveal dos demais campos da etapa
  // PJ — só abrem com CNPJ válido e dados puxados; (2) o gate de avanço. Sempre é
  // "" ou igual aos dígitos atuais do documento (limpo a cada mudança do CNPJ).
  const [confirmedCnpjDigits, setConfirmedCnpjDigits] = useState("");
  // E-mails (normalizados) já confirmados como PERTENCENTES a uma conta ORGANIZER.
  // Fonte de verdade do gate "e-mail já cadastrado". Keyed por e-mail normalizado.
  const takenOrgEmailsRef = useRef<Set<string>>(new Set());
  const lastCheckedEmailRef = useRef<string>("");
  // Single-flight do avanço da etapa "access": impede que dois cliques
  // concorrentes façam dois `setStepIndex(i+1)` e pulem uma etapa.
  const advancingAccessRef = useRef(false);
  // E-mails de CONTATO (normalizados) já confirmados como pertencentes a uma
  // organização. Gate "e-mail de contato já cadastrado" (etapa de contatos).
  const takenOrgContactEmailsRef = useRef<Set<string>>(new Set());
  const lastCheckedOrgEmailRef = useRef<string>("");
  const advancingContactsRef = useRef(false);
  // Documentos (só dígitos) já confirmados como PERTENCENTES a uma organização.
  // Fonte de verdade do gate de "documento já cadastrado" (keyed por dígitos, então
  // trocar o documento não deixa flag velha travando). Ref: não precisa re-render.
  const takenOrgDocumentsRef = useRef<Set<string>>(new Set());
  const checkingOrgDocumentRef = useRef(false);
  const lastCheckedOwnerDocRef = useRef<string>("");
  // CPFs (só dígitos) já confirmados como RESPONSÁVEIS de alguma organização
  // (campo `Organization.ownerDocument`, distinto do documento da org). Fonte de
  // verdade do gate "CPF do responsável já usado". Aplica-se a PF e PJ.
  const takenOwnerDocumentsRef = useRef<Set<string>>(new Set());
  const checkingOwnerDocumentRef = useRef(false);

  /**
   * Checa AO VIVO se o documento (CPF de PF / CNPJ de PJ) já é de uma ORGANIZAÇÃO
   * (tabela Organization, não User). Atualiza o set de "tomados" e marca o erro
   * inline no campo. Idempotente por documento; falha de rede não trava (o submit
   * revalida no backend).
   */
  const checkOrgDocumentAvailability = useCallback(
    async (
      digits: string,
      field: "document" | "ownerDocument",
    ): Promise<boolean> => {
      checkingOrgDocumentRef.current = true;
      try {
        const available =
          await organizerService.checkOrganizationDocumentAvailability(digits);
        if (available) {
          takenOrgDocumentsRef.current.delete(digits);
        } else {
          takenOrgDocumentsRef.current.add(digits);
          setErrors((prev) => ({
            ...prev,
            [field]: "Já existe uma organização com este documento.",
          }));
        }
        return available;
      } finally {
        checkingOrgDocumentRef.current = false;
      }
    },
    [],
  );

  /**
   * Checa AO VIVO se o CPF do RESPONSÁVEL já é responsável de OUTRA organização
   * (campo `Organization.ownerDocument`). Vale para PF e PJ. Atualiza o set de
   * "tomados" e marca o erro inline. Idempotente por CPF; falha de rede não trava
   * (o submit revalida no backend).
   */
  const checkOwnerDocumentAvailability = useCallback(async (digits: string) => {
    checkingOwnerDocumentRef.current = true;
    try {
      const available =
        await organizerService.checkOrganizationOwnerDocumentAvailability(digits);
      if (available) {
        takenOwnerDocumentsRef.current.delete(digits);
      } else {
        takenOwnerDocumentsRef.current.add(digits);
        setErrors((prev) => ({
          ...prev,
          ownerDocument:
            "Já existe uma organização cadastrada com este CPF de responsável.",
        }));
      }
    } finally {
      checkingOwnerDocumentRef.current = false;
    }
  }, []);

  /**
   * Checa se o e-mail de login já é de uma conta ORGANIZER. Escopo por
   * `accountType=ORGANIZER` (conta USER homônima NÃO bloqueia). Idempotente por
   * e-mail; falha de rede não trava (o submit revalida no backend). Retorna
   * `true` se disponível. Marca o erro inline e no set de "tomados" quando não.
   */
  const ensureOrganizerEmailAvailable = useCallback(
    async (rawEmail: string): Promise<boolean> => {
      const email = rawEmail.trim().toLowerCase();
      if (!email.includes("@")) return true;
      // Decisão já conhecida — evita round-trip redundante.
      if (takenOrgEmailsRef.current.has(email)) {
        setErrors((prev) => ({ ...prev, email: EMAIL_TAKEN_MSG }));
        return false;
      }
      const available =
        await organizerService.checkOrganizerEmailAvailability(email);
      lastCheckedEmailRef.current = email;
      if (available) {
        takenOrgEmailsRef.current.delete(email);
        return true;
      }
      takenOrgEmailsRef.current.add(email);
      setErrors((prev) => ({ ...prev, email: EMAIL_TAKEN_MSG }));
      return false;
    },
    [],
  );

  /** Dispara a checagem ao vivo do e-mail ao sair do campo (feedback antecipado). */
  const handleEmailBlur = useCallback(() => {
    const email = formData.email.trim().toLowerCase();
    if (!email.includes("@") || email === lastCheckedEmailRef.current) return;
    void ensureOrganizerEmailAvailable(email);
  }, [formData.email, ensureOrganizerEmailAvailable]);

  /**
   * Checa se o e-mail de CONTATO já pertence a alguma organização (campo
   * `Organization.email`, distinto do e-mail de login). Idempotente por e-mail;
   * falha de rede não trava (o submit revalida). Marca erro inline em `orgEmail`.
   */
  const ensureOrganizationContactEmailAvailable = useCallback(
    async (rawEmail: string): Promise<boolean> => {
      const email = rawEmail.trim().toLowerCase();
      if (!email.includes("@")) return true;
      if (takenOrgContactEmailsRef.current.has(email)) {
        setErrors((prev) => ({ ...prev, orgEmail: ORG_EMAIL_TAKEN_MSG }));
        return false;
      }
      const available =
        await organizerService.checkOrganizationEmailAvailability(email);
      lastCheckedOrgEmailRef.current = email;
      if (available) {
        takenOrgContactEmailsRef.current.delete(email);
        return true;
      }
      takenOrgContactEmailsRef.current.add(email);
      setErrors((prev) => ({ ...prev, orgEmail: ORG_EMAIL_TAKEN_MSG }));
      return false;
    },
    [],
  );

  /** Checagem ao vivo do e-mail de contato ao sair do campo (feedback antecipado). */
  const handleOrgEmailBlur = useCallback(() => {
    const email = formData.orgEmail.trim().toLowerCase();
    if (!email.includes("@") || email === lastCheckedOrgEmailRef.current) return;
    void ensureOrganizationContactEmailAvailable(email);
  }, [formData.orgEmail, ensureOrganizationContactEmailAvailable]);

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
      // Captcha (se configurado) — bloqueia submit via Enter sem token.
      const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
      if (siteKey && !turnstileToken) {
        toast.error("Confirme o captcha para continuar.");
        return false;
      }
      return true;
    }
    if (currentMeta.key === "done") return true;

    // Gate PRÉ-Zod da etapa da organização (PJ): enquanto o CNPJ não está
    // CONFIRMADO pela Receita (form ainda oculto), em verificação, ou já pertence
    // a outra organização, mostramos SÓ o erro do documento — sem rodar o Zod, que
    // floodaria "campo obrigatório" em todos os campos ainda ocultos/vazios.
    // Ordem: verificação em andamento → já usado → não confirmado (a msg de "já
    // usado" tem prioridade sobre "confirme um CNPJ válido").
    if (currentMeta.key === "orgData" && formData.personType === "PJ") {
      const digits = onlyDigits(formData.document);
      if (loadingCnpj || checkingOrgDocumentRef.current) {
        toast.error("Aguarde a verificação do CNPJ.");
        return false;
      }
      if (takenOrgDocumentsRef.current.has(digits)) {
        const msg = "Já existe uma organização com este documento.";
        setErrors({ document: msg });
        toast.error(msg);
        return false;
      }
      // Não confirmado (vazio, incompleto, inválido ou não encontrado): o form
      // ainda está oculto → só o erro do documento (nunca a cascata do Zod).
      if (confirmedCnpjDigits.length !== 14 || confirmedCnpjDigits !== digits) {
        const msg = "Informe um CNPJ válido e existente para continuar.";
        setErrors({ document: msg });
        toast.error(msg);
        return false;
      }
    }

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
    } catch (err) {
      if (err instanceof ZodError) applyZodErrors(err);
      return false;
    }

    // Gate extra (pós-Zod) na etapa da organização. O documento da ORG no PJ (CNPJ)
    // já foi tratado no gate PRÉ-Zod acima; aqui cobrimos o PF (CPF = documento da
    // org) e, para ambos, o CPF do responsável.
    if (currentMeta.key === "orgData") {
      const isPJ = formData.personType === "PJ";
      // PF: o CPF é o documento da própria organização (@unique).
      if (!isPJ) {
        const orgDocDigits = onlyDigits(formData.ownerDocument);
        if (takenOrgDocumentsRef.current.has(orgDocDigits)) {
          const msg = "Já existe uma organização com este documento.";
          setErrors({ ownerDocument: msg });
          toast.error(msg);
          return false;
        }
        // Verificação ainda em andamento: evita avançar antes da resposta.
        if (checkingOrgDocumentRef.current) {
          toast.error("Aguarde a verificação do documento.");
          return false;
        }
      }
      // Gate do CPF do RESPONSÁVEL (PF e PJ): não pode já ser responsável de outra
      // organização. Checado ao vivo; o set é a verdade.
      const ownerDocDigits = onlyDigits(formData.ownerDocument);
      if (takenOwnerDocumentsRef.current.has(ownerDocDigits)) {
        const msg =
          "Já existe uma organização cadastrada com este CPF de responsável.";
        setErrors({ ownerDocument: msg });
        toast.error(msg);
        return false;
      }
      if (checkingOwnerDocumentRef.current) {
        toast.error("Aguarde a verificação do CPF do responsável.");
        return false;
      }
    }

    setErrors({});
    return true;
  }, [currentMeta.key, formData, loadingCnpj, confirmedCnpjDigits, allContractsAccepted, turnstileToken, applyZodErrors]);

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
      // Conversão do funil de captação: cadastro de organizador concluído.
      // Dispara SÓ aqui (após o backend criar a conta com sucesso), no clique do
      // último botão de finalizar o cadastro — Meta Pixel + Google Ads.
      //
      // `value` + `currency` espelham `trackPlatformSignupConversion()` logo
      // abaixo, que já mandava `value: 1.0, currency: "BRL"` pro Google Ads. Sem
      // a moeda o Meta não consegue atribuir valor à conversão — e todos os
      // demais eventos do pixel (Purchase, InitiateCheckout, AddPaymentInfo)
      // já declaram BRL. 1.0 é valor NOMINAL de captação, não receita.
      trackPlatformMetaPixel("CompleteRegistration", {
        currency: "BRL",
        value: 1.0,
      });
      trackPlatformSignupConversion();
      setStepIndex(DONE_STEP_INDEX);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao criar conta de organizador.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, turnstileToken, signupOrganizer]);

  /**
   * Avança a partir da etapa "access" só após confirmar (rede) que o e-mail não
   * pertence a outra conta ORGANIZER. Zod já validou o formato antes daqui.
   */
  const advanceFromAccess = useCallback(async () => {
    if (advancingAccessRef.current) return;
    advancingAccessRef.current = true;
    setIsCheckingEmail(true);
    try {
      const available = await ensureOrganizerEmailAvailable(formData.email);
      if (!available) {
        toast.error(EMAIL_TAKEN_MSG);
        return;
      }
      setStepIndex((i) => Math.min(i + 1, CONTRACTS_STEP_INDEX));
    } finally {
      advancingAccessRef.current = false;
      setIsCheckingEmail(false);
    }
  }, [formData.email, ensureOrganizerEmailAvailable]);

  /**
   * Avança a partir da etapa "contacts" só após confirmar (rede) que o e-mail de
   * contato não pertence a outra organização. Zod já validou o formato antes.
   */
  const advanceFromContacts = useCallback(async () => {
    if (advancingContactsRef.current) return;
    advancingContactsRef.current = true;
    setIsCheckingOrgEmail(true);
    try {
      const available = await ensureOrganizationContactEmailAvailable(
        formData.orgEmail,
      );
      if (!available) {
        toast.error(ORG_EMAIL_TAKEN_MSG);
        return;
      }
      setStepIndex((i) => Math.min(i + 1, CONTRACTS_STEP_INDEX));
    } finally {
      advancingContactsRef.current = false;
      setIsCheckingOrgEmail(false);
    }
  }, [formData.orgEmail, ensureOrganizationContactEmailAvailable]);

  const handleNext = useCallback(() => {
    if (!validateCurrentStep()) return;
    // A etapa de contratos é o ponto de submit (cria a conta → conclusão).
    if (currentMeta.key === "contracts") {
      void submit();
      return;
    }
    // A etapa de acesso valida o e-mail de login (rede) antes de avançar.
    if (currentMeta.key === "access") {
      void advanceFromAccess();
      return;
    }
    // A etapa de contatos valida o e-mail de contato (rede) antes de avançar.
    if (currentMeta.key === "contacts") {
      void advanceFromContacts();
      return;
    }
    // Ao sair da etapa de tipo, herda o "Nome do responsável" do nome completo
    // (etapa 1) como baseline EDITÁVEL. No PJ, a consulta ao CNPJ ainda pode
    // sobrescrever com o responsável da Receita (e aí vira read-only).
    if (currentMeta.key === "type") {
      setOwnerNameFromReceita(false);
      setFormData((prev) =>
        prev.ownerName.trim()
          ? prev
          : { ...prev, ownerName: prev.completeName.trim() },
      );
    }
    setStepIndex((i) => Math.min(i + 1, CONTRACTS_STEP_INDEX));
  }, [validateCurrentStep, currentMeta.key, submit, advanceFromAccess, advanceFromContacts]);

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
      // Novo CNPJ em consulta: fecha o reveal até a Receita confirmar (só reabre
      // no sucesso do lookup). Evita mostrar o resto do form com CNPJ ainda incerto.
      setConfirmedCnpjDigits("");
      void (async () => {
        setLoadingCnpj(true);
        try {
          // 1º) Se o CNPJ já pertence a outra organização, NÃO consulta a Receita
          // e NÃO abre o formulário — só marca o erro e mantém o reveal fechado.
          // (Serializado de propósito: precisamos da resposta antes de decidir
          // gastar o fetch da Receita. Falha de rede → assume disponível e segue.)
          const available = await checkOrgDocumentAvailability(digits, "document");
          if (!available) return;

          const result = await lookupCnpjDigits(digits);
          if (!result.ok) {
            // CNPJ inválido / não encontrado: mantém o reveal FECHADO e sinaliza
            // no campo. O gate da etapa (validateCurrentStep) barra o avanço.
            setConfirmedCnpjDigits("");
            setErrors((prev) => ({ ...prev, document: result.message }));
            toast.error(result.message);
            return;
          }
          const { data } = result;
          // CNPJ confirmado pela Receita — abre o reveal e libera o avanço.
          setConfirmedCnpjDigits(digits);
          const phoneDigits = onlyDigits(data.phone);
          setFormData((prev) => ({
            ...prev,
            // Organização
            legalName: data.legalName || prev.legalName,
            tradeName: data.tradeName || prev.tradeName,
            // Responsável: Receita vence; senão mantém o baseline (nome completo
            // herdado da etapa 1) e, em último caso, deriva dele diretamente.
            ownerName:
              data.responsibleName || prev.ownerName || prev.completeName.trim(),
            // Endereço (próxima etapa) — pré-preenchido
            zipCode: data.zipCode ? formatCEP(data.zipCode) : prev.zipCode,
            street: data.street || prev.street,
            number: data.number || prev.number,
            neighborhood: data.neighborhood || prev.neighborhood,
            city: data.city || prev.city,
            state: data.state || prev.state,
            // Contatos (próxima etapa) — pré-preenchidos. O telefone do CNPJ
            // preenche o WhatsApp (não há mais campo de telefone separado).
            orgEmail: data.email || prev.orgEmail,
            whatsapp:
              phoneDigits.length > 0 ? formatPhone(phoneDigits) : prev.whatsapp,
          }));
          // O CEP já veio preenchido; evita refetch redundante ao abrir o endereço.
          if (data.zipCode) lastFetchedCepRef.current = onlyDigits(data.zipCode);
          // Read-only só se a Receita trouxe o responsável; no fallback (nome
          // completo) o campo continua editável.
          setOwnerNameFromReceita(!!data.responsibleName);
          toast.success("Dados do CNPJ preenchidos!");
        } finally {
          setLoadingCnpj(false);
        }
      })();
    } else if (digits.length < 14) {
      lastFetchedCnpjRef.current = "";
      // CNPJ incompleto → fecha o reveal (some o resto do formulário).
      setConfirmedCnpjDigits("");
    }
  }, [setField, checkOrgDocumentAvailability]);

  /**
   * CPF do responsável com máscara já aplicada. Ao completar 11 dígitos valida AO
   * VIVO (para PF e PJ) se o CPF já é responsável de OUTRA organização. Em PF o CPF
   * é TAMBÉM o documento da própria organização (@unique), então dispara também a
   * checagem do documento da org. Em PJ o documento da org é o CNPJ (checado à
   * parte no `handleCnpjChange`), então aqui só a checagem de responsável roda.
   */
  const handleOwnerDocumentChange = useCallback(
    (masked: string) => {
      setField("ownerDocument", masked);
      const digits = onlyDigits(masked);
      if (digits.length === 11 && digits !== lastCheckedOwnerDocRef.current) {
        lastCheckedOwnerDocRef.current = digits;
        // Responsável já vinculado a outra org (PF e PJ).
        void checkOwnerDocumentAvailability(digits);
        // PF: o CPF é o documento da própria organização (@unique).
        if (formData.personType === "PF") {
          void checkOrgDocumentAvailability(digits, "ownerDocument");
        }
      } else if (digits.length < 11) {
        lastCheckedOwnerDocRef.current = "";
      }
    },
    [
      setField,
      formData.personType,
      checkOwnerDocumentAvailability,
      checkOrgDocumentAvailability,
    ],
  );

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

  // Reveal da etapa PJ: só abre com o CNPJ CONFIRMADO pela Receita (dígitos
  // batem com o documento atual). Enquanto inválido/incompleto/em consulta fica
  // fechado. `confirmedCnpjDigits` é sempre "" ou == aos dígitos atuais.
  const cnpjConfirmed =
    confirmedCnpjDigits.length === 14 &&
    confirmedCnpjDigits === onlyDigits(formData.document);

  // Sem useMemo manual: o React Compiler (ativo no projeto) memoiza o retorno;
  // um useMemo com deps incompletas quebraria o lint.
  return {
    cnpjConfirmed,
    stepIndex,
    currentMeta,
    totalSteps: STEP_META.length,
    isFirstStep,
    isLastStep,
    formData,
    errors,
    isSubmitting,
    isCheckingEmail,
    isCheckingOrgEmail,
    loadingCep,
    loadingCnpj,
    ownerNameFromReceita,
    turnstileToken,
    setTurnstileToken,
    acceptedContracts,
    acceptContract,
    setContractAccepted,
    setAllContractsAccepted,
    allContractsAccepted,
    setField,
    handleEmailBlur,
    handleOrgEmailBlur,
    selectPersonType,
    handleCnpjChange,
    handleOwnerDocumentChange,
    handleZipChange,
    handleNext,
    handleBack,
    goToPlatform,
  };
}

export type OrganizerSignupFlow = ReturnType<typeof useOrganizerSignupFlow>;
