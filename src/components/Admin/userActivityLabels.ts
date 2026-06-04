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
