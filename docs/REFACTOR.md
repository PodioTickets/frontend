# Plano de Refatoração — PodioTickets Frontend

> Auditoria completa em **2026-06-10**. Nota geral inicial: **60/100**.
> Stack moderna (Next 16 / React 19 / React Query / Zod), mas com dívida técnica
> concentrada em arquivos-monstro, ~5k linhas de duplicação, tipagem frouxa e
> baixa cobertura de testes.
>
> Marcar `[x]` ao concluir. Itens ordenados por prioridade dentro de cada bloco.
> Prioridade global do projeto: **Performance → Segurança → Escalabilidade**.

---

## 📌 HANDOFF — Sessão 2026-06-10/11 (para commitar)

**Estado:** 157/157 testes passando (`npx vitest run`). `tsc` com **2 erros PRÉ-EXISTENTES**
(não desta sessão): `src/components/Topic/topicQuillResizeWithSideHandles.ts:122` e
`src/hooks/useLinkedUsers.ts:25`. `ignoreBuildErrors:true` segue ligado (não flipar até
zerar os erros antigos — ver Bloco 4).

### Feito nesta sessão
1. **Segurança (Bloco 1):** XSS sanitizer (`src/lib/richContent.ts` + 7 sinks), `console.*`
   removido em prod (`compiler.removeConsole`), Turnstile (validado no back, confirmado),
   CSRF (revisado: ok via sameSite+Origin), **auth httpOnly** (front+backend — ver abaixo).
2. **Dedup admin×organizer (Bloco 2) — 8 pares COMPLETOS** (~8.700 linhas → módulos
   compartilhados testados): registrations, dashboard, edit/topics, ads, discount/cupom,
   discount/voucher, notifications, financial (admin GANHOU as features do organizer).
3. **Dedup modais:** lista de CPF (`src/lib/cpfList.ts` + `src/hooks/useCpfList.ts`) nos
   modais de Cupom e Voucher.
4. **Auth httpOnly + fixes de dev:** migração de token Bearer→cookie httpOnly (backend
   `server/src/app/auth/`: `auth-cookies.util.ts`, jwt.strategy cookie-first, controllers
   setam cookie; front: ApiClient set*=no-op + cleanup de cookie legado + refresh por
   cookie + gate hasSessionHint). DEV: rodar TUDO em `localhost` (hosts *.localhost/lvh.me
   NÃO funcionam — ver session note 2026-06-10). Redirect admin pós-login via
   `window.location.href`. Pendência do usuário: Turnstile allowlist `localhost`.

### Arquivos NOVOS (para `git add`)
- `docs/REFACTOR.md` (este), `.claude/notes/sessions/2026-06-10.md`
- `src/lib/`: `richContent.ts`, `registrations.ts`, `dashboard.ts`, `adsTracking.ts`, `cpfList.ts` (+ `__tests__/`)
- `src/hooks/`: `useEventDashboard.ts`, `useCpfList.ts`
- `src/components/Registrations/`: `RegistrationRow.tsx`, `RegistrationsWeekTrend.tsx`, `RegistrationsStatsCards.tsx`, `RegistrationsView.tsx` (+ `__tests__/`)
- `src/components/Dashboard/`: `LotsNearDepletionPaginationBar.tsx`, `DashboardRankingLabels.tsx`, `DashboardView.tsx` (+ `__tests__/`)
- `src/components/Event/`: `EventAdsView.tsx`, `EventCouponsView.tsx`, `EventVouchersView.tsx`, `EventNotificationsView.tsx`, `EventFinancialView.tsx` (+ `__tests__/`)
- `src/components/Topic/EventEditTopicsView.tsx` (+ `__tests__/`)
- Backend (`server/`): `src/app/auth/auth-cookies.util.ts`
- Dep nova: `isomorphic-dompurify` (package.json/pnpm-lock)

### Sugestão de commits (separados por tema)
`feat(security): sanitize rich HTML (XSS)` · `feat(security): remove console in prod` ·
`feat(auth): httpOnly cookie auth (front+back)` · `fix(auth): dev cookie/login + legacy cleanup` ·
`refactor(events): dedup admin×organizer (8 pares)` · `refactor(modais): shared CPF list` ·
`test: vitest setup (matchMedia) + suites`

### O que CONTINUAR (próximos)
- Bloco 1: CSP nonce (precisa app rodando + testar 3DS).
- Bloco 2 modais: `useModalSubmitState` + `<ModalFooterActions>` (footer/submit repetido em 15+ modais).
- Bloco 2 misc: `eventListFormatters`, `eventEditValidation`, formatação inline no checkout.
- Bloco 3: arquivos-monstro (PaymentStep 2926, InformationStep 2878, OrganizerService 2992).
- Bloco 5: testar caminho de pagamento.

---

## 🔴 BLOCO 1 — Segurança (em andamento)

