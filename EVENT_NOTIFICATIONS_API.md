# API — Notificações do evento (Central de Comunicação)

Especificação para o backend expor **listagem paginada**, **criação** e **detalhe** de notificações de um evento, alinhada ao frontend em:

- `src/app/organizer/(logged)/events/[id]/notifications/page.tsx`
- `src/components/Organizer/EventNotificationsPanel.tsx` (tabela + filtros)
- `src/components/Organizer/CreateNotificationDrawer.tsx` (criação)
- `src/components/Organizer/NotificationDetailsDrawer.tsx` (detalhe)
- `src/components/Organizer/eventNotificationConstants.ts` (tipos canônicos)

**Público-alvo:** backend, contrato de integração, revisão de performance.

---

## 1. Visão geral do produto

| Fluxo | Comportamento esperado |
|--------|-------------------------|
| **Lista** | Histórico de envios com data/hora, título, canais, status e ação “Detalhes”. |
| **Filtros** | Busca por texto no **título** (e opcionalmente no corpo — ver §6). Filtro por **status**. |
| **Criar** | Título (assunto), corpo em **HTML** (Quill: negrito + links), **canais** selecionados. Hoje o UI exige ao menos **E-mail**; Whatsapp está “em breve”. |
| **Detalhe** | Mesmos metadados + **corpo completo** (`messageHtml`) para leitura. |

O envio pode ser **assíncrono** (fila → processamento → atualização de status). A API deve refletir isso de forma previsível.

---

## 2. Modelo de dados (domínio)

### 2.1 Identificação

- **Escopo:** sempre por **evento** (`eventId` no path).
- **Autorização:** usuário autenticado com permissão de organizador no evento (ex.: permissão `notify` / papel adequado — alinhar com o restante do painel).

### 2.2 Canais (`channels[]`)

Strings **estáveis** (o frontend usa como enum):

| Valor | Uso no UI |
|-------|-----------|
| `email` | E-mail |
| `whatsapp` | Whatsapp (pode ficar desabilitado no UI até estar pronto) |
| `push` | Push no app |

O backend deve **validar** o conjunto; pode rejeitar combinações não suportadas no MVP (ex.: só `email`).

### 2.3 Status (`status`)

Strings **estáveis**:

| Valor | Rótulo no UI (pt-BR) |
|-------|----------------------|
| `review` | Em análise |
| `sent` | Enviado |
| `denied` | Negado / Recusado (conforme copy de produto) |

Fluxo típico sugerido: `review` → (`sent` | `denied`). Se o envio for instantâneo, pode criar já como `sent`.

### 2.4 Conteúdo da mensagem

- **`title`**: string curta (assunto).
- **`messageHtml`**: HTML gerado pelo editor (subset: parágrafos, **negrito**, **links**).  
  - **Obrigatório sanitizar no servidor** (whitelist de tags/atributos) para evitar XSS ao reexibir no painel e ao enviar por e-mail.
- **`occurredAt`**: instante de referência para a lista (ex.: criação do registro ou **envio concluído** — definir uma regra única e documentar).

---

## 3. Convenções HTTP (alinhamento com o restante do projeto)

- Prefixo sugerido: `/api/v1/organizer/events/:eventId/notifications` (ou sob o namespace que já existir para “eventos do organizador”).
- Respostas com envelope quando aplicável: `{ "message": "...", "data": { ... } }`.
- Erros: `4xx`/`5xx` com corpo `{ "message": "..." }` (ou padrão já usado em `ORGANIZATIONS_HTTP_REFERENCE.md`).
- **camelCase** nos JSON.

---

## 4. Endpoints

### 4.1 Listar notificações (paginado + filtros)

**Objetivo:** alimentar a tabela sem carregar o corpo HTML completo de cada item.

```http
GET /api/v1/organizer/events/:eventId/notifications
```

**Query (todos opcionais):**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `page` | int | Página (default `1`). |
| `limit` | int | Itens por página (default `8`, máx. sugerido `50`). |
| `q` | string | Busca por **título** (trim; opcionalmente também `message` — ver §6). |
| `status` | string | `review` \| `sent` \| `denied` \| omitido = todos. |

**Resposta 200 (exemplo):**

