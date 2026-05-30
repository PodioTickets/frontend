# Events GET — `/events/:id` e `/events/slug/:slug`

> **Base URL:** `https://<api-host>/api/v1`
> **Fonte:** `events.controller.ts` (`findOne` / `findBySlug`) + `events.service.ts` + `schema.prisma`
> **Atualizado:** 2026-05-29

Documento de referência do **payload completo** retornado pelas duas rotas públicas de
leitura de evento. Cobre campos escalares, relações aninhadas, campos calculados, o que é
**removido** (strip) e o pós-processamento global que afeta TODA resposta.

---

## Visão geral / diferenças entre as duas rotas

| | `GET /events/:id` (`findOne`) | `GET /events/slug/:slug` (`findBySlug`) |
|---|---|---|
| Identificador | UUID do evento | `slug` (URL-friendly) |
| Auth | `OptionalJwtAuthGuard` (pública; token opcional) | Pública (sem guard) |
| Envelope | `{ message, data: { event } }` | `{ message, data: { event } }` |
| **tickets / ticketCategories / products** | ❌ **NÃO retornados** | ✅ retornados (full, aninhados) |
| `organization` | full + owner `{id, firstName, lastName}` | full + owner `{id, firstName, lastName, email, phone}` |
| `topics` | ✅ (só `isEnabled=true`) | ✅ (só `isEnabled=true`) |
| `questions` | ✅ (todas, inclusive inativas) | ✅ (todas, inclusive inativas) |
| `hasRegistrationSlotsAvailable` | ❌ | ✅ (calculado) |
| `registrationsCount` | ✅ **só** se quem chama é organizador/admin | ❌ |
| Override de `status` p/ `COMPLETED` se `eventDate` passou | ❌ (retorna status cru) | ✅ |
| Cache Redis (backend) | 30s p/ anônimo (organizador faz bypass) | ❌ sem cache |
| Cache-Control (HTTP) | `no-store` (`@NoCache`) | `no-store` (`@NoCache`) |

> ⚠️ **Importante p/ o front:** `/events/:id` é o payload **leve** (sem ingressos). A página
> pública de inscrição usa `/events/slug/:slug`, que traz o catálogo completo de ingressos,
> lotes, produtos e kits.

---

## Envelope de resposta

```jsonc
{
  "message": "Event fetched successfully",
  "data": {
    "event": { /* objeto evento — ver abaixo */ }
  }
}
```

Status: `200`. `404` (`Evento não encontrado`) quando id/slug não existe.
`/events/:id` valida UUID → `400` se o id for malformado.

---

## ⚠️ Pós-processamento GLOBAL (afeta TODA chave da resposta)

Aplicado pelo `ResponseCompressionInterceptor` (global), **depois** do service:

1. **Strip de vazios:** qualquer chave cujo valor seja `null`, `undefined` ou `""` é
   **REMOVIDA** do JSON, recursivamente. → Se um campo opcional (ex.: `description`,
   `bannerUrl`, `instagram`) estiver vazio no banco, ele **não aparece** na resposta. O front
   deve tratar a ausência da chave como "vazio", não assumir que ela sempre existe.
2. **Objeto aninhado que fica vazio após o strip é descartado** (exceto datas).
3. **`createdAt`/`updatedAt`** são **sempre mantidos** e convertidos para ISO 8601 string.
   Todas as outras datas (`eventDate`, `registrationStartDate`, etc.) viram ISO string também.
4. **Arrays no topo da resposta com > 100 itens** são truncados para 50 com
   `{ data, hasMore, total, message }`. (Não se aplica aqui — o evento vem dentro de `data.event`.)

> Consequência: campos marcados como _opcional_ abaixo podem **não estar presentes**. Campos
> _sempre presentes_ são os `NOT NULL` do schema + `createdAt`/`updatedAt`.

---

## Campos REMOVIDOS do payload público (strip explícito no service)

`stripPublicEventForSlug` (usado pelas DUAS rotas) remove do nível do evento:

| Campo removido | Motivo |
|---|---|
| `metaPixelId` | ID de tracking (Meta) — não pertence ao contrato público |
| `googleAnalyticsId` | ID de tracking (GA) |
| `googleAdsId` | ID de tracking (Google Ads) |
| `organizerFeePercent` | Taxa interna Podio↔organizador — participante não deve ver |
| `retentionRate` | Taxa de retenção interna |