- [x] **XSS armazenado em conteúdo rico (Quill/embeds).** Criado
      `src/lib/richContent.ts` (sanitizer DOMPurify isomórfico + allowlist de
      domínios para iframe e script de embed). Aplicado em:
  - `src/components/TopicRichContent.tsx` (render + injeção de script via allowlist)
  - `src/components/Admin/NotificationDetailDrawer.tsx`
  - `src/components/Organizer/NotificationDetailsDrawer.tsx`
  - `src/app/organizer/.../events/[id]/edit/topics/preview/page.tsx`
  - `src/app/organizer/.../events/new/topics/preview/page.tsx`
  - `src/app/admin/.../events/[id]/edit/topics/preview/page.tsx`
  - `src/app/admin/.../events/[id]/review/topics/preview/page.tsx`
  - Coberto por `src/lib/__tests__/richContent.test.ts` (12 testes, inclui bypass).
- [x] **Debug logs sensíveis.** Removidos os `console.log("[metaPixel] ...")`
      `[DEBUG TEMP]` de `src/lib/metaPixel.ts`.
- [x] **Sweep geral de `console.*`** (~179 ocorrências). Resolvido na raiz via
      `compiler.removeConsole` no `next.config.ts`: remove TODOS os `console.*`
      do bundle de produção (mantém `error`/`warn` para observabilidade). Em dev
      os logs continuam. Não precisa caçar log a log nem manter logger custom.
- [x] **Turnstile**: confirmado pelo usuário (2026-06-10) que o token É validado
      no backend. Nada a fazer no front.
- [ ] **CSP `unsafe-inline` em scripts** (`src/proxy.ts:436`). NÃO removido nesta
      sessão — é defense-in-depth (o sink de XSS já está sanitizado) e o fix
      correto (nonce) é all-or-nothing: ao adicionar nonce o browser IGNORA
      `unsafe-inline`, então QUALQUER script inline sem nonce quebra — incluindo
      potencialmente o **SDK 3DS da Braspag** (pagamento). Exige sessão com app
      rodando + verificação de 3DS/Turnstile/embeds. Meta Pixel já é seguro
      (carrega via `<script src>` externo, não inline). **Agendar sessão verificada.**
- [x] **Tokens legíveis por JS → cookie httpOnly** (implementado 2026-06-10,
      front+backend). NÃO precisou de BFF: `withCredentials` já estava ligado, então
      virou auth por cookie httpOnly setado pelo backend.
  - **Backend** (`server/`): `auth-cookies.util.ts` (set/clear httpOnly `access_token`
    + `refresh_token`, `SameSite=Lax`, `Domain` via env `COOKIE_DOMAIN`); JWT strategy
    extrai do cookie com fallback Bearer; login/login-admin/login-organizer/refresh/
    google-validate/2fa-verify-login setam cookies; refresh/logout leem do cookie;
    cookie-dica `pt_authed` (não-httpOnly, sem segredo) p/ o front saber "logado".
    É **aditivo/não-quebrável**: ainda aceita Bearer e devolve token no body.
  - **Frontend**: `ApiClient` para de gravar token (set*=no-op) + `hasSessionHint()`;
    refresh por cookie; `isAuthenticated()` lê `pt_authed`; todos os `fetch()` crus
    (checkout/pix/3ds/status/reservation/telemetria/uploads) → `credentials:"include"`.
  - ⚠️ **DEPLOY**: setar `COOKIE_DOMAIN=.podioticket.com.br` no backend em prod
    (senão o proxy.ts do front não lê o cookie no host da app). Subir backend
    primeiro (seguro) e depois o front. Sessões antigas re-logam 1x.
  - **Config de cookie por ambiente** (auth-cookies.util.ts): PROD SameSite=Lax;
    DEV SameSite=None+Secure+Domain=localhost (auto). DEV é cross-site porque o
    front roda em *.localhost (app./test890.) e a API em localhost → Lax não
    enviaria o cookie (login 200 mas /profile e /me davam 401). Secure é aceito
    over http em *.localhost.
  - **2 regressões corrigidas (2026-06-11):** (1) ApiClient limpa cookie de token
    legado (js-cookie pré-migração) no construtor — sombreava o httpOnly → 401;
    (2) interceptor só tenta /auth/refresh se `hasSessionHint()` + trata /auth/logout
    como auth route — evita "Refresh token ausente" quando deslogado.
  - ⚠️ **TESTAR antes de prod** (não pude rodar aqui): login user/admin/organizer,
    Google OAuth, MFA, refresh (deixar expirar), logout, checkout reserve→pay, PIX,
    **3DS challenge** (aposta do SameSite=Lax), uploads imagem/PDF, guard admin (proxy.ts).
- [x] **CSRF assimétrico** (`ApiClient.ts:248-256`): revisado — adequadamente
      mitigado. A proteção real de CSRF aqui é `sameSite:"strict"` nos cookies de
      token (browser não envia em request cross-site) + validação de `Origin` em
      mutações no `proxy.ts:363-376`. O token CSRF em `/lootbox` e `/purchases` é
      belt-and-suspenders. Estender a todos os endpoints exigiria o backend
      validar — sem ação no front. Se o backend quiser CSRF em tudo, alinhar lá.

---

## 🟠 BLOCO 2 — Duplicação (maior ganho de "menos código": ~5.000 linhas)

