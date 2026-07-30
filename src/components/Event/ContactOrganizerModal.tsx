"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { X, ChevronRight } from "lucide-react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { useAuth } from "@/hooks/useAuth";
import { isValidCPF } from "@/utils/cpf";
import { isBrazilianCountry } from "@/validators/Auth.validator";
import { cn } from "@/utils/cn";
import { organizerService } from "@/services";
import toast from "react-hot-toast";
import { useModalSubmitState } from "@/hooks/useModalSubmitState";
import { MessageSentModal } from "./MessageSentModal";
import { LoadingAnimation } from "@/components/Loading";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

const SUBJECTS = [
  "Kit do atleta e produtos",
  "Regulamento e regras",
  "Outro assunto",
];

function maskCpf(value: string): string {
  const n = value.replace(/\D/g, "");
  if (n.length <= 3) return n;
  if (n.length <= 6) return `${n.slice(0, 3)}.${n.slice(3)}`;
  if (n.length <= 9) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`;
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9, 11)}`;
}

function maskPhone(value: string): string {
  const n = value.replace(/\D/g, "");
  if (n.length <= 2) return n;
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7, 11)}`;
}

interface ContactOrganizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizerEmail: string;
  eventName: string;
  organizationId?: string;
  eventId?: string;
}

interface FormState {
  name: string;
  cpf: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  cpf?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
}

export function ContactOrganizerModal({
  isOpen,
  onClose,
  organizerEmail,
  eventName,
  organizationId,
  eventId,
}: ContactOrganizerModalProps) {
  const { user } = useAuth();
  const { isSubmitting, runSubmit } = useModalSubmitState();
  const [sent, setSent] = useState(false);

  const mobileTurnstileRef = useRef<TurnstileInstance>(null);
  const desktopTurnstileRef = useRef<TurnstileInstance>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    cpf: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  /* Decide se o documento exigido é CPF (brasileiro) ou documento genérico
   * (estrangeiro). Usa o country da conta logada — quando não há user
   * (anônimo), assume brasileiro (default histórico). */
  const isBrUser = isBrazilianCountry((user as any)?.country ?? null);
  const docLabel = isBrUser ? "CPF" : "Documento";
  const docPlaceholder = isBrUser ? "000.000.000-00" : "Passaporte / documento";
  const docMaxLength = isBrUser ? 14 : 30;

  useEffect(() => {
    if (!isOpen) return;

    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
    /* Para brasileiros: usa documentNumber do user com máscara CPF.
     * Para estrangeiros: passaporte armazenado com letras — usa cru. */
    const userIsBr = isBrazilianCountry((user as any)?.country ?? null);
    const rawDoc = user?.documentNumber ?? "";
    const prefillDoc = userIsBr
      ? (rawDoc ? maskCpf(rawDoc.replace(/\D/g, "")) : "")
      : rawDoc;
    const rawPhone = (user as any)?.phone?.replace(/\D/g, "") ?? "";

    setForm((prev) => ({
      ...prev,
      name: fullName || prev.name,
      cpf: prefillDoc || prev.cpf,
      email: user?.email || prev.email,
      phone: rawPhone ? maskPhone(rawPhone) : prev.phone,
    }));

    setErrors({});
    setTurnstileToken(null);
    setSent(false);
    mobileTurnstileRef.current?.reset();
    desktopTurnstileRef.current?.reset();
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    /* Estrangeiros digitam livre (passaporte tem letras); brasileiros recebem máscara CPF. */
    const next = isBrUser
      ? maskCpf(e.target.value)
      : e.target.value.slice(0, docMaxLength);
    setForm((prev) => ({ ...prev, cpf: next }));
    if (errors.cpf) setErrors((prev) => ({ ...prev, cpf: undefined }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskPhone(e.target.value);
    setForm((prev) => ({ ...prev, phone: masked }));
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
  };

  const handleField =
    (field: keyof FormState) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
      };

  const validate = (): boolean => {
    const next: FormErrors = {};

    const nameParts = form.name.trim().split(/\s+/).filter(Boolean);
    if (!form.name.trim()) next.name = "Nome é obrigatório";
    else if (nameParts.length < 2) next.name = "Informe o nome completo";

    if (isBrUser) {
      const cpfDigits = form.cpf.replace(/\D/g, "");
      if (!cpfDigits) {
        next.cpf = "CPF é obrigatório";
      } else if (cpfDigits.length !== 11) {
        next.cpf = "CPF deve ter 11 dígitos";
      } else if (!isValidCPF(form.cpf)) {
        next.cpf = "CPF inválido";
      }
    } else {
      const doc = form.cpf.trim();
      if (!doc) {
        next.cpf = "Documento é obrigatório";
      } else if (doc.length < 4) {
        next.cpf = "Documento deve ter pelo menos 4 caracteres";
      } else if (doc.length > 30) {
        next.cpf = "Documento deve ter no máximo 30 caracteres";
      }
    }

    if (!form.email.trim()) next.email = "E-mail é obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "E-mail inválido";

    if (!form.subject) next.subject = "Selecione o assunto";
    if (!form.message.trim()) next.message = "Mensagem é obrigatória";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Prefere envio via API (com template de email bonito); fallback para mailto: se não tiver organizationId
    if (!organizationId) {
      const body = [
        `Nome: ${form.name}`,
        `${docLabel}: ${form.cpf}`,
        `Email: ${form.email}`,
        form.phone ? `Telefone: ${form.phone}` : null,
        `Assunto: ${form.subject}`,
        ``,
        form.message,
      ]
        .filter((l) => l !== null)
        .join("\n");

      const mailtoUrl = `mailto:${organizerEmail}?subject=${encodeURIComponent(
        `[${form.subject}] ${eventName}`
      )}&body=${encodeURIComponent(body)}`;

      window.location.href = mailtoUrl;
      onClose();
      return;
    }

    await runSubmit(async () => {
      try {
        // Mínimo de 3s de loading para o usuário sentir o envio acontecendo
        // antes do popup de sucesso. Se a API for mais lenta, espera ela.
        // `Promise.all` retorna quando a mais demorada termina — sem block extra.
        await Promise.all([
          organizerService.contactOrganizer(organizationId, {
            name: form.name,
            email: form.email,
            phone: form.phone || undefined,
            cpf: form.cpf || undefined,
            subject: form.subject || undefined,
            message: form.message,
            eventId: eventId || undefined,
          }),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
        setSent(true);
        // Limpa o formulário após enviar — assunto/mensagem não são re-preenchidos
        // pelo effect de abertura (só dados do usuário), então sem isso a mensagem
        // anterior reaparece ao reabrir. Os campos do usuário voltam no próximo open.
        setForm({ name: "", cpf: "", email: "", phone: "", subject: "", message: "" });
        setErrors({});
        setTurnstileToken(null);
        mobileTurnstileRef.current?.reset();
        desktopTurnstileRef.current?.reset();
      } catch {
        toast.error("Erro ao enviar mensagem. Tente novamente.");
      }
    });
  };

  const fieldClass = (error?: string) =>
    cn("h-12 rounded-lg", error && "border-red-9 focus-visible:border-red-9");

  const subjectTriggerMobile = (isOpen: boolean) => (
    <div
      className={cn(
        "flex items-center justify-between h-12 w-full border rounded-lg px-3 cursor-pointer transition-colors bg-gray-2",
        isOpen ? "border-primary-9" : "border-gray-7",
        errors.subject && "border-red-9"
      )}
    >
      <span className={`text-base font-normal leading-[1.3] font-family-dm-sans truncate min-w-0 ${form.subject ? "text-gray-12" : "text-gray-11"}`}>
        {form.subject || "Selecione o assunto"}
      </span>
      <ChevronRight className={`size-5 text-gray-11 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
    </div>
  );

  const subjectTriggerDesktop = (isOpen: boolean) => (
    <div
      className={cn(
        "flex items-center justify-between h-12 w-full border rounded-lg px-3 cursor-pointer transition-colors bg-gray-2",
        isOpen ? "border-primary-9" : "border-gray-7",
        errors.subject && "border-red-9"
      )}
    >
      <span className={`text-base font-normal leading-[1.3] font-family-dm-sans ${form.subject ? "text-gray-12" : "text-gray-11"}`}>
        {form.subject || "Selecione o assunto"}
      </span>
      <svg
        className={`size-5 text-gray-11 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );

  const formFields = (mobile: boolean) => (
    <div className={cn("flex flex-col", mobile ? "gap-5 px-4 py-3" : "flex-wrap gap-x-4 gap-y-5 px-6 py-0")}>
      {mobile ? (
        <>
          {/* Nome */}
          <div className="flex flex-col gap-2">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">Nome completo</label>
            <Input type="text" placeholder="Nome Sobrenome" value={form.name} onChange={handleField("name")}
              className={fieldClass(errors.name)} />
            {errors.name && <p className="text-sm text-red-9 font-family-dm-sans">{errors.name}</p>}
          </div>
          {/* CPF */}
          <div className="flex flex-col gap-2">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">{docLabel}</label>
            <Input type="text" placeholder={docPlaceholder} value={form.cpf} onChange={handleCpfChange} maxLength={docMaxLength}
              className={fieldClass(errors.cpf)} />
            {errors.cpf && <p className="text-sm text-red-9 font-family-dm-sans">{errors.cpf}</p>}
          </div>
          {/* Email */}
          <div className="flex flex-col gap-2">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">E-mail</label>
            <Input type="email" placeholder="seu@email.com" value={form.email} onChange={handleField("email")}
              className={fieldClass(errors.email)} />
            {errors.email && <p className="text-sm text-red-9 font-family-dm-sans">{errors.email}</p>}
          </div>
          {/* Telefone */}
          <div className="flex flex-col gap-2">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">Telefone</label>
            <Input type="tel" placeholder="(00) 00000-0000" value={form.phone} onChange={handlePhoneChange} maxLength={15}
              className={fieldClass(errors.phone)} />
            {errors.phone && <p className="text-sm text-red-9 font-family-dm-sans">{errors.phone}</p>}
          </div>
          {/* Assunto */}
          <div className="flex flex-col gap-2">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">Assunto</label>
            <Dropdown
              options={SUBJECTS.map((s) => ({ label: s, id: s }))}
              onSelect={(opt) => {
                setForm((prev) => ({ ...prev, subject: opt.label }));
                if (errors.subject) setErrors((prev) => ({ ...prev, subject: undefined }));
              }}
              width="w-full"
              menuInline
              trigger={subjectTriggerMobile}
            />
            {errors.subject && <p className="text-sm text-red-9 font-family-dm-sans">{errors.subject}</p>}
          </div>
          {/* Mensagem */}
          <div className="flex flex-col gap-2">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">Mensagem</label>
            <textarea
              placeholder="Descreva sua dúvida ou solicitação..."
              value={form.message}
              onChange={handleField("message")}
              rows={4}
              className={cn(
                "w-full border border-gray-6 rounded-lg px-3 py-3 bg-transparent text-base font-normal leading-[1.3] text-gray-12 font-family-dm-sans outline-none focus:border-primary-9 transition-colors resize-none placeholder:text-gray-11",
                errors.message && "border-red-9 focus:border-red-9"
              )}
            />
            {errors.message && <p className="text-sm text-red-9 font-family-dm-sans">{errors.message}</p>}
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-5 items-start w-full">
          {/* Nome completo */}
          <div className="flex flex-col gap-2 flex-1 min-w-[230px]">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">Nome completo</label>
            <Input type="text" placeholder="Nome Sobrenome" value={form.name} onChange={handleField("name")}
              className={fieldClass(errors.name)} />
            {errors.name && <p className="text-sm text-red-9 font-family-dm-sans">{errors.name}</p>}
          </div>
          {/* CPF */}
          <div className="flex flex-col gap-2 flex-1 min-w-[230px]">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">{docLabel}</label>
            <Input type="text" placeholder={docPlaceholder} value={form.cpf} onChange={handleCpfChange} maxLength={docMaxLength}
              className={fieldClass(errors.cpf)} />
            {errors.cpf && <p className="text-sm text-red-9 font-family-dm-sans">{errors.cpf}</p>}
          </div>
          {/* Email */}
          <div className="flex flex-col gap-2 flex-1 min-w-[230px]">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">E-mail</label>
            <Input type="email" placeholder="seu@email.com" value={form.email} onChange={handleField("email")}
              className={fieldClass(errors.email)} />
            {errors.email && <p className="text-sm text-red-9 font-family-dm-sans">{errors.email}</p>}
          </div>
          {/* Telefone */}
          <div className="flex flex-col gap-2 flex-1 min-w-[230px]">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">Telefone</label>
            <Input type="tel" placeholder="(00) 00000-0000" value={form.phone} onChange={handlePhoneChange} maxLength={15}
              className={fieldClass(errors.phone)} />
            {errors.phone && <p className="text-sm text-red-9 font-family-dm-sans">{errors.phone}</p>}
          </div>
          {/* Assunto */}
          <div className="flex flex-col gap-2 w-full sm:w-[calc(50%-8px)]">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">Assunto</label>
            <Dropdown
              options={SUBJECTS.map((s) => ({ label: s, id: s }))}
              onSelect={(opt) => {
                setForm((prev) => ({ ...prev, subject: opt.label }));
                if (errors.subject) setErrors((prev) => ({ ...prev, subject: undefined }));
              }}
              width="w-full"
              menuInPortal
              trigger={subjectTriggerDesktop}
            />
            {errors.subject && <p className="text-sm text-red-9 font-family-dm-sans">{errors.subject}</p>}
          </div>
          {/* Mensagem */}
          <div className="flex flex-col gap-2 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">Mensagem</label>
            <textarea
              placeholder="Descreva sua dúvida ou solicitação..."
              value={form.message}
              onChange={handleField("message")}
              rows={5}
              className={cn(
                "w-full border border-gray-6 rounded-lg px-3 py-4 bg-transparent text-base font-normal leading-[1.3] text-gray-12 font-family-dm-sans outline-none focus:border-primary-9 transition-colors resize-none placeholder:text-gray-11",
                errors.message && "border-red-9 focus:border-red-9"
              )}
            />
            {errors.message && <p className="text-sm text-red-9 font-family-dm-sans">{errors.message}</p>}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ── MOBILE: bottom sheet ── */}
      <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        {/* Sheet */}
        <div className="relative bg-gray-1 rounded-tl-[12px] rounded-tr-[12px] max-h-[92dvh] flex flex-col">
          {/* Loading local: cobre só o sheet enquanto o envio acontece (mínimo 3s
              forçado em handleSubmit). Fica dentro do `relative` acima — não
              esconde o resto da tela. */}
          {isSubmitting && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-1/80 backdrop-blur-sm rounded-tl-[12px] rounded-tr-[12px]">
              <LoadingAnimation />
            </div>
          )}
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-6 shrink-0">
            <h2 className="font-semibold text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Mensagem para organizador
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center size-8 rounded-lg hover:bg-gray-3 transition-colors shrink-0"
              aria-label="Fechar modal"
            >
              <X className="size-[18px] text-gray-12" />
            </button>
          </div>

          {/* Scrollable body */}
          <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 overflow-y-auto">
              {formFields(true)}

              {/* Footer */}
              <div className="flex flex-col gap-3 px-4 py-5 border-t border-gray-6 shrink-0">
                {/* Captcha Turnstile — mesmo padrão do login mobile: retângulo
                    "normal" reduzido via scale (~255×55); wrapper com altura
                    fixa absorve o espaço extra do scale. */}
                {TURNSTILE_SITE_KEY && (
                  <div className="flex w-full items-center justify-center empty:hidden">
                    <div className="w-full scale-[0.85]">
                      <Turnstile
                        ref={mobileTurnstileRef}
                        siteKey={TURNSTILE_SITE_KEY}
                        onSuccess={setTurnstileToken}
                        onError={() => setTurnstileToken(null)}
                        onExpire={() => setTurnstileToken(null)}
                        options={{ theme: "light", size: "flexible", appearance: "interaction-only" }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-gray-6 text-gray-12 h-11"
                    onClick={onClose}
                  >
                    Cancelar
                  </Button>
                  <button
                    type="submit"
                    disabled={(!!TURNSTILE_SITE_KEY && !turnstileToken) || isSubmitting}
                    className="flex-1 h-11 rounded-lg font-semibold text-base font-family-dm-sans transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#59e373", color: "#141a15" }}
                  >
                    {isSubmitting ? "Enviando..." : "Enviar"}
                  </button>
                </div>
              </div>
            </form>
        </div>
      </div>

      {/* ── DESKTOP: centered dialog ── */}
      <div
        className="hidden md:flex fixed inset-0 bg-black/50 items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="relative bg-gray-1 rounded-xl border border-gray-6 w-full max-w-[750px] shadow-lg max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Loading local: cobre só o dialog enquanto o envio acontece (mínimo 3s
              forçado em handleSubmit). `absolute inset-0` dentro do `relative`
              acima — não esconde o resto da tela. */}
          {isSubmitting && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-1/80 backdrop-blur-sm rounded-xl">
              <LoadingAnimation />
            </div>
          )}
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-6 shrink-0">
            <h2 className="font-semibold text-xl leading-[1.3] text-gray-12 font-family-dm-sans">
              Falar com o organizador
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center size-8 rounded-lg hover:bg-gray-3 transition-colors shrink-0"
              aria-label="Fechar modal"
            >
              <X className="size-[18px] text-gray-12" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} noValidate>
              <div className="pt-4 pb-4">
                <p className="font-medium text-base leading-[1.3] text-gray-12 font-family-dm-sans px-6 mb-8">
                  Preencha os campos abaixo para enviar sua mensagem.
                </p>
                {formFields(false)}
              </div>

              {/* Footer */}
              <div className="flex flex-col items-end gap-3 px-6 pb-8">
                {TURNSTILE_SITE_KEY && (
                  <Turnstile
                    ref={desktopTurnstileRef}
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={setTurnstileToken}
                    onError={() => setTurnstileToken(null)}
                    onExpire={() => setTurnstileToken(null)}
                    options={{ theme: "light", size: "flexible", appearance: "interaction-only" }}
                    className="w-full"
                  />
                )}
                <div className="flex items-center justify-end gap-3 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-6 text-gray-12"
                    onClick={onClose}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={(!!TURNSTILE_SITE_KEY && !turnstileToken) || isSubmitting}>
                    {isSubmitting ? "Enviando..." : "Enviar mensagem"}
                  </Button>
                </div>
              </div>
            </form>
        </div>
      </div>

      <MessageSentModal isOpen={sent} onClose={() => { setSent(false); onClose(); }} />
    </>
  );
}