> `participantFeePercent` é **PRESERVADO** de propósito: o participante paga essa taxa e o
> front precisa dela pra montar o breakdown do checkout.

---

## `event` — campos escalares (modelo `Event`)

Presentes nas duas rotas (salvo os removidos acima). Tipos em centavos onde indicado.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| `id` | string (UUID) | sempre | |
| `organizationId` | string (UUID) | sempre | |
| `name` | string | sempre | |
| `slug` | string | opcional | único |
| `description` | string | opcional | |
| `bannerUrl` | string | opcional | |
| `logoUrl` | string | opcional | |
| `location` | string | sempre | nome do local |
| `city` | string | sempre | |
| `state` | string | sempre | |
| `country` | string | sempre | |
| `zipCode` | string | opcional | CEP |
| `neighborhood` | string | opcional | bairro |
| `googleMapsLink` | string | opcional | |
| `contactEmail` | string | opcional | (coluna `contact_email`) |
| `instagram` | string | opcional | |
| `facebook` | string | opcional | |
| `youtube` | string | opcional | |
| `tiktok` | string | opcional | |
| `website` | string | opcional | |
| `regulationUrl` | string | opcional | PDF do regulamento |
| `eventDate` | ISO datetime | sempre | |
| `registrationStartDate` | ISO datetime | sempre | |
| `registrationEndDate` | ISO datetime | sempre | |
| `status` | enum `EventStatus` | sempre | `DRAFT`/`PUBLISHED`/`COMPLETED`/… Ver override por data abaixo. |
| `kitSelectionDisplay` | JSON | opcional | opções avançadas de exibição de imagens do kit |
| `participantFeePercent` | float (0–100) | sempre | taxa repassada ao participante |
| `maxInstallments` | int | sempre | máx. parcelas sem juros (1–3) |
| `financialSettingsLockedAt` | ISO datetime | opcional | data de bloqueio das configs financeiras |
| `createdAt` | ISO datetime | sempre | |
| `updatedAt` | ISO datetime | sempre | |

**Removidos** (não vêm): `metaPixelId`, `googleAnalyticsId`, `googleAdsId`,
`organizerFeePercent`, `retentionRate`.

> **Override de `status`** (só em `/events/slug/:slug`): se `eventDate < agora`, o `status`
> retornado é forçado para `COMPLETED`, independentemente do valor no banco. `/events/:id`
> **não** faz esse override (retorna o status cru).

---

## `event.organization` (modelo `Organization` — objeto completo)

> ⚠️ **Observação de segurança:** a organização é incluída **inteira** (`include`, sem
> `select`) nas duas rotas. Isso significa que, se preenchidos, campos sensíveis como dados
> bancários e documentos **vazam no endpoint público**. Ver "Riscos / pendências" no fim.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| `id` | string (UUID) | sempre | |
| `name` | string | sempre | razão social |
| `tradeName` | string | opcional | nome fantasia |
| `document` | string | opcional | CPF/CNPJ (⚠️ sensível) |
| `logoUrl` | string | opcional | |
| `email` | string | sempre | |
| `phone` | string | opcional | |
| `whatsapp` | string | opcional | |
| `siteUrl` | string | opcional | |
| `instagram` | string | opcional | |
| `description` | string | opcional | |
| `fiscalEmail` | string | opcional | ⚠️ e-mail fiscal |
| `zipCode`, `street`, `number`, `neighborhood`, `city`, `state` | string | opcional | endereço |
| `ownerName` | string | opcional | ⚠️ |
| `ownerDocument` | string | opcional | ⚠️ CPF do responsável |
| `bankName`, `bankCode`, `agency`, `account`, `accountType`, `accountHolderName`, `accountHolderDocument` | string | opcional | ⚠️⚠️ **dados bancários** |
| `isActive` | boolean | sempre | |
| `createdAt` / `updatedAt` | ISO datetime | sempre | |
| `members` | array | sempre | **só os OWNER** (ver abaixo) |

### `event.organization.members[]` (modelo `OrganizationMember`, filtrado a `role=OWNER`)

