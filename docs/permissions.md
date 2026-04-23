# Sistema de Permissões — Organizador

## Visão Geral

Membros de uma organização têm `role: "OWNER" | "EMPLOYEE"`. O OWNER tem acesso irrestrito. Employees têm acesso determinado pelo array `permissions` associado ao seu vínculo com a organização.

---

## Permissões Disponíveis

| Chave | Nome | O que representa |
|---|---|---|
| `financial` | Financeiro | Acesso às telas financeiras do evento (repasses, saldo, histórico) |
| `edit_event` | Editar Evento | Edição completa do evento (datas, ingressos, kits, perguntas, configurações) |
| `view_event` | Visualizar Evento | Acesso à aba de inscrições e ao painel de edição em modo leitura |
| `coupons` | Cupons | Criação e gerenciamento de cupons e vouchers |
| `pixel` | Pixel / Ads | Configuração de pixels de rastreamento (Meta, Google) |
| `notify` | Notificar Inscritos | Envio de notificações para inscritos do evento |
| `create_event` | Criar Evento | Criação de novos eventos na organização |

---

## Regras de Implicação (frontend + backend devem aplicar)

### `create_event` → acesso total
Membros com `create_event` têm acesso equivalente a OWNER para todas as funcionalidades. O backend deve tratar essa permissão como bypass completo de qualquer outra restrição de acesso.

### `notify` → acesso a dashboard, inscrições e notificações
Membros com `notify` acessam dashboard, inscrições e a tela de notificações. Não implica `view_event` — o painel de edição permanece bloqueado.

### Inscrições → sempre liberada para qualquer membro
A tela de inscrições é acessível para qualquer membro com ao menos uma permissão (mesmo comportamento do dashboard). Não requer uma permissão específica.

### `dashboard` → derivado (qualquer permissão)
A tela de dashboard do evento é acessível para qualquer membro com ao menos uma permissão. Não é uma permissão armazenada, é apenas um acesso de entrada. O backend não precisa checar uma chave `dashboard` — basta o membro ter qualquer permissão no evento.

---

## Escopo por Evento (`eventIds`)

Além das permissões, cada membro pode ter um escopo de eventos restrito via `eventIds`.

| Valor de `eventIds` | Significado |
|---|---|
| `null` | Sem restrição — acesso a todos os eventos da organização |
| `[]` | Restrito a nenhum evento |
| `["id1", "id2"]` | Whitelist — acesso apenas a esses eventos |

O backend deve sempre cruzar `eventIds` antes de checar permissões: se o evento não estiver no escopo do membro, nenhuma permissão é válida para ele.

---

## Contratos de API

### `GET /organizations/me`
Retorna os dados do membro logado dentro da organização atual.

```json
{
  "organization": { ... },
  "member": {
    "role": "EMPLOYEE",
    "permissions": ["view_event", "notify"]
  }
}
```
> Se `member` for `null`, o usuário é OWNER — acesso total.

---

### `POST /organizations/me/members` — Criar membro

```json
{
  "firstName": "João",
  "lastName": "Silva",
  "email": "joao@email.com",
  "password": "senha123",
  "role": "EMPLOYEE",
  "permissions": ["view_event", "financial"],
  "eventIds": ["event-id-1", "event-id-2"]
}
```

- `permissions` ausente → backend aplica defaults (`view_event: true`, demais `false`)
- `eventIds` ausente ou omitido → acesso a todos os eventos da org

---

### `PATCH /organizations/me/members/:userId/settings` — Atualizar membro

```json
{
  "role": "EMPLOYEE",
  "permissions": ["view_event", "notify"],
  "eventIds": ["event-id-1"],
  "firstName": "João",
  "lastName": "Silva"
}
```

- `eventIds` omitido → não altera o escopo atual
- `eventIds: []` → restringe a nenhum evento
- `eventIds: null` → remove restrição (acesso total)

---

### `GET /organizations/me/members/:userId` — Detalhe do membro

```json
{
  "member": { ... },
  "permissions": ["view_event", "coupons"],
  "eventIds": null,
  "lastLoginAt": "2026-04-20T14:00:00Z"
}
```

---

## Proteção por Rota (referência frontend → backend)

| Rota | Permissão requerida | Observações |
|---|---|---|
| `/events/:id/dashboard` | qualquer permissão | Derivado — basta existir como membro |
| `/events/:id/registrations` | qualquer permissão | Sempre liberada para qualquer membro ativo |
| `/events/:id/financial` | `financial` | — |
| `/events/:id/edit/*` | `edit_event` ou `view_event` | Com só `view_event`: modo leitura |
| `/events/:id/discount/cupom` | `coupons` | — |
| `/events/:id/discount/voucher` | `coupons` | — |
| `/events/:id/ads` | `pixel` | — |
| `/events/:id/notifications` | `notify` | — |
| `/events/new/*` | `create_event` | — |

---

## Defaults ao Criar Membro

```
financial:   false
edit_event:  false
view_event:  true   ← único habilitado por padrão
coupons:     false
pixel:       false
notify:      false
create_event: false
```
