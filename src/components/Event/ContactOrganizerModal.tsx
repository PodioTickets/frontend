"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";

const SUBJECTS = [
  "Dúvidas sobre a inscrição",
  "Kit do atleta e produtos",
  "Pagamento e reembolso",
  "Local e logística do evento",
  "Regulamento e regras",
  "Outro assunto",
];

interface ContactOrganizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizerEmail: string;
  eventName: string;
}

interface FormState {
  name: string;
  cpf: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export function ContactOrganizerModal({
  isOpen,
  onClose,
  organizerEmail,
  eventName,
}: ContactOrganizerModalProps) {
  const [form, setForm] = useState<FormState>({
    name: "",
    cpf: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  if (!isOpen) return null;

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const body = [
      `Nome: ${form.name}`,
      `CPF: ${form.cpf}`,
      `Email: ${form.email}`,
      `Telefone: ${form.phone}`,
      `Assunto: ${form.subject}`,
      ``,
      form.message,
    ].join("\n");

    const mailtoUrl = `mailto:${organizerEmail}?subject=${encodeURIComponent(
      `[${form.subject || "Contato"}] ${eventName}`
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoUrl;
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-1 rounded-xl border border-gray-6 w-full max-w-[750px] shadow-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-6 shrink-0">
          <h2 className="font-semibold text-xl leading-[1.3] text-gray-12 font-family-dm-sans">
            Falar com organizador
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
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-8 pt-4 pb-6 px-6">
            <p className="font-medium text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Preencha os campos abaixo para enviar sua mensagem.
            </p>

            <div className="flex flex-wrap gap-x-4 gap-y-5 items-start w-full">
              {/* Nome completo */}
              <div className="flex flex-col gap-2 flex-1 min-w-[230px]">
                <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                  Nome completo
                </label>
                <Input
                  type="text"
                  placeholder="Como devemos te chamar?"
                  value={form.name}
                  onChange={set("name")}
                  className="h-12 rounded-lg"
                  required
                />
              </div>

              {/* CPF */}
              <div className="flex flex-col gap-2 flex-1 min-w-[230px]">
                <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                  CPF
                </label>
                <Input
                  type="text"
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  onChange={set("cpf")}
                  className="h-12 rounded-lg"
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-2 flex-1 min-w-[230px]">
                <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="Seu@gmail.com"
                  value={form.email}
                  onChange={set("email")}
                  className="h-12 rounded-lg"
                  required
                />
              </div>

              {/* Telefone */}
              <div className="flex flex-col gap-2 flex-1 min-w-[230px]">
                <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                  Telefone
                </label>
                <Input
                  type="tel"
                  placeholder="(00) 0 0000-0000"
                  value={form.phone}
                  onChange={set("phone")}
                  className="h-12 rounded-lg"
                />
              </div>

              {/* Assunto */}
              <div className="flex flex-col gap-2 w-full sm:w-[calc(50%-8px)]">
                <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                  Assunto
                </label>
                <Dropdown
                  options={SUBJECTS.map((s) => ({ label: s, id: s }))}
                  onSelect={(opt) => setForm((prev) => ({ ...prev, subject: opt.label }))}
                  width="w-full"
                  menuInPortal
                  trigger={(isOpen) => (
                    <div
                      className={`flex items-center justify-between h-12 w-full border rounded-lg px-3 cursor-pointer transition-colors ${
                        isOpen ? "border-primary-9" : "border-gray-7"
                      } bg-gray-2`}
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
                  )}
                />
              </div>

              {/* Mensagem */}
              <div className="flex flex-col gap-2 w-full">
                <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                  Mensagem
                </label>
                <textarea
                  placeholder="Descreva sua dúvida ou solicitação..."
                  value={form.message}
                  onChange={set("message")}
                  required
                  rows={5}
                  className="w-full border border-gray-6 rounded-lg px-3 py-4 bg-transparent text-base font-normal leading-[1.3] text-gray-12 font-family-dm-sans outline-none focus:border-primary-9 transition-colors resize-none placeholder:text-gray-11"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 pb-8 pt-4">
            <Button
              type="button"
              variant="outline"
              className="border-gray-6 text-gray-12"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit">
              Enviar mensagem
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