```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "occurredAt": "2026-03-10T12:00:00.000Z",
        "title": "Promoção 2º Lote",
        "channels": ["email", "whatsapp"],
        "status": "sent"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 8,
      "total": 42,
      "totalPages": 6
    }
  }
}
```

**Regra de performance:** **não** incluir `messageHtml` na lista (ou incluir só um `preview` curto opcional, ver §5.2).

---

### 4.2 Detalhe de uma notificação

**Objetivo:** drawer “Detalhes do envio” com corpo completo.

```http
GET /api/v1/organizer/events/:eventId/notifications/:notificationId
```

**Resposta 200:**

```json
{
  "data": {
    "id": "uuid",
    "occurredAt": "2026-03-10T12:00:00.000Z",
    "title": "Promoção 2º Lote",
    "channels": ["email"],
    "status": "sent",
    "messageHtml": "<p>…</p>"
  }
}
```

**404** se `notificationId` não existir ou não pertencer ao `eventId`.

---

### 4.3 Criar notificação (envio / registro)

```http
POST /api/v1/organizer/events/:eventId/notifications
Content-Type: application/json
```

**Corpo:**

```json
{
  "title": "Promoção 2º Lote",
  "messageHtml": "<p>Texto com <strong>negrito</strong> e <a href=\"https://...\">link</a>.</p>",
  "channels": ["email"]
}
```

**Validação sugerida:**

- `title`: não vazio, limite de tamanho (ex.: 200 chars).
- `messageHtml`: não vazio após strip de tags vazio; sanitizar; limite de tamanho (ex.: 50–100 KB).
- `channels`: array não vazio; valores permitidos conforme produto.

**Resposta 201:**

```json
{
  "message": "Notificação registrada.",
  "data": {
    "id": "uuid",
    "occurredAt": "2026-03-10T12:00:00.000Z",
    "title": "Promoção 2º Lote",
    "channels": ["email"],
    "status": "review"
  }
}
```

**Nota:** o retorno pode ser o **mesmo shape da lista** (sem `messageHtml`) para o frontend atualizar a tabela; o detalhe completo continua via GET §4.2.

**Erros comuns:** `400` (validação), `403` (sem permissão), `404` (evento inexistente).

---

## 5. Performance e escalabilidade

### 5.1 Princípio: separar “lista leve” e “detalhe pesado”

| Cenário | Incluir `messageHtml` |
|---------|------------------------|
| `GET .../notifications` (lista) | **Não** (recomendado) |
| `GET .../notifications/:id` (detalhe) | **Sim** |

O corpo HTML pode ser grande; enviá-lo em centenas de linhas na lista **degrada** tempo de resposta e uso de banda.

### 5.2 Opcional: preview na lista

Se quiser mostrar trecho na UI no futuro:

- Campo **`preview`** (string curta, já sanitizada), **ou**
- `messagePreviewMaxLength` gerado no servidor (primeiros N caracteres do texto puro).

Manter **lista** estável mesmo com `q` buscando no corpo: usar **índice de texto completo** ou busca delegada a serviço de busca (OpenSearch/Elastic), não `LIKE '%...%'` em tabela grande sem índice.

### 5.3 Paginação

- **Offset** (`page` + `limit`) atende o frontend atual (paginação numérica).
- Para **muitos** registros, considerar **cursor** (`cursor` + `limit`) em uma v2; documentar `sort` padrão (ex.: `occurredAt DESC`).

### 5.4 Índices sugeridos (SQL)

- `(event_id, occurred_at DESC)`
- Filtro por status: `(event_id, status, occurred_at DESC)`
- Busca por título: índice em `title` ou **trigram** / **full-text** conforme banco.

### 5.5 Cache

- Lista: `Cache-Control: private, no-store` (dados sensíveis ao organizador) **ou** TTL curto se houver CDN interna — **não** cachear público.
- Detalhe: idem.

### 5.6 Processamento assíncrono

Se criação apenas enfileira o envio:

- `POST` retorna `201` com `status: "review"` (ou `queued`).
- Worker atualiza para `sent` / `denied`.
- Opcional: **WebSocket** ou **polling** no frontend (fora do escopo mínimo); o painel pode só refetch ao abrir a lista.

---

## 6. Busca (`q`)

