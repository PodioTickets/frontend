# Dashboard — `lotsNearDepletion` (lotes próximos do esgotamento)

Documento para o **backend**: o que o frontend espera no payload do dashboard do evento.

## Endpoint

- **Método / rota:** `GET /api/v1/events/:eventId/dashboard`
- **Query (já usada pelo front):** `period`, `ticketIds` (opcional), `page`, `limit` (se aplicável ao recurso inteiro do dashboard)

O corpo da resposta segue o padrão já acordado com `data: { ... }`, onde um dos campos é **`lotsNearDepletion`**.

## Comportamento esperado

### 1. Lista completa de lotes

- Devem ser retornados **todos os lotes** do evento que façam sentido para o organizador acompanhar (tipicamente: lotes com capacidade definida / à venda), **não apenas** um subconjunto “crítico”.
- Se um lote não deve aparecer (ex.: rascunho, inativo, sem estoque configurado), a regra fica a critério do backend, mas o front **não** aplica filtro adicional além de exibir o array recebido.

### 2. Ordenação — do mais próximo do esgotamento para o menos urgente

O array **`lotsNearDepletion` deve vir ordenado** de forma que o **primeiro item** seja o lote **mais próximo de esgotar** e o **último** o **menos próximo**.

Sugestão de critério (alinhar com o produto):

- Ordenar por **menor quantidade restante** (`remaining` ascendente), ou
- Por **maior percentual já vendido** (`sold / total` descendente), ou
- Combinação explícita (ex.: esgotados por último ou primeiro — definir e documentar aqui na API).

O importante para o front é: **ordem estável e significativa**, refletindo “prioridade” para o organizador.

### 3. Formato de cada item

O frontend tipa e mapeia os itens com os campos abaixo (camelCase). Se a API usar `snake_case`, o contrato deve ser documentado no backend e, se necessário, o front pode normalizar — hoje o dashboard espera principalmente:

| Campo        | Tipo   | Uso no front |
|-------------|--------|----------------|
| `name`      | string | Nome do lote na lista |
| `status`    | string | Um de: `"Normal"`, `"Atenção"`, `"Crítico"` — usado para cor do badge e da barra |
| `sold`      | number | Ingressos (ou unidades) vendidas |
| `total`     | number | Capacidade total do lote |
| `remaining` | number | Restantes (`total - sold` ou equivalente) |

Campos adicionais úteis (já previstos no tipo do serviço no front, podem ser usados depois):

- `lotId` — identificador do lote
- `percentageSold` — percentual vendido (opcional; hoje a barra também pode ser derivada de `sold` / `total` no cliente)

## Referência no repositório (frontend)

- Serviço: `organizerService.getEventDashboard` → `GET /api/v1/events/${eventId}/dashboard`
- Tipos: `LotNearDepletion`, `DashboardData` em `src/services/organizer/OrganizerService.ts`
- UI: seção “Lotes próximos de esgotamento” em `src/app/organizer/(logged)/events/[id]/dashboard/page.tsx`

## Resumo para implementação

1. **`lotsNearDepletion`**: array com **todos** os lotes relevantes do evento.  
2. **Ordem**: **mais próximo do esgotamento primeiro** (critério numérico acordado no backend).  
3. **Payload**: `name`, `status`, `sold`, `total`, `remaining` (e opcionalmente `lotId`, `percentageSold`).

Qualquer mudança de contrato (nome do campo, valores de `status`, paginação só para essa lista) deve ser comunicada para atualizar o `OrganizerService` e o dashboard.
