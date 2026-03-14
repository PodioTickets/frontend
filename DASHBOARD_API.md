# API do Dashboard do Evento

## Visão geral

O endpoint do dashboard retorna métricas, tendências, rankings e dados de insights do evento. Acesso restrito ao organizador (membro da organização do evento).

---

## Endpoint: obter dados do dashboard

**Método**: `GET`  
**URL**: `/api/v1/events/:eventId/dashboard`

**Autenticação**: Bearer JWT (organizador).

**Parâmetros de path**:
- `eventId` (obrigatório): UUID do evento.

**Query params** (opcionais):
- `period`: Período dos dados. Valores: `geral`, `24h`, `7d`, `15d`, `1m`, `2m`. Default: `geral`.
- `ticketIds`: Array de UUIDs de ingressos para filtrar (ex.: `ticketIds[]=uuid1&ticketIds[]=uuid2`).
- `page`: Página do ranking de ingressos (default: 1).
- `limit`: Itens por página no ranking (default: 10).

**Exemplo de requisição**:
```bash
curl -X GET "https://api.exemplo.com/api/v1/events/SEU-EVENT-ID/dashboard?period=7d" \
  -H "Authorization: Bearer SEU_JWT"
```

**Respostas**:
- `200`: Dados do dashboard.
- `401`: Não autenticado.
- `403`: Sem permissão (não é organizador do evento).
- `404`: Evento não encontrado.

---

## Estrutura da resposta (200)

O corpo da resposta segue o formato:

```json
{
  "message": "Dashboard data fetched successfully",
  "data": {
    "period": { "selected": "geral", "startDate": null, "endDate": null },
    "metrics": { ... },
    "registrationsTrend": { ... },
    "ticketRanking": { ... },
    "topCities": [ ... ],
    "lotsNearDepletion": [ ... ],
    "salesHeatmap": { ... },
    "topProductVariations": [ ... ],
    "mostAnsweredQuestions": [ ... ]
  }
}
```

As seções **topProductVariations** e **mostAnsweredQuestions** são descritas abaixo.

---

## topProductVariations — Variações mais vendidas por produto

Lista, para cada produto do evento que teve venda, as variações ordenadas pela quantidade vendida (maior primeiro). Considera apenas **inscrições confirmadas e com pagamento pago**.

**Tipo**: array de objetos.

**Estrutura de cada item**:

| Campo         | Tipo   | Descrição                          |
|---------------|--------|------------------------------------|
| `productId`   | string | UUID do produto                    |
| `productName` | string | Nome do produto                    |
| `variations`  | array  | Variações ordenadas por vendas     |

Cada elemento de `variations`:

| Campo           | Tipo   | Descrição                                      |
|-----------------|--------|------------------------------------------------|
| `variationId`   | string \| null | UUID da variação ou `null` se não houver escolha |
| `variationName` | string | Nome da variação (ex.: "M", "G", "Sem variação") |
| `quantitySold`  | number | Quantidade vendida dessa variação              |

**Exemplo**:
```json
"topProductVariations": [
  {
    "productId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "productName": "Camiseta",
    "variations": [
      { "variationId": "v-uuid-m", "variationName": "M", "quantitySold": 45 },
      { "variationId": "v-uuid-g", "variationName": "G", "quantitySold": 30 },
      { "variationId": "v-uuid-p", "variationName": "P", "quantitySold": 12 },
      { "variationId": null, "variationName": "Sem variação", "quantitySold": 2 }
    ]
  },
  {
    "productId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "productName": "Kit lanche",
    "variations": [
      { "variationId": null, "variationName": "Sem variação", "quantitySold": 80 }
    ]
  }
]
```

Quando não há vendas de produtos no período (ou em inscrições pagas/confirmadas), o array vem vazio: `"topProductVariations": []`.

---

## mostAnsweredQuestions — Perguntas mais respondidas

Lista as perguntas do evento que possuem pelo menos uma resposta, ordenadas pela **quantidade de respostas** (maior primeiro). Útil para ver quais perguntas do formulário são mais preenchidas.

**Tipo**: array de objetos.

**Estrutura de cada item**:

| Campo         | Tipo   | Descrição                    |
|---------------|--------|------------------------------|
| `questionId`  | string | UUID da pergunta             |
| `question`    | string | Texto da pergunta            |
| `order`       | number | Ordem da pergunta no evento  |
| `answerCount` | number | Número de respostas recebidas|

**Exemplo**:
```json
"mostAnsweredQuestions": [
  {
    "questionId": "q-uuid-1",
    "question": "Tamanho da camiseta?",
    "order": 1,
    "answerCount": 120
  },
  {
    "questionId": "q-uuid-2",
    "question": "Possui restrição alimentar?",
    "order": 2,
    "answerCount": 98
  },
  {
    "questionId": "q-uuid-3",
    "question": "Como conheceu o evento?",
    "order": 3,
    "answerCount": 45
  }
]
```

Quando não há respostas em nenhuma pergunta do evento, o array vem vazio: `"mostAnsweredQuestions": []`.

---

## Observações

- **Período e filtros**: Os query params `period` e `ticketIds` afetam métricas, rankings e gráficos do dashboard. **topProductVariations** e **mostAnsweredQuestions** são calculados com base em **todas** as inscrições do evento (confirmadas e pagas para variações; todas as respostas para perguntas), não apenas do período ou dos tickets filtrados.
- **Uso no front**: Use `topProductVariations` para relatórios de produtos/variações mais vendidas e `mostAnsweredQuestions` para destacar perguntas com maior taxa de resposta no dashboard do organizador.
