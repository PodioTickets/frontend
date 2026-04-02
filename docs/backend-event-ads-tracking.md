# Evento — Rastreamento e conversões (página Ads)

Documento para o **backend**: contrato da tela **“Rastreamento e Conversões”** do organizador (`/organizer/events/:eventId/ads`), onde o produtor configura IDs de **Meta Pixel**, **Google Analytics 4** e **Google Ads** para medir tráfego e conversões do evento.

**Referência no frontend:** `src/app/organizer/(logged)/events/[id]/ads/page.tsx`  
Hoje o front usa `organizerService.getEventById` só para o nome do evento; **persistência dos IDs ainda não está ligada** (TODOs no código). Após a API existir, o front chamará os endpoints abaixo (ou o equivalente embutido no `event`).

---

## Objetivo de negócio

- Armazenar, **por evento**, três identificadores opcionais (strings), configuráveis pelo organizador autenticado.
- Permitir **ler** ao abrir a página e **atualizar** ao clicar em **Salvar**.
- Valores vazios = “não configurado” (remover ou ignorar no snippet público/checkout, conforme regra de produto).

Nenhum script de terceiro é executado nesta tela do painel; o backend só persiste os IDs para uso futuro (ex.: injeção no site do evento, checkout, tag manager).

---

## Modelo de dados (contrato com o front)

Tipo esperado pelo front (`AdsTrackingData`):

| Campo (camelCase) | Significado na UI | Exemplo / formato típico |
|-------------------|-------------------|---------------------------|
| `metaPixelId` | ID do Pixel Meta (Facebook/Instagram) | Dígitos, ex.: `123456789012345` |
| `googleAnalyticsId` | Measurement ID do GA4 | Prefixo `G-`, ex.: `G-ABC123DEF4` |
| `googleAdsId` | ID da tag de conversão Google Ads | Prefixo `AW-`, ex.: `AW-123456789` |

**Recomendação de armazenamento:** strings **trimadas**; `null` ou string vazia para “não definido”. O front envia strings (podem ser vazias para limpar).

**Alternativas snake_case** (se a API for só snake): `meta_pixel_id`, `google_analytics_id`, `google_ads_id`. O front pode normalizar em `OrganizerService` se necessário.

---

## Opção A — Recurso dedicado (recomendado)

Separa configuração de ads do payload geral do evento e evita `PATCH` gigante em `events/:id`.

### `GET /api/v1/events/:eventId/tracking`

- **Autenticação:** obrigatória (organizador com permissão no evento `eventId`).
- **Resposta sugerida (envelope alinhado ao restante da API):**

```json
{
  "data": {
    "tracking": {
      "metaPixelId": "123456789012345",
      "googleAnalyticsId": "G-XXXX",
      "googleAdsId": "AW-XXXX"
    }
  }
}
```

- Campos ausentes podem ser tratados como `""` ou `null` no front.

### `PATCH /api/v1/events/:eventId/tracking`

- **Body (JSON):** objeto **parcial** — apenas campos enviados são atualizados; omitir campo = não alterar (ou política explícita de “replace whole resource” documentada).

Exemplo (substituir todos os três de uma vez, como o botão Salvar do front):

```json
{
  "metaPixelId": "123456789012345",
  "googleAnalyticsId": "G-ABC123DEF4",
  "googleAdsId": ""
}
```

- **Resposta:** mesmo shape de `GET` (tracking atualizado) ou `204 No Content` se o front passar a só invalidar cache — preferível devolver o objeto para manter o formulário sincronizado.

### Erros

- `401` / `403` — sem sessão ou sem acesso ao evento.
- `404` — evento inexistente.
- `422` — validação (formato inválido, se implementarem regex por prefixo).
- Corpo de erro: mensagem legível em `message` ou `errors[]` (padrão já usado no projeto).

---

## Opção B — Embutir no evento

### `GET /api/v1/events/:eventId`

Incluir no objeto `event` (ou em `data.event`) um campo opcional:

```json
{
  "data": {
    "event": {
      "id": "...",
      "name": "...",
      "tracking": {
        "metaPixelId": "...",
        "googleAnalyticsId": "...",
        "googleAdsId": "..."
      }
    }
  }
}
```

### `PATCH /api/v1/events/:eventId`

Aceitar no body um nested `tracking` com os mesmos campos (parcial ou completo), alinhado ao `updateEvent` já existente no front (`OrganizerService.updateEvent`).

**Prós:** uma única chamada ao carregar o evento.  
**Contras:** payload de evento cresce; atenção para não sobrescrever campos não enviados no PATCH.

---

## Validação (sugestão, não obrigatória no MVP)

| Campo | Sugestão |
|-------|----------|
| `metaPixelId` | Opcional: só dígitos, comprimento típico 15–16. |
| `googleAnalyticsId` | Opcional: regex `^G-[A-Z0-9]+$` (GA4). |
| `googleAdsId` | Opcional: prefixo `AW-` + alfanumérico. |

Se a validação falhar, `422` com mensagem clara para o toast do organizador.

---

## Segurança e permissões

- Apenas usuários com papel de **organizador** (ou equivalente) do evento podem ler/escrever.
- Não expor estes IDs em endpoints públicos do evento **a menos que** o produto decida que a página pública/checkout precisa deles (nesse caso, definir rota pública read-only ou incluir só no HTML do checkout com CSP adequada).

---

## Resumo para implementação

1. Persistir três strings opcionais **por `eventId`** (`metaPixelId`, `googleAnalyticsId`, `googleAdsId`).
2. Expor **leitura** e **atualização** (Opção A: `GET` + `PATCH` em `.../tracking`; Opção B: dentro de `event`).
3. Resposta JSON com envelope `data` consistente com `GET /api/v1/events/:id`.
4. Após o backend estar pronto, o front deve:  
   - na carga da página Ads, preencher o formulário a partir da API;  
   - no Salvar, chamar `PATCH` (ou `updateEvent` com `tracking`) e exibir toast de sucesso/erro.

Arquivo de serviço provável no front após integração: `src/services/organizer/OrganizerService.ts` (`getEventTracking` / `updateEventTracking` ou extensão de `Event`).
