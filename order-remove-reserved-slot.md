# Remover ingresso/participante — `DELETE /orders/:orderId/participants/:slot`

> **Base URL:** `https://<api-host>/api/v1`
> **Fonte:** `orders.controller.ts` + `orders.service.ts` (`removeReservedSlot`)
> **Atualizado:** 2026-05-31

Reduz a quantidade reservada de um pedido **PENDING em 1 unidade**, removendo o ingresso e o
participante de um slot específico — **sem recriar o pedido** (preserva orderId, cupom, demais
participantes). Use no checkout quando o comprador remove um participante/ingresso.

---

## Contexto: modelo de reserva FIXA

- O `POST /orders/reserve` define a quantidade. Ela **NÃO muda** no `PATCH /participants` — esse só
  preenche os slots (e completa os não preenchidos com `{}` vazio, mantendo o cupom aplicado neles).
- Para **REDUZIR** a quantidade, use ESTE endpoint (1 unidade por chamada).
- `slot` = índice **0-based** do participante/unidade, na MESMA ordem do array `reservedTickets`
  (expandido por unidade) e de `pendingParticipants` no retorno do pedido.

---

## Request

```
DELETE /api/v1/orders/{orderId}/participants/{slot}
Authorization: Bearer <token>
```

| Param | Onde | Tipo | Descrição |
|---|---|---|---|
| `orderId` | path | UUID | Pedido PENDING do usuário |
| `slot` | path | int ≥ 0 | Índice do slot a remover |

Sem body.

```bash
curl -X DELETE "https://<api-host>/api/v1/orders/$ORDER/participants/1" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Resposta — `200`

Retorna o **pedido atualizado** (mesmo shape de `GET /orders/:id` / `PATCH /participants`):
`{ id, status, totalAmount, discount, finalAmount, pricing, reservedTickets[], pendingParticipants[], ... }`.

Após remover, `reservedTickets` (expandido) e `pendingParticipants` têm **N-1** entradas, `totalAmount`/
`discount`/`finalAmount` recalculados, e o cupom reavaliado sobre a nova quantidade.

---

## O que acontece (atômico, numa transação)

1. **Estoque:** libera 1 vaga do lote do slot (`availableQuantity + 1`, com cap em `quantity`).
2. **Placeholder:** cancela 1 registration PENDING daquele ingresso (`status → CANCELLED`) — sai da
   contagem de vendas, então a vaga fica realmente livre pra outros compradores.
3. **OrderReservedTicket:** decrementa a `quantity` em 1 (ou **deleta** a linha se zerar).
4. **Participante:** remove exatamente o slot pedido; completa o restante com vazios até o novo N.
5. **Totais/cupom:** recalcula `totalAmount`/`discount`/`finalAmount` e reavalia auto-cupom (AGE/QUANTITY).

> Mantém o invariante do checkout: `reservedTickets.quantity` == estoque retido == placeholders PENDING.

---

## Erros

| HTTP | code | Quando |
|---|---|---|
| `401` | — | sem token / inválido |
| `404` | — | pedido não encontrado ou não é do usuário |
| `409` | `ORDER_NOT_PENDING` | pedido não está mais PENDING |
| `422` | `INVALID_SLOT` | índice fora do range (`< 0` ou `>= nº de ingressos`) |
| `422` | `LAST_TICKET` | é o **último** ingresso — não dá pra remover; **cancele o pedido** (`DELETE /registrations/:id/cancel` ou expiração) |

---

## Integração no frontend

- O front renderiza N slots (de `reservedTickets` expandido). Botão "remover" no slot K → `DELETE …/participants/K`.
- Após o 200, **use o pedido retornado** (reservedTickets/pendingParticipants/pricing já vêm atualizados) — não precisa refetch.
- Remover ≠ limpar: para só **esvaziar** um participante mantendo o ingresso, use `PATCH /participants`
  mandando o array com aquele slot como `{}` (ou omitindo-o — o backend completa com vazio).
- `LAST_TICKET`: ao tentar remover o único ingresso, ofereça **cancelar o pedido**.

---

## Relacionado: validação no `pay`

O `POST /orders/:id/pay` agora exige **todos os slots preenchidos**: se algum participante estiver
vazio (`{}`), retorna `422 INCOMPLETE_PARTICIPANTS` (`"Preencha os dados de todos os N participante(s)…"`).
Um slot é considerado preenchido quando tem qualquer dado identificador (nome, email ou documento).
Isso evita inscrição "em branco" — o front deve bloquear o pagamento até todos os slots estarem completos
(ou usar este endpoint para remover os que sobraram).
