# API de opções avançadas — imagens do kit na escolha de ingressos

Este documento descreve o contrato esperado pelo **frontend** (`PATCH /api/v1/events/:eventId`) para a feature **“Ver opções avançadas de visualização do ingresso”** (exibir ou não imagens do kit na tela de escolha de ingressos, layout por ingresso vs por categoria, imagem principal por ingresso/categoria).

## Resumo

| Campo (camelCase) | Tipo | Descrição |
|-------------------|------|-----------|
| `kitSelectionDisplay` | objeto (JSON) | Configuração opcional aninhada no evento |

Se o backend ainda não persistir esse objeto, o frontend usa **valores padrão** (imagens visíveis, layout “nos ingressos”, mapas vazios).

## Estrutura `kitSelectionDisplay`

```typescript
interface EventKitSelectionDisplay {
  /** Radio Sim/Não: exibir imagens do kit na escolha de ingressos */
  showKitImagesOnSelection: boolean;

  /**
   * Onde destacar as imagens quando showKitImagesOnSelection === true.
   * - ON_TICKETS: imagem principal por ingresso (mapa tickets).
   * - ON_CATEGORIES: imagem principal por categoria (mapa categorias + "uncategorized").
   */
  kitImagesLayout: "ON_TICKETS" | "ON_CATEGORIES";

  /** ticketId (UUID) → productId (UUID) da imagem principal daquele ingresso */
  primaryKitProductByTicketId: Record<string, string>;

  /**
   * categoryId (UUID) → productId (UUID), ou chave literal "uncategorized"
   * para ingressos sem categoria.
   */
  primaryKitProductByCategoryId: Record<string, string>;
}
```

### Regras de validação (recomendadas no backend)

1. **`primaryKitProductByTicketId`**: cada `ticketId` deve existir no evento; cada `productId` deve estar entre os produtos vinculados àquele ingresso (kit).
2. **`primaryKitProductByCategoryId`**: cada `categoryId` deve ser categoria de ingresso do evento (ou a chave exata `uncategorized`); cada `productId` deve pertencer à união dos produtos dos ingressos daquela categoria (ou dos sem categoria).
3. Se `showKitImagesOnSelection === false`, o checkout pode ignorar layout e mapas (ou exigir que ainda assim sejam consistentes — à escolha do produto).
4. **Chave sem categoria**: usar sempre o literal `"uncategorized"` (alinhado ao frontend).

### Compatibilidade snake_case

O frontend **aceita leitura** em snake_case ao parsear `GET event`:

- `show_kit_images_on_selection`
- `kit_images_layout` (valores: `ON_TICKETS`, `ON_CATEGORIES`)
- `primary_kit_product_by_ticket_id`
- `primary_kit_product_by_category_id`

Na **escrita**, o frontend envia **camelCase** no `PATCH` (como nas demais propriedades do evento). O backend pode aceitar camelCase apenas ou também snake_case no body.

## Persistência sugerida (backend)

1. **Opção A — coluna JSON no modelo `Event`**
   - `kit_selection_display` (JSONB / JSON), nullable.
   - Migração: default `NULL`; ao ler, tratar `NULL` como “usar defaults do cliente”.

2. **Opção B — colunas flat**
   - `show_kit_images_on_selection BOOLEAN`
   - `kit_images_layout ENUM('ON_TICKETS', 'ON_CATEGORIES')`
   - Dois JSONs opciais para os mapas, ou tabelas `event_ticket_kit_primary` / `event_category_kit_primary`.

A opção A costuma ser mais rápida de iterar e coincide com o payload do `PATCH`.

## Endpoint

- **Método**: `PATCH /api/v1/events/:id`
- **Body parcial**: pode incluir apenas `kitSelectionDisplay` junto de outros campos do evento.
- **Resposta**: objeto `event` atualizado deve incluir `kitSelectionDisplay` (ou equivalente) para o próximo `GET`.

## Uso no checkout / app público

Quando implementar a tela de escolha de ingressos para o participante:

- Se `!showKitImagesOnSelection`, não renderizar galeria de kit.
- Se `kitImagesLayout === ON_TICKETS`, usar `primaryKitProductByTicketId[ticketId]` para destacar a imagem na linha do ingresso.
- Se `ON_CATEGORIES`, usar `primaryKitProductByCategoryId[categoryId]` ou `["uncategorized"]` no bloco da categoria.

## Referência no código frontend

- Tipos e parsing: `src/lib/eventKitSelectionDisplay.ts`
- `Event.kitSelectionDisplay`: `src/interfaces/event.ts`
- Serviço: `CreateEventRequest.kitSelectionDisplay` em `OrganizerService.ts`
- UI: `TicketAdvancedKitDisplayOptions`, `KitImagePositionDrawer`, página `edit/tickets`