**Mínimo para o frontend atual:** filtrar por **título** (case-insensitive).

**Evolução:** incluir também `message` (texto puro indexado ou HTML indexado após strip). Se isso for custoso, documentar que `q` só aplica a `title` na v1.

---

## 7. Segurança

1. **Sanitização de HTML** no **POST** (e ao rearmazenar): permitir tags alinhadas ao editor. O **Quill 2** gera links assim: `<a href="https://..." target="_blank" rel="noopener noreferrer">`. Se o `sanitize-html` (ou similar) listar `allowedAttributes` para `a` **só** como `['href']`, versões/configurações podem **remover o `<a>` inteiro** ou deixar o link inválido quando `target`/`rel` forem barrados. **Recomendado:**
   - `allowedTags`: `p`, `br`, `strong`, `b`, `a` (e `span` só se o editor passar a emitir).
   - `allowedAttributes['a']`: **`href`**, **`target`**, **`rel`** (e validar `href` com whitelist de protocolos: `http`, `https`, `mailto`).
   - Exemplo mental: `allowedSchemesByTag: { a: ['http', 'https', 'mailto'] }` quando a lib suportar.
2. **Autorização:** apenas membros da organização com permissão para o evento (e idealmente permissão `notify`).
3. **Rate limiting** no `POST` por `eventId` + usuário para evitar abuso de envio em massa.
4. **Auditoria:** registrar `createdBy`, `eventId`, canais e id da notificação para trilha de compliance.

---

## 8. Checklist de implementação (backend)

- [x] `GET` lista paginada com `page`, `limit`, `q`, `status` sem `messageHtml` na lista.
- [x] `GET` detalhe com `messageHtml` completo.
- [x] `POST` criar com validação + sanitização HTML (`sanitize-html`, tags `p`, `br`, `strong`, `b`, `a`).
- [x] Enums `channels` e `status` estáveis conforme §2.
- [x] Índices e ordenação definidos para a lista mais comum (`occurredAt` desc).
- [ ] Testes de permissão (403) e 404 cross-evento (recomendado).
- [x] Comportamento de `occurredAt` (v1): **timestamp de criação do registro**; pode evoluir para “envio concluído” quando houver fila/worker.

**Implementação (neste repositório):**

- Rotas: `GET|POST /api/v1/organizer/events/:eventId/notifications`, `GET .../:notificationId`.
- Autorização: `OrganizerMemberAccessService.assertCanAccessEvent(..., 'notify')`.
- MVP: canal `email` apenas; `whatsapp` / `push` validados como nomes conhecidos mas rejeitados até suporte.
- Migração Prisma: `prisma/migrations/20260319180000_event_notifications/migration.sql` — aplicar com `pnpm db:migrate` / `deploy` e rodar `pnpm db:generate`.
- `POST`: rate limit via `@nestjs/throttler` (bucket `long`, 30 req / 60s por IP).

**Frontend (integrado neste repositório):**

- `src/services/organizer/OrganizerService.ts` — `getEventNotifications`, `getEventNotification`, `createEventNotification` (base: `/api/v1/organizer/events/:eventId/notifications`).
- `src/components/Organizer/EventNotificationsPanel.tsx` — lista paginada + filtros (`q`, `status`), `refreshKey` para atualizar após criar.
- `src/components/Organizer/NotificationDetailsDrawer.tsx` — carrega detalhe via `GET .../:notificationId` ao abrir.
- `src/components/Organizer/CreateNotificationDrawer.tsx` — `POST` com `channels: ["email"]` (MVP alinhado ao backend).
- Tipos exportados em `src/services/index.ts` (`EventNotification`, `CreateEventNotificationRequest`, etc.).

---

## 9. Referência de tipos (frontend)

O frontend espera tipos equivalentes a:

```ts
type NotificationChannel = "whatsapp" | "email" | "push";
type NotificationRowStatus = "review" | "sent" | "denied";

interface EventNotificationRow {
  id: string;
  occurredAt: string; // ISO 8601
  title: string;
  channels: NotificationChannel[];
  status: NotificationRowStatus;
  messageHtml?: string; // obrigatório no detalhe; opcional na lista se não enviado
}
```

Qualquer mudança de enum deve ser **versionada** ou coordenada com o frontend.
