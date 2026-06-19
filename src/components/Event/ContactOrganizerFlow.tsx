"use client";

import { useEffect, useState } from "react";
import { ContactSubjectModal } from "./ContactSubjectModal";
import { ContactOrganizerModal } from "./ContactOrganizerModal";

interface ContactOrganizerFlowProps {
  isOpen: boolean;
  onClose: () => void;
  organizerEmail: string;
  eventName: string;
  organizationId?: string;
  eventId?: string;
}

/**
 * Orquestra o fluxo "Falar com o organizador":
 * 1. Abre o modal de seleção de assunto.
 * 2. Assuntos comuns levam ao WhatsApp do suporte (dentro do ContactSubjectModal).
 * 3. "Outro assunto" avança para o formulário de e-mail (ContactOrganizerModal).
 *
 * Mantém a mesma API pública do antigo ContactOrganizerModal para que os
 * call sites apenas troquem o componente — sem duplicar a máquina de estado.
 */
export function ContactOrganizerFlow({
  isOpen,
  onClose,
  organizerEmail,
  eventName,
  organizationId,
  eventId,
}: ContactOrganizerFlowProps) {
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Reseta o passo ao fechar o fluxo por fora (backdrop, navegação, envio).
  useEffect(() => {
    if (!isOpen) setShowEmailForm(false);
  }, [isOpen]);

  return (
    <>
      <ContactSubjectModal
        isOpen={isOpen && !showEmailForm}
        eventName={eventName}
        onClose={onClose}
        onOtherSubject={() => setShowEmailForm(true)}
      />
      <ContactOrganizerModal
        isOpen={isOpen && showEmailForm}
        onClose={onClose}
        organizerEmail={organizerEmail}
        eventName={eventName}
        organizationId={organizationId}
        eventId={eventId}
      />
    </>
  );
}
