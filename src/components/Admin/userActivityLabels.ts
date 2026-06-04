/**
 * Labels/cores compartilhados entre a lista e o dashboard de atividade de
 * usuários (/admin/atividade). Categorias/origens espelham os enums do
 * backend (`UserActivityCategory`/`UserActivitySource`).
 */

export const CATEGORY_LABELS: Record<string, string> = {
  PAGE_VIEW: "Visualização de página",
  CLICK: "Clique",
  API: "API",
  AUTH: "Autenticação",
  CHECKOUT: "Checkout",
  PROFILE: "Perfil",
  COMPLIANCE: "Compliance",
  OTHER: "Outros",
};

export const SOURCE_LABELS: Record<string, string> = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  WEBHOOK: "Webhook",
};

/** Badge da categoria — cores por grupo (navegação/auth/checkout/demais). */
export const CATEGORY_BADGE: Record<string, string> = {
  PAGE_VIEW: "bg-gray-4 text-gray-12",
  CLICK: "bg-gray-4 text-gray-12",
  API: "bg-gray-4 text-gray-12",
  AUTH: "bg-blue-4 text-blue-12",
  CHECKOUT: "bg-primary-4 text-primary-12",
  PROFILE: "bg-yellow-4 text-yellow-12",
  COMPLIANCE: "bg-yellow-4 text-yellow-12",
  OTHER: "bg-gray-4 text-gray-12",
};

/**
 * Etapas do funil de compra (tab "Funil de compra"), na ordem da jornada.
 * Actions espelham `PURCHASE_FUNNEL_STAGES` do backend.
 */
export const FUNNEL_STAGE_LABELS: Record<string, string> = {
  "page:event": "Visualizou a página do evento",
  "order.reserve": "Reservou ingressos",
  "order.billing-address": "Informou endereço de cobrança",
  "order.pay": "Iniciou pagamento",
  "order.paid": "Pagamento confirmado",
};

/** Descrição curta de cada etapa — tooltip/legenda do funil. */
export const FUNNEL_STAGE_HINTS: Record<string, string> = {
  "page:event": "Abriu a página pública do evento (inclui anônimos)",
  "order.reserve": "Criou um pedido reservando ingressos",
  "order.billing-address": "Preencheu o endereço de cobrança no checkout",
  "order.pay": "Submeteu uma tentativa de pagamento (PIX/cartão)",
  "order.paid": "Pagamento confirmado — conversão efetiva",
};

/** Cor da BARRA por categoria (gráficos de distribuição do dashboard). */
export const CATEGORY_BAR: Record<string, string> = {
  PAGE_VIEW: "bg-gray-8",
  CLICK: "bg-gray-8",
  API: "bg-gray-8",
  AUTH: "bg-blue-9",
  CHECKOUT: "bg-primary-9",
  PROFILE: "bg-yellow-9",
  COMPLIANCE: "bg-yellow-9",
  OTHER: "bg-gray-8",
};