- `/events/:id`: **1** owner (`take: 1`). `/events/slug/:slug`: **todos** os owners.

| Campo | Tipo | Observação |
|---|---|---|
| `id` | string (UUID) | |
| `organizationId` | string (UUID) | |
| `userId` | string (UUID) | |
| `role` | enum | sempre `OWNER` (filtro) |
| `permissions` | JSON | opcional |
| `restrictedToEvents` | boolean | |
| `createdAt` / `updatedAt` | ISO datetime | |
| `user` | objeto | dados do owner — **difere por rota** ⬇️ |

### `event.organization.members[].user`

| Campo | `/events/:id` | `/events/slug/:slug` |
|---|---|---|
| `id` | ✅ | ✅ |
| `firstName` | ✅ | ✅ |
| `lastName` | ✅ | ✅ |
| `email` | ❌ | ✅ |
| `phone` | ❌ | ✅ |

---

## `event.topics[]` (modelo `EventTopic`) — ambas as rotas

Filtrado a `isEnabled=true`, ordenado por `order` asc.

| Campo | Tipo | Observação |
|---|---|---|
| `id` | string (UUID) | |
| `eventId` | string (UUID) | |
| `title` | string | |
| `content` | string | |
| `isEnabled` | boolean | sempre `true` (filtro) |
| `isDefault` | boolean | tópicos padrão (Descrição, Kit, Premiação, Regulamento) |
| `isRequired` | boolean | |
| `order` | int | |
| `createdAt` / `updatedAt` | ISO datetime | |

---

## `event.questions[]` (modelo `Question`) — ambas as rotas

Ordenado por `order` asc. **Sem filtro de `isActive`** → retorna TODAS as perguntas (inclusive
inativas). O front deve filtrar por `isActive` se quiser só as ativas.

| Campo | Tipo | Observação |
|---|---|---|
| `id` | string (UUID) | |
| `eventId` | string (UUID) | |
| `question` | string | enunciado |
| `description` | string (opcional) | |
| `type` | string | `text`/`select`/`checkbox`/`radio` |
| `options` | JSON (opcional) | para select/radio/checkbox |
| `appliesTo` | string (opcional) | `'all'` ou JSON array de ticket IDs |
| `isRequired` | boolean | |
| `isActive` | boolean | ⚠️ pode vir `false` |
| `order` | int | |
| `createdAt` / `updatedAt` | ISO datetime | |

---

## A partir daqui: **SÓ em `/events/slug/:slug`**

`/events/:id` **não** retorna ingressos, categorias nem produtos.

### `event.ticketCategories[]` (modelo `TicketCategory`)

Ordenado por `order` asc. Cada categoria carrega seus próprios `tickets` aninhados (mesmo
shape de `event.tickets[]` abaixo, filtrados àquela categoria e ordenados).

| Campo | Tipo | Observação |
|---|---|---|
| `id` | string (UUID) | |
| `eventId` | string (UUID) | |
| `name` | string | |
| `description` | string (opcional) | |
| `order` | int | (coluna `sortOrder`) |
| `createdAt` / `updatedAt` | ISO datetime | |
| `tickets` | array | ingressos dessa categoria (ver shape abaixo) |

### `event.tickets[]` (modelo `Ticket`) — lista ORDENADA global

Apenas `isActive=true`. Ordem: primeiro os ingressos agrupados por categoria (na ordem das
categorias), depois os **sem categoria**. Cada item:

| Campo | Tipo | Observação |
|---|---|---|
| `id` | string (UUID) | |
| `eventId` | string (UUID) | |
| `categoryId` | string (UUID, opcional) | null = sem categoria |
| `sortOrder` | int | |
| `name` | string | |
| `description` | string (opcional) | |
| `modality` | string | ex.: "Corrida de rua" |
| `distance` | string (opcional) | |
| `distanceUnit` | string (opcional) | default `KM` |
| `gender` | string (opcional) | `all`/`male`/`female` |
| `ageLimitMin` / `ageLimitMax` | int (opcional) | |
| `hasKit` | boolean | |
| `kitId` | string (UUID, opcional) | |
| `isActive` | boolean | sempre `true` (filtro) |
| `createdAt` / `updatedAt` | ISO datetime | |
| `batches` | array | lotes (ver abaixo) |
| `products` | array | produtos vinculados ao ingresso (ver abaixo) |
| `category` | objeto `TicketCategory` \| null | a categoria do ingresso |
| `kit` | objeto `Kit` \| null | kit + itens (ver abaixo) |

