/**
 * Catálogo de assessores da PódioTicket.
 *
 * O backend guarda só QUEM é o assessor (`Organization.advisor`, enum). Nome,
 * foto e WhatsApp vivem aqui porque são dados de APRESENTAÇÃO e a foto é um
 * asset do front (`public/images/`) — mantê-los juntos evita um par
 * banco/arquivo que sai de sincronia sem ninguém perceber.
 *
 * Para adicionar um assessor: nova entrada aqui + novo valor no enum
 * `OrganizationAdvisor` do Prisma (os dois precisam bater).
 */

/** Espelha o enum `OrganizationAdvisor` do backend. */
export type OrganizerAdvisorId = "GUARIM" | "LUCAS_SANTOS";

export interface OrganizerAdvisor {
  id: OrganizerAdvisorId;
  /** Nome exibido no header do widget de suporte. */
  name: string;
  /** Caminho do avatar em `public/`. */
  photoUrl: string;
  /**
   * WhatsApp com DDI + DDD, só dígitos (ex.: "5511994302713").
   * Vazio = ainda não cadastrado; o widget esconde o botão em vez de montar um
   * link quebrado ou, pior, mandar o organizador pro WhatsApp de outra pessoa.
   */
  whatsappPhone: string;
}

/**
 * Assessor padrão — vale para organizações antigas e para qualquer valor
 * desconhecido vindo da API (ex.: front desatualizado depois de o backend
 * ganhar um assessor novo).
 */
export const DEFAULT_ADVISOR_ID: OrganizerAdvisorId = "GUARIM";

export const ORGANIZER_ADVISORS: Record<OrganizerAdvisorId, OrganizerAdvisor> = {
  GUARIM: {
    id: "GUARIM",
    name: "Guarim",
    photoUrl: "/images/guarim.jpeg",
    whatsappPhone: "5511994302713",
  },
  LUCAS_SANTOS: {
    id: "LUCAS_SANTOS",
    name: "Lucas Santos",
    photoUrl: "/images/lucas-santos.jpeg",
    whatsappPhone: "5565992554096",
  },
};

/** Lista para popular selects, na ordem de exibição. */
export const ORGANIZER_ADVISOR_OPTIONS: OrganizerAdvisor[] = [
  ORGANIZER_ADVISORS.GUARIM,
  ORGANIZER_ADVISORS.LUCAS_SANTOS,
];

/**
 * Resolve o assessor de uma organização. Valor ausente, nulo ou desconhecido cai
 * no padrão — o widget de suporte nunca fica sem alguém para exibir.
 */
export function resolveOrganizerAdvisor(
  advisorId: string | null | undefined,
): OrganizerAdvisor {
  const known = advisorId && advisorId in ORGANIZER_ADVISORS;
  return ORGANIZER_ADVISORS[
    known ? (advisorId as OrganizerAdvisorId) : DEFAULT_ADVISOR_ID
  ];
}

/**
 * Link do WhatsApp do assessor com a mensagem pré-preenchida, incluindo o nome
 * da organização quando disponível. Retorna `null` quando o assessor ainda não
 * tem telefone cadastrado — o chamador esconde o botão nesse caso.
 */
export function buildAdvisorWhatsappUrl(
  advisor: OrganizerAdvisor,
  organizationName?: string,
): string | null {
  const phone = advisor.whatsappPhone.trim();
  if (!phone) return null;
  const name = organizationName?.trim();
  const base = "Olá! Sou organizador na PódioTicket e tenho algumas dúvidas.";
  const message = name ? `${base} Minha organização é ${name}` : base;
  return `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(
    message,
  )}`;
}