- **Espelhamento admin × organizer (~2.500 linhas).** Páginas 95-99% idênticas,
      diferindo só no header/navegação. Abordagem TDD (testar lógica+design antes de
      religar). Um par por vez:
  - [x] **`registrations`** (COMPLETO 2026-06-10). Colapso total:
        `src/lib/registrations.ts` (lógica pura — 18 testes) +
        `src/components/Registrations/{RegistrationRow,RegistrationsWeekTrend,RegistrationsStatsCards,RegistrationsView}.tsx`
        (design — 14 testes RTL). `RegistrationsView` = corpo INTEIRO compartilhado
        (canônico = organizer, por decisão do usuário), header injetado via slot.
        Páginas viraram shells finas: **1290/1295 → 226/230** (−2129 linhas das páginas;
        net ~−870 contando os módulos compartilhados). 120/120 testes, tsc limpo.
        As 2 páginas agora diferem só em: nav hook, redirect de login, header e o load
        de `aggregateStats` (admin) — tudo preservado.
        ⚠️ Mobile do ADMIN agora segue o layout do organizer (decisão aprovada) — validar visual.
  - [x] `events/[id]/dashboard` (COMPLETO 2026-06-11). Colapso total:
        `src/lib/dashboard.ts` (5 testes) + `src/components/Dashboard/{LotsNearDepletionPaginationBar,
        DashboardRankingLabels,DashboardView}.tsx` (design — 9 testes RTL) +
        `src/hooks/useEventDashboard.ts` (controller: 15 useState/15 useMemo/7 useEffect/
        3 queries — todo o estado/derivações). Páginas viraram shells: **1402/1416 → 26/36**.
        134/134 testes, tsc limpo. Polyfill `window.matchMedia` no test setup.
        Divergências unificadas p/ organizer: `selectedQuestionAnswerRows` (guard text/number).
        Preservado: `useEventPermissionGuard` (organizer-only, na página) + redirects.
        ⚠️ Mobile do ADMIN agora segue layout organizer — validar visual.
  - [x] `events/[id]/edit/topics` (COMPLETO 2026-06-11). `<EventEditTopicsView>`
        parametrizado por `navigate`+`eventBasePath`; lógica pura já estava em
        `lib/eventTopicSections`. Páginas: **475/476 → 18/19**. 1 smoke test RTL.
        Canônico=organizer (`content ?? ""`). 135/135 testes.
  - [x] `events/[id]/ads` (COMPLETO 2026-06-11). `src/lib/adsTracking.ts` (logic — 7 testes)
        + `<EventAdsView>` (header via `renderHeader(event)`, redirect via `onUnauthenticated`,
        permission `pixel` fica no organizer). **294/308 → 21/36**. 142/142 testes.
  - [x] `events/[id]/discount/cupom` (COMPLETO) → `<EventCouponsView>` (renderHeader+
        onUnauthenticated; permissão `coupons` no organizer). **483/504 → 21/36**.
  - [x] `events/[id]/discount/voucher` (COMPLETO) → `<EventVouchersView>`. **388/412 → 21/36**.
  - [x] `events/[id]/notifications` (COMPLETO) → `<EventNotificationsView>` (permissão
        `notify` no organizer). **109/127 → 21/36**. 145/145 testes.
  - [x] `events/[id]/financial` (COMPLETO 2026-06-11). Usuário aprovou mesclar as
        features do organizer no admin. `<EventFinancialView>` (canônico=organizer:
        exportação fiscal + solicitar repasse + drawers de repasse/parcelas/estorno/
        chargeback). Admin GANHOU essas features. Removido import/estado morto do
        organizer (RevenueChart/PaymentMethodsCard/TicketsWithLotsList/eventTabs não
        renderizados). **538/615 → 21/36**. 146/146 testes.
  - **✅ BLOCO 2 (admin×organizer) 100% — 8 pares, ~8.700 linhas de página removidas.**
  - [x] (fase 2 — COMPLETO 2026-06-17) controller compartilhado das páginas espelhadas.
        Esclarecimento: o *corpo JSX* já estava colapsado nos componentes `View`; o que
        restava duplicado era a LÓGICA DE CONTROLLER. Dashboard já tinha `useEventDashboard`;
        os pares cupom/voucher/ads/notifications/financial já eram shells de 21–38 linhas.
        O único outlier era **registrations** (admin 252 / organizer 256, ~190 linhas de
        controller duplicadas) → extraído `src/hooks/useEventRegistrations.ts` (auth, loaders,
        filtros, paginação, modais; diferenças via `onUnauthenticated` + `loadAggregateStats`).
        Páginas viraram shells: **252/256 → 59/66**. 220/220 testes, sem erros novos de tsc.
        (Um `<EventPageShell>` genérico não agrega: cada página só passa `header` + `{...viewProps}`.)
