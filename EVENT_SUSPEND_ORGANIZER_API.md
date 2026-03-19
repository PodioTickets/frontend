# API — Suspender e reativar evento (organizador)

## Visão geral

Endpoints para o **organizador** alterar a visibilidade pública do evento sem cancelá-lo:

| Ação | Endpoint | Transição de status |
|------|----------|---------------------|
| **Publicar** (primeira vez) | `POST /api/v1/events/:eventId/publish` | `DRAFT` → `PUBLISHED` (com validações) |
| **Suspender** | `POST /api/v1/events/:eventId/suspend` | `PUBLISHED` → `SUSPENDED` |
| **Reativar** | `POST /api/v1/events/:eventId/resume` | `SUSPENDED` → `PUBLISHED` |

**Quem pode chamar**: usuário autenticado que seja membro da **organização do evento** com papel **OWNER** ou **EMPLOYEE**.

**Base URL** (exemplo): `https://api.exemplo.com`

---

## Autenticação

Todos os endpoints exigem header:

```http
Authorization: Bearer <JWT>
```

Sem token válido → **401 Unauthorized**.

Usuário não pertence à organização do evento → **400** com mensagem indicando que apenas membros (OWNER/EMPLOYEE) podem executar a ação.

---

## POST — Suspender evento

Remove o evento das **listagens públicas** (busca/listagem filtram apenas `PUBLISHED`) e **bloqueia novas inscrições**. Inscrições já confirmadas não são alteradas.

**Método**: `POST`  
**URL**: `/api/v1/events/:eventId/suspend`

**Path**:
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `eventId` | UUID | sim | ID do evento |

**Body**: vazio (sem JSON obrigatório).

**Exemplo**:
```bash
curl -X POST "https://api.exemplo.com/api/v1/events/550e8400-e29b-41d4-a716-446655440000/suspend" \
  -H "Authorization: Bearer SEU_JWT"
```

**Respostas**:

| Status | Descrição |
|--------|-----------|
| **200** | Evento suspenso. Corpo inclui `message` e `data.event` com `status: "SUSPENDED"`. |
| **400** | Evento não está `PUBLISHED` (ex.: rascunho, já suspenso, cancelado). Mensagem: *Somente eventos publicados podem ser suspensos*. |
| **401** | Não autenticado. |
| **404** | Evento não encontrado. |

**Exemplo de resposta 200**:
```json
{
  "message": "Evento suspenso com sucesso",
  "data": {
    "event": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "SUSPENDED",
      "...": "demais campos do evento"
    }
  }
}
```

---

## POST — Reativar evento suspenso

Volta o evento para **publicado**, reaparecendo nas vitrines e permitindo novas inscrições (desde que as regras de negócio de inscrição continuem válidas).

**Método**: `POST`  
**URL**: `/api/v1/events/:eventId/resume`

**Path**:
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `eventId` | UUID | sim | ID do evento |

**Body**: vazio.

**Exemplo**:
```bash
curl -X POST "https://api.exemplo.com/api/v1/events/550e8400-e29b-41d4-a716-446655440000/resume" \
  -H "Authorization: Bearer SEU_JWT"
```

**Respostas**:

| Status | Descrição |
|--------|-----------|
| **200** | Evento reativado. `data.event.status` = `PUBLISHED`. |
| **400** | Evento não está `SUSPENDED`. Mensagem: *Somente eventos suspensos podem ser reativados desta forma*. |
| **401** | Não autenticado. |
| **404** | Evento não encontrado. |

**Exemplo de resposta 200**:
```json
{
  "message": "Evento reativado com sucesso",
  "data": {
    "event": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "PUBLISHED",
      "...": "demais campos do evento"
    }
  }
}
```

> **Nota**: Para **primeira publicação** (sair de `DRAFT`), use **`POST /api/v1/events/:eventId/publish`**, que valida modalidades, local, data futura, etc. O `resume` serve apenas após uma suspensão.

---

## POST — Publicar (referência)

**URL**: `POST /api/v1/events/:eventId/publish`

Coloca o evento em `PUBLISHED` a partir de `DRAFT`, com validações (modalidade ativa, local completo, data futura, etc.). Pode ser usado também em cenários de republicação quando aplicável às regras atuais do backend.

Documentação detalhada das validações: Swagger (`/api` ou rota configurada do projeto).

---

## Comportamento no restante da API

| Situação | Comportamento |
|----------|----------------|
| Listagem pública / busca (sem filtro especial) | Apenas eventos `PUBLISHED`. `SUSPENDED` **não** aparece. |
| Nova inscrição | Exige evento `PUBLISHED`. Com `SUSPENDED`, **não** é possível inscrever. |
| Página por slug (`GET .../events/slug/:slug`) | O evento pode ainda ser retornado com `status: "SUSPENDED"` (quem tem o link vê o estado). |
| Organizador (`includeDraft` + usuário da org) | Eventos da organização continuam listáveis; suspensos aparecem para gestão. |

---

## Enum `EventStatus`

Valores possíveis no modelo:

`DRAFT` · `PUBLISHED` · `SUSPENDED` · `CANCELLED` · `COMPLETED`

**Suspender** ≠ **cancelar**: `CANCELLED` é outro fluxo; estes endpoints tratam apenas `PUBLISHED` ↔ `SUSPENDED`.

---

## Swagger

Os mesmos endpoints estão documentados na tag **Events** do OpenAPI/Swagger da aplicação.
