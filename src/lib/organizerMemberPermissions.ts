/**
 * Permissões de membro da organização — fonte ÚNICA para os dois painéis
 * (drawer do organizador em `TeamMemberModals` e do admin em
 * `AdminCollaboratorDrawer`).
 *
 * Antes cada drawer tinha sua própria cópia das linhas, dos defaults e da
 * leitura do payload. As cópias divergiram na parte que mais importa: o admin
 * montava o estado a partir de `DEFAULT_PERMISSIONS` (com `view_event: true`) e
 * só sobrescrevia as chaves PRESENTES no JSON do banco — então qualquer chave
 * ausente (mapa parcial, shape legado, `{}`) "ressuscitava" com o valor default
 * e o admin exibia permissão que o organizador já tinha removido.
 *
 * Regra: o estado dos checkboxes SEMPRE parte de tudo `false` e só é ligado pelo
 * que o servidor concede. Default só existe para o formulário de CRIAÇÃO.
 */

export interface PermissionRow {
  id: string;
  title: string;
  description: string;
}

/** Ordem e textos exibidos nos dois drawers. */
export const PERMISSION_ROWS: PermissionRow[] = [
  {
    id: "financial",
    title: "Financeiro",
    description:
      "Gerencie repasses, saldos e valores em processamento, com histórico e outras informações financeiras.",
  },
  {
    id: "edit_event",
    title: "Editar Evento",
    description:
      "Atualize as informações do evento, como data, ingressos, kits, perguntas e outras configurações.",
  },
  {
    id: "view_event",
    title: "Visualizar Evento",
    description:
      "Permite visualizar o painel de edição do evento e acessar a aba de inscrições, sem permissão para editar.",
  },
  {
    id: "coupons",
    title: "Cupons",
    description:
      "Acesso à criação e gerenciamento de cupons de desconto e benefícios do evento.",
  },
  {
    id: "pixel",
    title: "Pixel",
    description:
      "Permite configurar pixels de rastreamento (como Meta/Facebook e Google) para acompanhar conversões e campanhas.",
  },
  {
    id: "notify",
    title: "Notificar Inscritos",
    description:
      "Permite enviar notificações ou comunicados para todos os inscritos do evento.",
  },
  {
    id: "create_event",
    title: "Criar Evento",
    description: "Permite criar novos eventos na organização.",
  },
];

export type PermissionsState = Record<string, boolean>;

/**
 * Dependências entre permissões: marcar a CHAVE liga também as implicadas.
 *
 * "Criar evento" pressupõe poder editar e visualizar o evento — quem cria um
 * evento precisa mexer nele e vê-lo. Por isso ligar `create_event` liga também
 * `edit_event` e `view_event`. Desmarcar NÃO remove as implicadas: elas passam
 * a valer por si (o membro fica só com editar/visualizar) e quem decide tirá-las
 * é o operador, não o toggle.
 */
export const PERMISSION_IMPLICATIONS: Record<string, readonly string[]> = {
  create_event: ["edit_event", "view_event"],
};

/**
 * Runtime: o membro tem acesso a `key` se a permissão for concedida diretamente
 * OU implicada por outra concedida (ex.: `create_event` ⇒ `edit_event`/`view_event`).
 * NÃO expande para acesso total — `create_event` deixou de ser super-permissão
 * (ver decisão 2026-07-23). Espelha o `effectivePermissionsForMember` do backend.
 */
export function permissionSatisfied(
  granted: readonly string[],
  key: string,
): boolean {
  if (granted.includes(key)) return true;
  for (const source of granted) {
    if (PERMISSION_IMPLICATIONS[source]?.includes(key)) return true;
  }
  return false;
}

/**
 * Alterna uma permissão respeitando as dependências acima. Fonte única usada
 * pelos dois drawers (organizador e admin) para o toggle dos checkboxes.
 */
export function togglePermission(
  state: PermissionsState,
  id: string,
): PermissionsState {
  const next = { ...state, [id]: !state[id] };
  if (next[id]) {
    for (const dep of PERMISSION_IMPLICATIONS[id] ?? []) next[dep] = true;
  }
  return next;
}

/** Todas as permissões no mesmo valor — base de leitura e atalhos da UI. */
export function allPermissions(value: boolean): PermissionsState {
  const next: PermissionsState = {};
  for (const row of PERMISSION_ROWS) next[row.id] = value;
  return next;
}

/** Estado inicial do formulário de CRIAÇÃO (espelha o default do backend). */
export function defaultNewMemberPermissions(): PermissionsState {
  return { ...allPermissions(false), view_event: true };
}

/** `["financial", ...]` → estado. Substituição: só o listado é concedido. */
export function permissionsFromArray(
  keys: string[] | undefined | null,
): PermissionsState {
  const base = allPermissions(false);
  if (!keys?.length) return base;
  for (const raw of keys) {
    if (typeof raw !== "string") continue;
    const key = raw.trim().toLowerCase();
    if (key in base) base[key] = true;
  }
  return base;
}

export function permissionsToArray(state: PermissionsState): string[] {
  return PERMISSION_ROWS.map((r) => r.id).filter((id) => state[id]);
}

/**
 * Payload do servidor → estado, tolerando os três shapes que circulam:
 *  - ARRAY de chaves concedidas (contrato atual dos dois endpoints de detalhe);
 *  - MAPA `{ financial: true, ... }` (leitura direta da coluna JSON);
 *  - `null`/ausente = "nunca configurado", que o backend trata como acesso
 *    TOTAL (`effectivePermissionsForMember`) — replicado aqui para não mostrar
 *    um membro sem permissão nenhuma quando na prática ele tem todas.
 *
 * `OWNER` tem acesso total implícito e não guarda mapa; por isso o papel entra
 * na decisão em vez de depender do que está gravado.
 */
export function permissionsFromApi(
  value: unknown,
  role?: string | null,
): PermissionsState {
  if (role === "OWNER") return allPermissions(true);
  if (value == null) return allPermissions(true);

  if (Array.isArray(value)) {
    return permissionsFromArray(value as string[]);
  }

  if (typeof value === "object") {
    const map = value as Record<string, unknown>;
    const base = allPermissions(false);
    for (const key of Object.keys(base)) base[key] = !!map[key];
    return base;
  }

  return allPermissions(false);
}