- **Modais com boilerplate repetido (~1.100 linhas).**
  - [x] **Lista de CPF + import CSV** (CreateCoupon/CreateVoucherModal, ~200 linhas
        idênticas) → `src/lib/cpfList.ts` (puro: format/validate/parse CSV — 11 testes)
        + `src/hooks/useCpfList.ts` (estado + handlers). Modais: 1447→1359 e 938→845.
        157/157 testes, tsc limpo.
  - [x] **`useModalSubmitState()` criado** (`src/hooks/useModalSubmitState.ts`, 4 testes) —
        `runSubmit(fn)` encapsula `setIsSubmitting(true)` + try/finally (nunca esquece o
        finally). Adotado em: ChangePassword, ChangeEmail, ContactOrganizer, RequestTransfer,
        CreateQuestion (handlers). FALTAM (deferidos pro split do Bloco 3, são arquivos-monstro):
        CreateProduct, CreateCoupon, CreateVoucher, Login, Register.
  - [x] **`<ModalFooterActions>` criado** (`src/components/ui/ModalFooterActions.tsx`, 4 testes) —
        footer canônico Cancelar(outline)+Submit(default verde); overrides de className por
        botão/wrapper p/ casar spacing sem regressão visual. Adotado em ChangePassword.
        Footers com layout próprio (h-11, multi-step, tela de sucesso, gating turnstile)
        seguem com markup dedicado de propósito (evitar regressão visual).
- [x] **Páginas de lista de evento (~250 linhas).** (COMPLETO 2026-06-17)
      `formatCurrency`/`formatDate`/`formatCurrencyBRL` + formatação inline de moeda
      duplicados em `admin/events/page.tsx` e `organizer/events/page.tsx` →
      `src/lib/eventListFormatters.ts` (`formatEventListCurrency` + `formatEventListDate`,
      5 testes vitest). Corrigido bug latente de fuso: o `formatDate` do admin usava
      getters LOCAIS (`getDate/getMonth`), deslocando date-only "-1 dia" no Brasil;
      agora ancora em UTC via `toUtcDate` (datetimeBR, `DateInput` exportado).
- [x] **Validação de edição de evento (~120 linhas).** (COMPLETO 2026-06-17)
      `validateForm` + `isFormValid` + `hasChanges` + `INFORMATION_FIELDS` idênticos
      nas duas `events/[id]/edit/page.tsx` → `src/lib/eventEditValidation.ts`
      (`validateEventInformation`/`isEventInformationValid`/`eventInformationHasChanges`,
      puras, 12 testes vitest). `EditEventFormData` exportado do contexto. Páginas
      diferem só em nav/redirect/className.
- [x] **Formatação inline (~150 linhas).** (COMPLETO 2026-06-18)
  - **Moeda (12 cópias → canônico):** havia `new Intl.NumberFormat("pt-BR",{style:'currency',
    currency:'BRL'})` reimplementado inline em 11 componentes do checkout + o `formatPrice`
    do `SubscriptionStep.utils`. Criado `src/lib/money.ts` (`formatBRL(reais)` +
    `formatBRLFromCents(centavos)`, nome com UNIDADE explícita p/ evitar o erro reais×centavos;
    9 testes). `SubscriptionStep.utils.formatPrice` agora delega a `formatBRL`. Os 11
    componentes importam `formatBRL` com alias do nome local (`formatPrice`/`formatCurrency`/
    `formatPriceCurrency`) → call-sites intactos, saída byte-a-byte igual (BRL já assume 2 casas).
  - **Phone e datetime:** JÁ eram canônicos no checkout (`formatPhoneForCountry`, `formatDateBR`) — nada a fazer.
  - **CEP (`CheckoutAddressSection`):** JÁ usa `postalConfig.format()/.isValid()`; os `.replace(/\D/g)`
    restantes são extração dos 8 dígitos pro lookup ViaCEP (BR-específico, legítimo).
  - **⚠️ Documento NÃO consolidado (de propósito):** as cópias de `maskCPF`/`isBr`/`formatCPF` no
    checkout têm DIVERGÊNCIAS INTENCIONAIS — `PaymentSuccessStep` mascara com 2 dígitos iniciais
    (`12.***`) vs 3 nas demais; `isParticipantBr` do PaymentSuccessStep NÃO normaliza gentílico
    (≠ `isPersonBr` canônico). Unificar mudaria exibição de PII/heurística → adiado (precisa
    decisão de produto; "checkout não pode ter problema"). 406/406 testes, tsc 0 erros.
- [x] **Bloco de descrição de kits** duplicado nas 4 preview pages de tópicos
      (COMPLETO 2026-06-17) → `src/components/Event/TopicsPreviewKitsSection.tsx`.
      Sink único de `sanitizeRichHtml`. Aplicado em organizer new/edit + admin
      edit/review; imports órfãos de `sanitizeRichHtml` removidos. 212/212 testes.

---

## 🟡 BLOCO 3 — Separação de camadas / arquivos-monstro

> Padrão "bom" já existe no projeto: `SubscriptionStep` (`.tsx` + `.utils.ts` +
> `useSubscriptionData.ts`) e `TicketForm` (`.tsx` + `.types.ts` + `.utils.ts` +
> `.draft.ts` + subseções). Replicar esse padrão nos arquivos abaixo.

