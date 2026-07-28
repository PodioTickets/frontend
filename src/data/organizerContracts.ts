import type { LucideIcon } from "lucide-react";
import { FileText, ShieldCheck, RotateCcw, Wallet } from "lucide-react";
import type { LegalBlock } from "@/components/LegalDocument";
import { termsOfUse } from "./termsOfUse";

/**
 * Contratos que o organizador precisa aceitar no auto-cadastro
 * (`/organizer/create`, etapa "revise os contratos"). O leitor renderiza
 * `blocks` via `LegalDocumentBody`.
 *
 * "Contrato principal" reusa os Termos de Uso existentes (`@/data/termsOfUse`).
 * Os demais (antifraude / cancelamento / repasse) ainda NÃO têm texto oficial no
 * repo — estão com um bloco PLACEHOLDER. Substitua `blocks` pelo conteúdo real
 * (mesmo formato `LegalBlock[]`) quando o jurídico fornecer.
 */
export interface OrganizerContract {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  updatedAt: string;
  blocks: LegalBlock[];
}

const CONTRACT_UPDATED_AT = "01/01/2026";

/** TODO(jurídico): substituir pelo texto oficial do documento. */
function placeholderBlocks(title: string): LegalBlock[] {
  return [
    {
      type: "p",
      text: `O texto oficial de "${title}" ainda será disponibilizado. Este é um conteúdo provisório apenas para validação do fluxo de aceite.`,
    },
  ];
}

export const ORGANIZER_CONTRACTS: OrganizerContract[] = [
  {
    id: "main",
    title: "Contrato principal",
    subtitle: "Regras gerais de uso da plataforma",
    icon: FileText,
    updatedAt: CONTRACT_UPDATED_AT,
    // Reusa os Termos de Uso (ignora o bloco h1, que vira o título do leitor).
    blocks: termsOfUse.filter((b) => b.type !== "h1"),
  },
  {
    id: "antifraud",
    title: "Política antifraude",
    subtitle: "Prevenção e responsabilidades",
    icon: ShieldCheck,
    updatedAt: CONTRACT_UPDATED_AT,
    blocks: placeholderBlocks("Política antifraude"),
  },
  {
    id: "cancellation",
    title: "Política de cancelamento",
    subtitle: "Regras de estorno e cancelamento",
    icon: RotateCcw,
    updatedAt: CONTRACT_UPDATED_AT,
    blocks: placeholderBlocks("Política de cancelamento"),
  },
  {
    id: "transfer",
    title: "Política de repasse",
    subtitle: "Prazos e condições de pagamento",
    icon: Wallet,
    updatedAt: CONTRACT_UPDATED_AT,
    blocks: placeholderBlocks("Política de repasse"),
  },
];

export const ORGANIZER_CONTRACT_IDS = ORGANIZER_CONTRACTS.map((c) => c.id);