#### `event.tickets[].batches[]` (modelo `TicketBatch`)

Ordenado por `price` asc.

| Campo | Tipo | Observação |
|---|---|---|
| `id` | string (UUID) | |
| `ticketId` | string (UUID) | |
| `quantity` | int | estoque total do lote |
| `availableQuantity` | int | disponível |
| `price` | int | **centavos** |
| `startDate` / `endDate` | ISO datetime (opcional) | janela do lote |
| `sortOrder` | int | |
| `triggerType` | string | `BY_TIME` ou `AFTER_PREVIOUS_SOLD_OUT` |
| `createdAt` / `updatedAt` | ISO datetime | |

#### `event.tickets[].products[]` (modelo `TicketProduct`)

Ordenado por `sortOrder` asc. Vínculo ingresso↔produto; o produto vem aninhado.

| Campo | Tipo | Observação |
|---|---|---|
| `id` | string (UUID) | |
| `ticketId` | string (UUID) | |
| `productId` | string (UUID) | |
| `sortOrder` | int | |
| `createdAt` | ISO datetime | |
| `product` | objeto `Product` | **com `variations[]`** (ver modelo Product abaixo) |

#### `event.tickets[].kit` (modelo `Kit`, opcional)

| Campo | Tipo | Observação |
|---|---|---|
| `id` | string (UUID) | |
| `eventId` | string (UUID) | |
| `name` | string | |
| `description` | string (opcional) | |
| `isActive` | boolean | |
| `createdAt` / `updatedAt` | ISO datetime | |
| `items` | array `KitItem` | cada item com `product` aninhado |

`kit.items[]` (modelo `KitItem`): `id`, `kitId`, `productId` (opcional), `name`,
`description` (opcional), `sizes` (JSON: array `{size, stock}`), `isActive`,
`createdAt`/`updatedAt`, `product` (objeto `Product` ou null).

### `event.products[]` (modelo `Product`) — catálogo de produtos do evento

Ordenado por `createdAt` desc. (Inclui soft-deleted? — vem com `deletedAt` preenchido se
removido; o front deve ignorar produtos com `deletedAt`.)

| Campo | Tipo | Observação |
|---|---|---|
| `id` | string (UUID) | |
| `eventId` | string (UUID) | |
| `name` | string | |
| `image` | string (opcional) | legado |
| `images` | string[] | galeria |
| `primaryImageIndex` | int | |
| `isIncludedInTicket` | boolean | |
| `basePrice` | int | **centavos** |
| `isRequired` | boolean | |
| `variationType` | string (opcional) | ex.: "Tamanhos" |
| `buyerVariationEditAllowed` | boolean | |
| `variationEditDeadlineDays` | int | |
| `deletedAt` | ISO datetime (opcional) | soft delete |
| `createdAt` / `updatedAt` | ISO datetime | |
| `variations` | array `ProductVariation` | ordenado por `name` asc |

`products[].variations[]` (modelo `ProductVariation`): `id`, `productId`, `name`,
`price` (**centavos**), `stock` (int, `0` = ilimitado), `createdAt`/`updatedAt`.

---

## Campos CALCULADOS (não são colunas)

| Campo | Rota | Tipo | Descrição |
|---|---|---|---|
| `hasRegistrationSlotsAvailable` | `/events/slug/:slug` | boolean | `true` se há vaga p/ inscrição (considera status, data, estoque dos ingressos). |
| `registrationsCount` | `/events/:id` | int | Inscrições **CONFIRMED** do evento. **Só** aparece quando quem chama é organizador (OWNER/EMPLOYEE com acesso) ou admin (autenticado). Para anônimo/participante não vem. |

---

## Exemplo — `GET /events/slug/:slug` (resumido)