- [~] **`PaymentStep.tsx` (2.903 linhas) — split EM ANDAMENTO.**
  - [x] **Fase 1 (2026-06-19): tipos + subcomponentes + validação pura.** `2903 → 2212`
        (−691, ~24%). Arquivos novos: `src/interfaces/payment.ts` (`PaymentMethod`/`PaymentOption`/
        `CardErrors`), `src/lib/paymentValidation.ts` (`formatCardNumber` dedup + `cvvMaxLengthForCard`,
        7 testes), `PaymentCardForms.tsx` (`CreditCardForm`+`DebitCardForm`, memo preservado),
        `PixModal.tsx` (`PixModal`+`PixForm`+`API_URL`), `PaymentMethodParts.tsx`
        (`PaymentMethodOption`+`BillingAddressConfirmedSummary`). Imports órfãos limpos.
        tsc 0, 436/436. API pública (`<PaymentStep/>`) intacta.
  - [ ] **Fase 2 (hard, ainda no corpo de 2.212 linhas):** `usePaymentFlow` (estado cartão/débito/
        PIX, parcelas, cupom, handlers de pagamento/3DS), `useBillingAddressForm` (validação por país
        + payload PATCH). `PaymentMethodSelector` se valer. ⚠️ checkout = alto risco; validar ao vivo.
- [~] **`InformationStep.tsx` (2.863 linhas) — split EM ANDAMENTO.**
  - [x] **Fase 1 (2026-06-20): subcomponente + snapshot.** `2863 → 2733` (−130).
        `NationalitySelect.tsx` (dropdown de país, autocontido) extraído; `src/lib/participantSnapshot.ts`
        criado com `readSavedState` (leitura SSR-safe) + tipo `SavedSnapshotMap`. Imports órfãos
        (`COUNTRIES_PT_BR`/`FlagIcon`/`Search`) limpos. tsc 0, 436/436.
  - [ ] **Fase 2 (hard, corpo monolítico):** `useParticipantState` (snapshots/sessionStorage/expand),
        `useParticipantValidation` (CPF/telefone/data/perguntas condicionais), `ParticipantCard`.
        `participantSnapshot.ts` pode crescer com build/apply. ⚠️ checkout = alto risco; validar ao vivo.
- [~] **`CreateProductModal.tsx` (2.347 linhas) — split EM ANDAMENTO.**
  - [x] **Fase 1 (2026-06-18): tipos + validação pura.** `CreateProductModal.types.ts`
        (`ProductVariation`/`LinkedTicketListItem`/`MobileVariationDraft`) +
        `src/lib/productValidation.ts` (puras: `variationStockToPersist`, `categoryLabelFromTicket`,
        `buyerVariationEditStateFromApiProduct`, `sanitizeVariationTypeLabelInput`, `parsePriceReais`,
        `formatPriceFromApi`, `variationHasMeaningfulSpecificPrice`, `maskPriceInputFromDigits`,
        `validateProductForm` retornando `{ok}|{ok,message}` — toast fica no componente). 23 testes
        vitest. Modal: **2347 → 2191**. tsc 0, 429/429 testes.
        NOTA: o `ProductVariation` do modal (form/draft, `price`/`stock` string) é DIFERENTE da
        shape de runtime do checkout (`SubscriptionStep.utils.Product`, numérica/centavos) — NÃO
        unificar; são domínios distintos (edição × consumo).
  - [x] **Fase 2 (2026-06-18): hooks `useProductLinkedTickets` + `useProductImageUpload`.**
        Linked tickets: efeito autocontido (merge props+API, dedup por nome) movido p/ hook
        (clear no close embutido). Image upload: estado `productImages`/`primaryImageIndex` +
        refs do crop + `handleProductCropped`/`handleDrop`/`handleDragOver`; expõe setters p/ a
        hidratação/reset (ainda no componente). Modal: **2191 → 2073**. tsc 0, 429/429.
  - [x] **Fase 3 (2026-06-18): `<ProductLinkedTicketsConfirmDialog>`.** Os 2 diálogos
        (excluir/salvar) quase idênticos → 1 componente parametrizado (título/descrição/cor do
        marcador/fallback/rodapé via props; shell backdrop+lista compartilhado). Modal: **2073 →
        1936**. (`<ProductPreview>` deixado p/ depois — ver abaixo.)
  - [x] **Fase 4 (2026-06-19): `useProductVariations`.** Estado de variação (+ mobile draft) e
        os 10 handlers (add/remove/change/price + bottom-sheets) movidos p/ o hook, que calcula
        `defaultVariationStockFromBatches` internamente e o devolve p/ a hidratação/reset.
        Modal: **1936 → 1842**.
  - [x] **Fase 5 (2026-06-19): subcomponentes de UI.** `<ProductPreview>` (radios de edição +
        prévia do card; 1842→1702), `<ProductVariationMobileSheets>` (2 bottom-sheets mobile;
        1702→1544), `<ProductVariations>` (input do tipo + tabela desktop/cards mobile + add +
        erro dup; 1544→1305). tsc 0, 429/429 em cada passo.
  - **RESUMO Fases 1–5: modal 2347 → 1305 (−1042, ~44%), 9 arquivos novos** (types,
    productValidation+23 testes, useProductLinkedTickets, useProductImageUpload,
    ProductLinkedTicketsConfirmDialog, useProductVariations, ProductPreview,
    ProductVariationMobileSheets, ProductVariations). API pública (`<CreateProductModal/>` sem
    props) intacta. **Lógica e UI todas extraídas.**
  - [ ] **Opcional (não feito de propósito):** `useProductForm` (mover hydrate/reset/snapshot/
        dirty + state de form pra um hook — a orquestração legitimamente pode ficar no container,
        igual `TicketForm`); adoção `useModalSubmitState.runSubmit` em `executeSave`/
        `performDeleteProduct` (dedup cosmético de try/finally, muda control-flow do save → risco
        vs ganho baixo); `<ProductModalFooter>` (footer custom 3-botões, não force `ModalFooterActions`).
