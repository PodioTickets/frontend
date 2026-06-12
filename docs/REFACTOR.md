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
  - [ ] (fase 2) scaffold comum `<EventPageShell headerComponent={…}>` p/ colapsar
        o corpo JSX duplicado que sobrou após extrair lógica/row.
- **Modais com boilerplate repetido (~1.100 linhas).**
  - [x] **Lista de CPF + import CSV** (CreateCoupon/CreateVoucherModal, ~200 linhas
        idênticas) → `src/lib/cpfList.ts` (puro: format/validate/parse CSV — 11 testes)
        + `src/hooks/useCpfList.ts` (estado + handlers). Modais: 1447→1359 e 938→845.
        157/157 testes, tsc limpo.
  - [ ] Estado `isSubmitting`/validação/erro repetido em 15+ modais → `useModalSubmitState()`.
  - [ ] Footer save/cancel repetido → `<ModalFooterActions>`.
- [ ] **Páginas de lista de evento (~250 linhas).** `formatCurrency`/`formatDate`
      duplicados em `admin/events/page.tsx` e `organizer/events/page.tsx`
      → `src/lib/eventListFormatters.ts`.
- [ ] **Validação de edição de evento (~120 linhas).** `validateForm` idêntico
      nas duas `events/[id]/edit/page.tsx` → `src/lib/eventEditValidation.ts`.
- [ ] **Formatação inline (~150 linhas).** Há `.replace(/\D/g,…)` e formatação de
      centavos reimplementados no checkout apesar dos utwils canônicos
      (`documentDisplay`, `phone`, `postalCode`, `datetimeBR`). Padronizar uso.
- [ ] **Bloco de descrição de kits** duplicado nas 4 preview pages de tópicos
      (já sanitizado, mas ainda copy-paste) → componente compartilhado.

---

## 🟡 BLOCO 3 — Separação de camadas / arquivos-monstro

> Padrão "bom" já existe no projeto: `SubscriptionStep` (`.tsx` + `.utils.ts` +
> `useSubscriptionData.ts`) e `TicketForm` (`.tsx` + `.types.ts` + `.utils.ts` +
> `.draft.ts` + subseções). Replicar esse padrão nos arquivos abaixo.

- [ ] **`PaymentStep.tsx` (2.926 linhas).** Extrair:
  - `usePaymentFlow` (estado de cartão/débito/PIX, parcelas, cupom, handlers).
  - `useBillingAddressForm` (validação por país, payload PATCH).
  - `src/lib/paymentValidation.ts` (consolidar com `utils/cardValidation.ts`).
  - Subcomponentes: `CreditCardForm`, `DebitCardForm`, `PixForm`, `PaymentMethodSelector`.
  - Tipos para `src/interfaces/payment.ts` (`PaymentMethod`, `CardErrors`, …).
- [ ] **`InformationStep.tsx` (2.878 linhas).** Extrair:
  - `useParticipantState` (snapshots, sessionStorage, expand/saved).
  - `useParticipantValidation` (CPF, telefone, data, perguntas condicionais).
  - `src/lib/participantSnapshot.ts` (build/read/apply).
  - Componente `ParticipantCard`.
- [ ] **`CreateProductModal.tsx` (2.343 linhas).** Extrair `useProductForm`,
      `src/lib/productValidation.ts`, `useProductImageUpload`, `<ProductVariations>`.
      Unificar tipo `ProductVariation` (hoje duplicado com `SubscriptionStep.utils.ts`).
- [ ] **`LoginModal.tsx` / `RegisterModal.tsx` (~1.600 cada).** Extrair
      `useLoginFlow`/`useRegisterFlow` e quebrar em painéis
      (`LoginPanel`, `ForgotPasswordPanel`, `ResetPasswordPanel`, `Register Step1/2/3`).
- [ ] **God object `OrganizerService.ts` (2.992 linhas).** Dividir por domínio:
      `EventService`, `TicketService`, `CouponService`, `VoucherService`,
      `ProductService`, `OrganizationService`, `AuditService`, `UploadService`.
- [ ] **`UserService.ts` (1.231 linhas).** Separar `AuthService` (login/MFA/reset)
      de `UserService` (profile).
- [ ] **Tipos inline → `src/interfaces/`.** `payment.ts` novo; revisar overlap
      `interfaces/checkout.ts` vs `interfaces/order.ts`.

---

## 🔵 BLOCO 4 — Escalabilidade / arquitetura

- [ ] **Reduzir `"use client"` (297 ocorrências).** Marcar layouts/páginas como
      Server Components onde possível; `"use client"` só nos consumidores.
- [ ] **`dynamic()` nos steps de checkout** (PaymentStep/InformationStep ~3k LOC
      cada) — ganho direto de TTI. Idem chart.js (`RevenueChartImpl`), react-pdf.
- [ ] **Virtualização** de tabelas grandes (registrations, `TicketsSection`)
      com `VirtualList`/react-window.
- [ ] **`ignoreBuildErrors: true`** (`next.config.ts:32`). NÃO remover ainda —
      há erros de tipo pré-existentes (487 `any`, 62 `@ts-ignore`/`eslint-disable`).
      Plano: 1) `tsc --noEmit` no CI como gate não-bloqueante; 2) zerar erros aos
      poucos; 3) então flipar para `false`.
- [ ] **Padrão único de data fetching.** Factory de `useMutation` com optimistic
      (já existe `pending writes` em tickets/categorias; estender a coupons/vouchers).
      Avaliar bundles GET para fluxos críticos (checkout) e evitar waterfalls.
- [ ] **Estado global coerente.** Definir quando usar Context vs Zustand;
      considerar migrar `AuthProvider` (useAuth, 408 linhas) para store.
- [ ] **i18n.** Avaliar `next-intl` (rota `/[locale]`, hreflang p/ SEO, plurais).
      Registry de configs por país (`postalCode`/`documentDisplay`/`phone`).

---

## 🟢 BLOCO 5 — Testes (cobertura ~2/10)

- [ ] **Caminho de pagamento** (crítico): cupom, taxa, voucher, 3DS, reserva.
- [ ] **Hooks core:** `useAuth`, `useCheckoutReservation`, `useThreeDS`.
- [ ] **MSW** para mock de API + testes de integração de React Query.
- [x] Sanitizer de conteúdo rico (`richContent.test.ts`).

---

### Notas de execução
- Datas absolutas (YYYY-MM-DD).
- Cada bloco pode virar uma branch/PR independente.
- Deploy acoplado pendente de sessão anterior: `maskedEmail` (auth) precisa subir
  backend+front juntos; separar commits do `server/` (auth ≠ estoque de variação).