```jsonc
{
  "message": "Event fetched successfully",
  "data": {
    "event": {
      "id": "999ef0df-…",
      "organizationId": "…",
      "name": "Maratona da Cidade 2026",
      "slug": "maratona-da-cidade-2026",
      "location": "Parque Central",
      "city": "São Paulo", "state": "SP", "country": "BR",
      "eventDate": "2026-08-10T09:00:00.000Z",
      "registrationStartDate": "2026-05-01T00:00:00.000Z",
      "registrationEndDate": "2026-08-01T23:59:59.000Z",
      "status": "PUBLISHED",
      "participantFeePercent": 8,
      "maxInstallments": 3,
      "createdAt": "…", "updatedAt": "…",
      "organization": {
        "id": "…", "name": "Run Eventos LTDA", "tradeName": "Run Eventos",
        "email": "contato@run.com", "isActive": true,
        "createdAt": "…", "updatedAt": "…",
        "members": [
          { "id": "…", "role": "OWNER", "userId": "…",
            "user": { "id": "…", "firstName": "Ana", "lastName": "Lima",
                      "email": "ana@run.com", "phone": "+5511…" } }
        ]
      },
      "topics": [ { "id": "…", "title": "Descrição", "content": "…", "order": 0, "isEnabled": true, … } ],
      "questions": [ { "id": "…", "question": "Tamanho da camiseta?", "type": "select", "options": […], "isRequired": true, "isActive": true, … } ],
      "ticketCategories": [
        { "id": "…", "name": "Corrida", "order": 0, "tickets": [ /* … */ ] }
      ],
      "tickets": [
        {
          "id": "…", "name": "5KM", "modality": "Corrida de rua", "sortOrder": 0,
          "categoryId": "…", "hasKit": true, "isActive": true,
          "batches": [ { "id": "…", "price": 9000, "quantity": 500, "availableQuantity": 312, "triggerType": "BY_TIME", … } ],
          "products": [ { "id": "…", "sortOrder": 0, "product": { "id": "…", "name": "Camiseta", "basePrice": 0, "variations": [ { "id": "…", "name": "G", "price": 0, "stock": 50 } ] } } ],
          "category": { "id": "…", "name": "Corrida", … },
          "kit": { "id": "…", "name": "Kit Atleta", "items": [ { "id": "…", "name": "Camiseta", "sizes": [{"size":"G","stock":50}], "product": { … } } ] }
        }
      ],
      "products": [ { "id": "…", "name": "Camiseta", "basePrice": 0, "images": [], "variations": [ … ] } ],
      "hasRegistrationSlotsAvailable": true
    }
  }
}
```

## Exemplo — `GET /events/:id` (resumido)

Mesmo `event` escalar + `organization` (owner **sem** email/phone) + `topics` + `questions`.
**Sem** `tickets`/`ticketCategories`/`products`/`hasRegistrationSlotsAvailable`.
`registrationsCount` só quando o caller é organizador/admin:

```jsonc
{
  "message": "Event fetched successfully",
  "data": {
    "event": {
      "id": "999ef0df-…", "name": "Maratona da Cidade 2026", "status": "PUBLISHED",
      "organization": { "members": [ { "user": { "id": "…", "firstName": "Ana", "lastName": "Lima" } } ], … },
      "topics": [ … ],
      "questions": [ … ],
      "registrationsCount": 1240   // só p/ organizador/admin
    }
  }
}
```

---

## Riscos / pendências (não-bloqueantes, p/ avaliação)

1. **⚠️ Vazamento de dados da organização em rota pública.** `organization` é incluída inteira
   (sem `select`) nas duas rotas → dados bancários (`account`, `agency`, `bankCode`, …),
   documentos (`document`, `ownerDocument`, `accountHolderDocument`) e `fiscalEmail` são
   expostos a qualquer um, **se preenchidos**. O `ResponseCompressionInterceptor` só esconde os
   que estiverem vazios. **Recomendação:** trocar por um `select` explícito da organização nas
   duas queries, expondo apenas `{ id, name, tradeName, logoUrl, email, phone, whatsapp,
   siteUrl, instagram, description, city, state }`.
2. **Inconsistência de `status`** entre as rotas: `/events/slug/:slug` força `COMPLETED` quando
   a data passou; `/events/:id` não. Alinhar se o front depende disso.
3. **`questions` sem filtro de `isActive`** nas duas rotas: perguntas inativas vêm no payload.
   Confirmar se é intencional (front filtra) ou se deve filtrar no backend.