- [~] **`LoginModal.tsx` / `RegisterModal.tsx` (~1.600 cada) — split EM ANDAMENTO.**
  - [x] **Login Fase 1 (2026-06-20): painéis de "esqueci senha".** `1601 → 1207` (−394).
        `ForgotPasswordPanels.tsx` (`ForgotPasswordPanel` + `ForgotPasswordEnterCodePanel` +
        `ForgotPasswordNewPasswordPanel` + tipo `ForgotMethod`, todos props-driven). Imports órfãos
        (`Mail`/`Lock`/`ArrowLeft`/`CPFIcon`/`Checkbox`) limpos. `maskCPF`/`GoogleIcon` ficam (GoogleIcon
        local tem SVG distinto do `Icons/GoogleIcon` — não dedupar). tsc 0, 436/436.
  - [~] **Login Fase 2 (EM ANDAMENTO):**
    - [x] **`useForgotPasswordFlow` (2026-06-20).** Toda a máquina de "esqueci senha" (estado +
          3 efeitos: reset-on-close, cooldown, token de `loginModalData` + handlers) extraída p/
          `src/components/Auth/useForgotPasswordFlow.ts`. Render do Login consome o retorno (mesmos
          nomes via destructure). Entrada via ação `startForgotFlowFrom` (encapsula maskCPF). LoginModal
          **1207 → 924** (−283; total −677 vs HEAD 1601). **Verificado: 10/10 handlers byte-idênticos
          ao original (git HEAD)** + tsc 0 + 451/451. ⚠️ smoke test do fluxo ao vivo recomendado.
    - [x] **`useLoginFlow` (2026-06-20).** Login e-mail/senha + MFA + Google OAuth (formData, errors,
          turnstile + refs, mfa*, 4 efeitos + handlers) → `src/components/Auth/useLoginFlow.ts`. Render
          consome via destructure; OTP via `handleMfaCodeChange`. LoginModal **924 → 734** (−190;
          **total 1601 → 734, −54%**). **Verificado: handlers byte-idênticos ao HEAD** (só `handleSubmit`
          trocou `React.FormEvent`→`FormEvent`, corpo idêntico) + tsc 0 + 451/451. ⚠️ smoke ao vivo.
  - **LoginModal Fase 2 COMPLETA: 1601 → 734 (−867, −54%); 3 arquivos novos** (ForgotPasswordPanels +
    useForgotPasswordFlow + useLoginFlow). Só o `GoogleIcon` local e o render permanecem no arquivo.
  - [x] **RegisterModal Fase 2 (2026-06-20): `useRegisterFlow`.** Toda a máquina de cadastro
        (steps 1-4 + completar-perfil Google: estado, 3 efeitos, validações por step, handlers)
        extraída p/ `src/components/Auth/useRegisterFlow.ts`. Os `renderStepX` ficam no componente
        consumindo o destructure. RegisterModal **1580 → 1135** (−445). **Verificado: 11/11 handlers
        byte-idênticos ao HEAD** (handleNext/validateStep*/buildPersonalUpdateData/etc.) + tsc 0 +
        451/451. ⚠️ smoke ao vivo: cadastro novo (BR/estrangeiro) + completar perfil via Google.
- [ ] **God object `OrganizerService.ts` (2.992 linhas).** Dividir por domínio:
      `EventService`, `TicketService`, `CouponService`, `VoucherService`,
      `ProductService`, `OrganizationService`, `AuditService`, `UploadService`.
  - [x] **Fase 1 (COMPLETO 2026-06-17): tipos + normalizadores → `OrganizerService.types.ts`.**
        Movidas ~1.090 linhas (69 interfaces/types + helpers `normalize*`/`unwrap*`).
        `OrganizerService.ts` re-exporta tudo (`export * from "./OrganizerService.types"`)
        → zero mudança em call-sites/imports. Arquivo: 3.041 → classe 1.951 + types 1.180.
        Helpers privados usados pela classe foram exportados. 220/220 testes, tsc sem erros
        novos (seguem os 2 pré-existentes).
  - [~] **Fase 2: split da CLASSE por domínio (EM ANDAMENTO)** — cadeia de herança/mixins
        preservando 100% a API `organizerService.x` (zero call-site tocado; instanciação única
        em `services/index.ts`).
    - [x] **1ª fatia (2026-06-17):** `OrganizerServiceBase` (segura o `protected apiClient`) +
          `OrganizerReportingService` (leitura/relatórios/financeiro: dashboard, financeiro,
          fiscal, repasses, parcelas, estornos, chargebacks, payment-details, inscrições
          enriquecidas, PDFs, contato, bundle — 632 linhas, NÃO usa nenhum helper/símbolo
          externo, só `apiClient`+tipos). `OrganizerService extends OrganizerReportingService`
          com o domínio org/evento/catálogo. **Main 1.950 → 1.321** (+ reporting 714 + base 10
          + types 1.180). 220/220 testes, tsc sem erros novos. Verificado: as 3 chamadas
          método-a-método (`getOrganization`/`updateOrganization`/`getEventTracking`) ficam
          todas no head (subclasse) — tail não chama métodos do head.
    - [x] **2ª fatia (2026-06-17): Catálogo** → `OrganizerCatalogService` (modalidades, kits,
          perguntas, inscrições export/stats/revenue, tópicos, localizações, categorias,
          ingressos, produtos, cupons, vouchers — 687 linhas; usa só `apiClient` +
          `unwrapProductApiPayload`). Inserido na cadeia: Base → Reporting → **Catalog** →
          OrganizerService. **Main 1.321 → 628.** Removido comentário órfão "Dashboard methods".
          220/220 testes, tsc sem erros novos. Cadeia atual: base 10 / reporting 714 /
          catalog 769 / main 628 / types 1.180.
    - [x] **Última fatia (2026-06-18): Org × Evento separados.** `OrganizerOrganizationService`
          (organização, membros, auditoria, upload, acesso — 388 linhas; só apiClient +
          normalizadores, NÃO chama domínio Evento) extraído como mixin intermediário. Cadeia
          final: Base → Reporting → Catalog → **Organization** → OrganizerService(Evento).
          **Main 628 → 334.** Verificado via grep que nenhum método de Org chama método de
          Evento via `this.`. 406/406 testes, tsc 0 erros. **OrganizerService 100% dividido.**
          (Cadeia: base 10 / reporting 714 / catalog 769 / organization 388 / main 334 / types 1.180.)
          ⚠️ Smoke-test do painel ao vivo antes de prod (sem cobertura de runtime do serviço).
