# API — Fotos do produto (múltiplas imagens)

## Contexto

O modal de criação/edição de produto (`CreateProductModal`) passou a suportar até **5 fotos** por produto, com seleção de imagem principal. Este documento descreve os campos que o frontend envia e como a API deve tratá-los.

---

## Campos enviados pelo frontend

### `POST /api/v1/events/:eventId/products`
### `PATCH /api/v1/events/:eventId/products/:productId`

```json
{
  "name": "Camiseta",
  "image": "<base64 ou URL da imagem principal>",
  "images": [
    "<base64 ou URL — foto 0>",
    "<base64 ou URL — foto 1>",
    "<base64 ou URL — foto 2>"
  ],
  "primaryImageIndex": 1
}
```

| Campo               | Tipo             | Obrigatório | Descrição |
|---------------------|------------------|-------------|-----------|
| `image`             | `string \| null` | Não         | Imagem principal. Atalho backward-compatible: sempre igual a `images[primaryImageIndex]`. Se nenhuma foto foi adicionada, é `null`. |
| `images`            | `string[]`       | Não         | Array com todas as fotos, na ordem em que aparecem no upload. Omitido quando vazio. Máximo de 5 itens. Cada item é um data URL (`data:image/...;base64,...`) ou URL pública já existente. |
| `primaryImageIndex` | `number`         | Não         | Índice (0-based) dentro de `images` que representa a foto principal. Omitido quando há apenas 1 foto (neste caso `image` já é suficiente). |

---

## Regras

- **`image`** é enviado sempre que há ao menos uma foto — é o campo atual da API e garante retrocompatibilidade.
- **`images`** é enviado apenas quando `images.length > 0`.
- **`primaryImageIndex`** é enviado apenas quando `images.length > 1`. Se omitido, a API deve assumir `0`.
- A ordem das fotos em `images` reflete a ordem de exibição no modal (esquerda → direita).
- Se o usuário remover todas as fotos, `image: null` e `images` é omitido.

---

## GET — resposta esperada para edição

Quando o frontend abre o modal em modo de edição, ele lê os seguintes campos do produto retornado pela API:

```json
{
  "id": "...",
  "name": "Camiseta",
  "image": "<URL da imagem principal>",
  "images": ["<URL foto 0>", "<URL foto 1>", "<URL foto 2>"],
  "primaryImageIndex": 1
}
```

| Campo               | Tipo       | Fallback do frontend |
|---------------------|------------|----------------------|
| `images`            | `string[]` | Se ausente, usa `[image]` para compatibilidade com produtos antigos. |
| `primaryImageIndex` | `number`   | Se ausente, assume `0`. |
| `image`             | `string`   | Usado apenas se `images` estiver vazio/ausente. |

---

## Exemplo — produto com 1 foto (comportamento atual, sem mudança)

```json
{
  "name": "Boné",
  "image": "data:image/png;base64,...",
  "images": ["data:image/png;base64,..."]
}
```

`primaryImageIndex` é omitido (só 1 foto).

---

## Exemplo — produto com 3 fotos, a segunda como principal

```json
{
  "name": "Camiseta",
  "image": "data:image/png;base64,<foto1>",
  "images": [
    "data:image/png;base64,<foto0>",
    "data:image/png;base64,<foto1>",
    "data:image/png;base64,<foto2>"
  ],
  "primaryImageIndex": 1
}
```
