# Dashboard — gráfico de tendência de inscrições (`registrationsTrend.chartData`)

Documento para o **backend**: contrato necessário para o gráfico “Tendência de inscrições” no dashboard do evento e para o **tooltip ao passar o mouse** (valores por status: confirmadas, cancelados, estornados).

## Endpoint

- **Método / rota:** `GET /api/v1/events/:eventId/dashboard`
- **Query (já usada pelo front):** `period` (`geral` | `24h` | `7d` | `15d` | `1m` | `2m`), `ticketIds` (opcional), etc.

O payload está em `data.registrationsTrend` (ou equivalente após o envelope da API).

## Objetivo no front

1. Desenhar a **linha do gráfico** com `chartData.labels` e `chartData.revenue`.
2. No hover, exibir um painel com **três blocos** (Confirmadas, Cancelados, Estornados), cada um com:
   - **preço total** (R$), e  
   - **quantidade** (contagem de inscrições / pedidos no período, conforme regra de negócio).

Para isso o front usa **`chartData.dailyData`**: um array **alinhado por índice** com `labels` e `revenue` (mesmo tamanho e mesma ordem temporal).

## `chartData` — campos

### `labels` (obrigatório para o gráfico)

- Array de strings, um rótulo por bucket (dia, semana ou mês, conforme o `period`).
- O front formata alguns padrões (ex.: mensal `Fev/2026`, diário `3 de fev.` → `03/02`). Manter consistência entre `labels[i]` e `dailyData[i]`.

### `revenue` (obrigatório para o eixo Y)

- Array de **números**, mesmo comprimento que `labels`.
- **Unidade esperada: centavos** (inteiro). O dashboard divide por 100 antes de passar ao componente do gráfico (valores em reais na UI da linha).

### `dailyData` (recomendado para o tooltip completo)

- Array opcional; **idealmente `dailyData.length === labels.length`**.
- Cada elemento representa o **mesmo intervalo** que `labels[i]` e `revenue[i]`.
- O front interpreta valores monetários deste objeto como **centavos** e converte para reais na exibição.

#### Objeto por índice — campos que o front lê

| Campo (camelCase) | Alternativas snake_case aceitas* | Tipo | Uso no tooltip |
|-------------------|-----------------------------------|------|----------------|
| `revenue` | `confirmed_revenue`, `confirmedRevenue` | number (centavos) | **Confirmadas → Preço total** |
| `confirmed` | `confirmed_count` | number (inteiro ≥ 0) | **Confirmadas → Quantidade** |
| `canceled` | `cancelled`, `canceled_count`, `cancelled_count` | number | **Cancelados → Quantidade** |
| `refunded` | `refunded_count` | number | **Estornados → Quantidade** |
| `canceledRevenue` | `canceled_revenue`, `cancelledRevenue` | number (centavos), opcional | **Cancelados → Preço total** |
| `refundedRevenue` | `refunded_revenue`, `refundRevenue` | number (centavos), opcional | **Estornados → Preço total** |

\*O componente `RevenueChart` normaliza chaves em camelCase e snake_case.

#### `date` (recomendado)

- String identificando o bucket (ex.: ISO `YYYY-MM-DD` ou o mesmo texto que ajude debug). Hoje o rótulo exibido no tooltip vem principalmente de `labels[i]`; `date` pode ser usado no futuro para cruzar dados.

## Comportamento se algo faltar

- Sem `dailyData`: o front só consegue inferir **Preço total** das **Confirmadas** a partir de `revenue[i]` do gráfico (já em reais no componente); **quantidades** e valores de cancelados/estornos ficam **0** ou indisponíveis.
- Com `dailyData` mas **sem** `canceledRevenue` / `refundedRevenue`: o front mostra **R$ 0,00** nesses blocos, mas ainda exibe **quantidade** se `canceled` / `refunded` vierem preenchidos.
- Com `dailyData` mas **sem** `revenue` no ponto: o front usa o valor da série `chartData.revenue[i]` (convertido no dashboard) como fallback só para **Confirmadas → Preço total**.

## Consistência `revenue` (série) vs `dailyData[].revenue`

- O ideal é **`chartData.revenue[i]`** refletir o mesmo faturamento **confirmado** (ou a mesma métrica que a linha deve representar) que **`dailyData[i].revenue`**, ambos na mesma unidade (centavos na API).
- Evitar divergência entre a altura do ponto no gráfico e o “Preço total” de Confirmadas no tooltip.

## Amostragem no mobile

- Em telas estreitas o front pode **subamostrar** pontos do gráfico (menos rótulos).
- A mesma subamostragem é aplicada a `labels`, `revenue` e `dailyData` **pelos mesmos índices**, para o hover continuar coerente.

## Referência no repositório (frontend)

- Serviço: `organizerService.getEventDashboard` → `GET /api/v1/events/${eventId}/dashboard`
- Tipos: `RegistrationsTrend` em `src/services/organizer/OrganizerService.ts`
- Normalização do tooltip: `normalizeDailyPoint` em `src/components/Organizer/RevenueChart.tsx`
- UI: `src/app/organizer/(logged)/events/[id]/dashboard/page.tsx` (repasse de `dailyData` para `RevenueChart`)

## Resumo para implementação no backend

1. Manter **`labels`**, **`revenue`** (centavos) e **`dailyData`** com o **mesmo comprimento** e ordem cronológica.
2. Em cada item de **`dailyData`**, enviar pelo menos:
   - `revenue` (centavos) + `confirmed` (qtd) para o bloco **Confirmadas**;
   - `canceled` + opcionalmente `canceledRevenue` (centavos) para **Cancelados**;
   - `refunded` + opcionalmente `refundedRevenue` (centavos) para **Estornados**.
3. Preferir **camelCase** no JSON; snake_case ainda é aceito pelo front nos aliases listados acima.

Qualquer mudança de unidade (reais vs centavos) ou de semântica dos contadores deve ser alinhada com o front para ajustar `RevenueChart` / dashboard.