- [x] **`UserService.ts` (1.231 linhas) — SPLIT COMPLETO (2026-06-18).** Mesmo padrão
      do OrganizerService (cadeia de mixins + companion `.types.ts`), API `userService.x`
      100% preservada (zero call-site tocado; instância única em `services/index.ts`).
      Métodos auth/profile estavam INTERCALADOS → fatiamento método-a-método por range
      de linha (via node), não por bloco contíguo. Arquivos:
  - `UserService.types.ts` (122) — 8 interfaces (LoginResponse, RegisterRequest/Response,
    RefreshTokenResponse, BalanceTransaction, AuthError, DocumentAvailabilityResult, UserItem),
    re-exportadas por `UserService.ts` via `export *` (cobre os imports de `AuthError`/`LoginResponse`).
  - `UserServiceBase.ts` (113) — `protected apiClient` + 3 helpers de erro `protected`
    (mapAuthErrorMessageToPtBr/parseAuthErrorPayload/handleError), usados pelos dois domínios.
  - `AuthService.ts` (581) — 20 métodos de auth (login/MFA/Google, register, refresh/logout,
    reset/forgot, change email/senha, 2FA, availability, isAuthenticated/clearLocalSession).
  - `UserService.ts` (459) — 15 métodos de perfil/dados (profile, preview cupom/voucher,
    age-eligibility, tickets/pedidos, getUserByCpf/linkedUsers/createOrLink, avatar).
  - Cadeia: Base → Auth → User. 225/225 testes, tsc só com os 2 erros pré-existentes.
- [ ] **Tipos inline → `src/interfaces/`.** `payment.ts` novo; revisar overlap
      `interfaces/checkout.ts` vs `interfaces/order.ts`.

---

## 🔵 BLOCO 4 — Escalabilidade / arquitetura

- [ ] **Reduzir `"use client"` (297 ocorrências).** Marcar layouts/páginas como
      Server Components onde possível; `"use client"` só nos consumidores.
- [x] **`dynamic()` em libs pesadas — FEITO/MOOT (2026-06-20).**
  - chart.js: JÁ era dynamic (`RevenueChart.tsx` envolve `RevenueChartImpl` com `next/dynamic`).
  - react-pdf: `PdfViewer` agora carregado via `next/dynamic({ssr:false})` no `TermsOfServiceModal`
    (única importadora) — react-pdf/pdf.js só entra no bundle quando o modal de termos abre.
  - PaymentStep/InformationStep: **MOOT** — são páginas de rota próprias (`/checkout/informacoes`,
    `/checkout/pagamento`), já code-split por rota pelo Next. `dynamic()` neles seria redundante.
- [ ] **Virtualização** de tabelas grandes (registrations, `TicketsSection`)
      com `VirtualList`/react-window.
- [ ] **`ignoreBuildErrors: true`** (`next.config.ts:32`). **`tsc --noEmit` agora dá 0 erros**
      (2026-06-18 — corrigidos os 2 pré-existentes: `topicQuillResizeWithSideHandles.ts:122`
      handleDrag property→método na interface; `useLinkedUsers.ts:25` documentType `string`→
      `"CPF"|"PASSPORT"` no retorno de `getLinkedUsers`). Ainda há ~487 `any`/62 suppressions, mas
      esses NÃO são erros de tsc. Flipar p/ `false` agora é viável — confirmar com `next build`
      (pode pegar mais que `tsc --noEmit`) antes de remover; decisão do usuário (afeta deploy).
- [ ] **Padrão único de data fetching.** Factory de `useMutation` com optimistic
      (já existe `pending writes` em tickets/categorias; estender a coupons/vouchers).
      Avaliar bundles GET para fluxos críticos (checkout) e evitar waterfalls.
