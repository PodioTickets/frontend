import type { LucideIcon } from "lucide-react";
import { FileText, ShieldCheck, RotateCcw, Wallet } from "lucide-react";
import type { LegalBlock } from "@/components/LegalDocument";
import { contratoPrincipal } from "./organizerContracts/contratoPrincipal";
import { politicaAntifraude } from "./organizerContracts/politicaAntifraude";
import { politicaCancelamento } from "./organizerContracts/politicaCancelamento";
import { politicaRepasse } from "./organizerContracts/politicaRepasse";

/**
 * Contratos que o organizador precisa aceitar no auto-cadastro
 * (`/organizer/create`, etapa "revise os contratos"). O leitor renderiza
 * `blocks` via `LegalDocumentBody`.
 *
 * Cada `blocks` é o texto oficial extraído dos documentos jurídicos em
 * `docs/*.docx` (versão 27/06/2026). O "Contrato principal" é o documento base;
 * as três políticas são Documentos Complementares indissociáveis dele
 * (Cláusula 3). Ao atualizar o texto oficial, regenere os arquivos em
 * `./organizerContracts/` a partir dos `.docx` e ajuste `CONTRACT_UPDATED_AT`.
 */
export interface OrganizerContract {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  updatedAt: string;
  blocks: LegalBlock[];
}

const CONTRACT_UPDATED_AT = "27/06/2026";
// O Contrato principal foi atualizado para a versão v4 (só ele); as três
// políticas complementares permanecem na data anterior.
const MAIN_CONTRACT_UPDATED_AT = "27/08/2026";

export const ORGANIZER_CONTRACTS: OrganizerContract[] = [
  {
    id: "main",
    title: "Contrato principal",
    subtitle: "Intermediação tecnológica para eventos",
    icon: FileText,
    updatedAt: MAIN_CONTRACT_UPDATED_AT,
    blocks: contratoPrincipal,
  },
  {
    id: "antifraud",
    title: "Política antifraude",
    subtitle: "Prevenção a fraudes e segurança",
    icon: ShieldCheck,
    updatedAt: CONTRACT_UPDATED_AT,
    blocks: politicaAntifraude,
  },
  {
    id: "cancellation",
    title: "Política de cancelamento",
    subtitle: "Reembolso e disputas de pagamento",
    icon: RotateCcw,
    updatedAt: CONTRACT_UPDATED_AT,
    blocks: politicaCancelamento,
  },
  {
    id: "transfer",
    title: "Política de repasse",
    subtitle: "Repasse e taxas de serviço",
    icon: Wallet,
    updatedAt: CONTRACT_UPDATED_AT,
    blocks: politicaRepasse,
  },
];

export const ORGANIZER_CONTRACT_IDS = ORGANIZER_CONTRACTS.map((c) => c.id);