- [ ] **Estado global coerente.** Definir quando usar Context vs Zustand;
      considerar migrar `AuthProvider` (useAuth, 408 linhas) para store.
- [ ] **i18n.** Avaliar `next-intl` (rota `/[locale]`, hreflang p/ SEO, plurais).
      Registry de configs por país (`postalCode`/`documentDisplay`/`phone`).

---

## 🟢 BLOCO 5 — Testes (cobertura ~2/10)

> Estratégia antes de refatorar o checkout (decisão 2026-06-18): **testes de
> CARACTERIZAÇÃO** (golden master) da lógica pura ANTES de mexer nos
> arquivos-monstro, pra qualquer regressão aparecer vermelha. "checkout não pode
> ter problema."

- [x] **Caminho de pagamento — lógica pura COBERTA** (crítico): cupom, taxa, voucher,
      normalização da order, validação de cartão e formatação i18n. (2026-06-18; +176 testes,
      suíte 225 → 401)
  - [x] `orderCouponDiscount.test.ts` (52 testes): desconto cupom/voucher, FIXED em
        centavos, taxa sobre subtotal descontado, voucher=1 unidade de maior valor,
        normalização de `appliesTo`, condições mín., pricing com cupom/desconto.
  - [x] `ageCoupon.test.ts` (13): cupom automático de idade + limite de idade do ingresso.
  - [x] `orderAutoCouponDisplay.test.ts` (9): só QUANTITY escondido pré-pagamento; AGE/DISCOUNT revelados.
  - [x] `checkoutParticipants.test.ts` (18): payload PATCH participants/products (CPF×passaporte,
        gênero m/f/outro, respostas array→JSON, slice por reserva). Nota: `mapGender` ainda tem o
        ramo `PREFER_NOT_TO_SAY` mas é CÓDIGO MORTO — a UI hoje só oferece Masculino/Feminino/Outro.
  - [x] `checkoutProductStep.test.ts` (13): slots participante↔ingresso (ordem canônica) + auto-select.
  - [x] `cardValidation.test.ts` (14): Luhn, bandeira, validade (tempo fixo), máscara MM/AA, CVV.
  - [x] `orderResponseNormalizer.test.ts` (19): `toOrderResponse` EXTRAÍDO de
        `useCheckoutReservation.ts` p/ `src/lib/orderResponseNormalizer.ts` (lib pura, hook importa
        de lá). Trava roteamento cupom×voucher (exclusivos), fallbacks de pricing (centavos) e
        mapeamento de tickets. Achou 1 quirk (appliedDiscount 'voucher' sem objeto voucher seta os
        dois descontos) — travado como `[quirk]`.
  - [x] `documentDisplay.test.ts` (16): heurística canônica `isPersonBr` (ordem dos sinais),
        label/format de documento, telefone i18n.
  - [x] `postalCode.test.ts` (16): config CEP/ZIP/CAP por país (BR/US/AR/fallback), format/isValid/toBackend.
  - [x] `phone.test.ts` (16): ISO por nome PT-BR, máscara nacional + strip de DDI, dígitos p/ backend,
        validação por país, placeholder/maxLength.
- [x] **MSW (infra) — FEITO (2026-06-20).** `msw@2` instalado (devDep). `src/test/mswServer.ts`:
      `setupServer` compartilhado + helper opt-in `useMswServer()` (liga listen/reset/close por
      arquivo). **NÃO** está no setup global de propósito (`onUnhandledRequest:"error"`) — só os
      testes de integração ligam, mantendo os 436 testes existentes intactos. 443/443, tsc 0.
- [x] **`useCheckoutReservation` (integração) — FEITO (2026-06-20).** Caracterização da camada de
      rede do checkout: `src/hooks/__tests__/useCheckoutReservation.integration.test.ts` (7 testes) —
      reserve/get/pay/coupon/pix-status/cancel: wiring de fetch, header `Idempotency-Key`,
      normalização `id→orderId`, `OrderApiError` no erro, 404 do cancel tratado como sucesso.
- [x] **`AuthService` (integração) — FEITO (2026-06-20).** `src/services/user/__tests__/AuthService.integration.test.ts`
      (8 testes): login (shape aninhado/plano/MFA/endpoint organizer/erro-envelope), register
      (CPF strip vs PASSPORT cru, phone strip, retorno user+tokens, erro lança). Confirma que o MSW
      intercepta axios (ApiClient) além de fetch.
- [~] **3DS / `useThreeDS` (integração)** — DISPENSADO por ora (decisão do usuário 2026-06-20):
      orquestração do SDK Braspag (DOM/postMessage) exige mock pesado de `window`; ROI baixo.
- [ ] **Hooks core restantes:** caracterização a nível de componente dos steps conforme a Fase 2 exigir.
- [x] Sanitizer de conteúdo rico (`richContent.test.ts`).

---

### Notas de execução
- Datas absolutas (YYYY-MM-DD).
- Cada bloco pode virar uma branch/PR independente.
- Deploy acoplado pendente de sessão anterior: `maskedEmail` (auth) precisa subir
  backend+front juntos; separar commits do `server/` (auth ≠ estoque de variação).
