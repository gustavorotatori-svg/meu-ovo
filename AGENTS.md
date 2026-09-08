# AGENTS.md — Sessão completa (02/06/2026)

## Versão correta do AI Studio aplicada
Substituída versão antiga pela versão completa do AI Studio (com OVOS DE OURO, marketplace, plataforma admin, etc.).

## Build
- `npx tsc --noEmit` — 0 erros
- `npm run build` — sucesso
- `npm run dev` — servidor inicia em localhost:3000

## Dependência adicionada
- `jspdf` — necessário para AdminReports (exportar relatórios PDF)

## 15+ bugs corrigidos

### CRÍTICO (crash)
1. **CheckoutPage:153** — `restaurant.id` em deps crashava quando restaurante `undefined` → `restaurant?.id`
2. **CheckoutPage:155-158** — `navigate('/carrinho')` no render (antes do useEffect causava redirect loop) → movido para `useEffect`
3. **CartContext:64** — `item.selectedAdditionals.reduce()` crashava se null → `|| []`
4. **CheckoutPage:399** — `restaurant.whatsapp.replace()` crashava se null → `|| ''` + guard antes de abrir

### ALTO (NaN / unhandled rejection / perda silenciosa)
5. **RestaurantContext:239** — `ownerId: 'anonymous'` criava restaurante órfão → agora valida `auth.currentUser?.uid` com toast
6. **RestaurantContext:266-268** — `category` (inexistente) → `categoryId`, `active: true` → `isActive: true`, `inStock: true` → `isAvailable: true` (produtos invisíveis no cardápio)
7. **RestaurantContext:252** — `active: true` removido de categorias
8. **firebase.ts:56** — `handleFirestoreError` lançava throw causando unhandled rejections → agora só loga + toast
9. **CheckoutPage:236** — `deliverySettings.fixedFee` (inexistente) → `deliverySettings.fee ?? 0`
10. **CheckoutPage:185-197** — cupons expirados não limpavam `appliedCoupon` → `setAppliedCoupon(null)` antes de cada return
11. **RestaurantMenuPage:712** — WhatsApp crash → guard `{restaurant.whatsapp && ...}`
12. **RestaurantMenuPage:1362** — `(group.items || group.options).map()` crash se ambos undefined → `|| []`

### MÉDIO
13. **CheckoutPage:495** — `clipboard.writeText` sem `.catch()` → `.catch(() => {})`
14. **RestaurantOnboarding:85-97** — field names errados (`cover`, `cuisine`, minOrder, deliveryTime) → corrigidos para `coverImage`, `cuisineType`, `minimumOrder`, `estimatedTime`, adicionados `deliverySettings`, `orderSettings`, `loyaltySettings`, `email`, `city`, `description`

### 3 bugs corrigidos (10/06/2026) — Diagnóstico `/busca` em branco
15. **OptimizedImage.tsx:30-48** — `new URL(src)` crashava se `src` inválido/undefined → adicionado `if (!src) return` + try/catch + fallback
16. **ErrorBoundary.tsx** — usava `this as unknown as { props; state }` hack desnecessário → simplificado para `this.props`/`this.state` direto, adicionado `handleReload` e ícone 🍳
17. **main.tsx** — adicionados `window.addEventListener('error')` e `unhandledrejection` globais para capturar erros que escapam do React (effects em produção)
18. **PageTransition.tsx** — flame overlay não tinha fallback se animação falhasse (poderia cobrir tela em mobile) → adicionado `showFlame` state + `setTimeout(1500)` para remover overlay do DOM independente da animação

## Configurações aplicadas

### `.env` criado
- `GEMINI_API_KEY=""` — usuário precisa preencher com chave do Google AI Studio
- `APP_URL="http://localhost:3000"`
- `MERCADO_PAGO_ACCESS_TOKEN=""` — (legado) não usado na arquitetura atual

### `awardLoyaltyPoints` — JÁ ATIVO
Chamado em `AdminOrders.tsx:268` quando admin aceita o pedido. Nenhuma ação necessária.

### Firestore rules — JÁ ABRANGENTES
`firestore.rules` já contém regras completas para:
- Restaurants (CRUD por owner)
- Categories/Products (CRUD por owner do restaurante)
- Orders (create público, update por owner ou próprio usuário)
- Coupons (validações de tipo, valor, incremento de usageCount)
- Users (próprio perfil)
- Tables

## Arquitetura de doações
Nesta versão, a doação é incluída no **total do pedido** (não via Mercado Pago separado). O restaurante recebe o valor e o admin da plataforma faz o recolhimento mensal. `MERCADO_PAGO_ACCESS_TOKEN` não é usado.

## Para testar a jornada completa
1. `npm run dev`
2. Navegar para `http://localhost:3000`
3. `/cadastro-restaurante` — completar onboarding
4. Ver cardápio em `/r/[slug]`
5. Adicionar itens ao carrinho, ir para checkout
6. Fechar pedido (PIX do restaurante + WhatsApp)

---

## Sessão (12/07/2026) — Componentes compartilhados + auditoria completa de cadastro/onboarding

### Componentes criados
- `src/components/BackButton.tsx` — Botão de voltar estilizado
- `src/components/Badge.tsx` — 6 variantes (direto, aberto, fechado, promo, novo, eco) × 2 tamanhos
- `src/components/SectionHeader.tsx` — subtitle + title + description + align
- `src/components/EmptyState.tsx` — icon + title + subtitle + action
- `src/components/ErrorBoundary.tsx` — Reload button + erro catch global

### Refatorações
- **MarketplacePage.tsx**: 3 SectionHeaders substituídos; badges inline → `<Badge>`
- **RestaurantMenuPage.tsx**: badges inline → `<Badge>`; `isOpen` guard no `onAdd` (bloqueia pedido se fechado)
- **CustomerProfilePage.tsx**: Empty states → `<EmptyState>`
- **LoginPage.tsx**: `BackButton` aplicado; Google sign-in redirect fix
- **InstallAppPage.tsx**: `BackButton` aplicado
- **StoreSettings.tsx**: `isOpen` toggle adicionado no formData, UI e save handler

### Correções de bug (cadastro/onboarding)
- **AdminAuth.tsx**: Validação de senha/email adicionada; Ovos de Ouro box oculto no login; criação prematura de restaurant doc removida
- **AuthContext.tsx**: `signUp` agora define role='customer' para signups de restaurante — upgrade acontece em `registerRestaurant` após onboarding
- **LoginPage.tsx**: Google Sign-In agora redireciona (`handleGoogleSignIn` com `useCallback`); email.trim() na autenticação; import de `useCallback` adicionado
- **RestaurantOnboarding.tsx**: Guard corrigido — permite 'customer' (pós-signup aguardando onboarding) e 'admin'
- **RestaurantContext.tsx**: `registerRestaurant` verifica slug collision com `getDoc`; `getDoc` adicionado aos imports

### Auditoria de fluxos (FASE 1-15 concluída)

| Fase | Resultado |
|------|-----------|
| 1-2 | Matriz de fluxos + blueprint de correções |
| 3 | Customer signup OK — Google redirect bug corrigido |
| 4 | Restaurant signup OK — bugs críticos corrigidos anteriormente |
| 5 | Validação OK (vazios, duplicatas, senha fraca, múltiplos cliques) |
| 6-8 | Email verification, login, password recovery OK |
| 9-10 | Onboarding + first access OK |
| 11-12 | ProtectedRoute + role isolation OK (3 roles: customer, restaurant, admin) |
| 15 | Build 0 erros + deploy Vercel OK (meu-ovo-pi.vercel.app) |

### Build
- `npx tsc --noEmit` — 0 erros
- `npm run build` — módulos transformados, 0 erros

---

## Sessão (13/07/2026) — Tema auto (time-based) + BackButton em todas as telas

### ThemeContext: modo auto (time-based)
- Padrão alterado de `prefers-color-scheme` para **horário do dia** (light 6h-18h, dark 18h-6h)
- `preference` = `'auto'` | `'light'` | `'dark'` (salvo no localStorage)
- `theme` = valor resolvido (quando auto, computado; quando manual, a escolha)
- Atualiza a cada 60s via `setInterval`
- Admin/platform continuam forçando dark
- Navbar toggle agora cicla: auto → light → dark → auto (3 estados)
- Ícones: Monitor (auto), Sun (dark → light), Moon (light → dark)

### BackButton adicionado em 19 páginas
**Públicas**: MarketplacePage, SocialImpactPage, ForRestaurantsPage, OvosDeOuroInfoPage, BlogPage, CustomerProfilePage, RestaurantOnboarding

**Admin standalone**: MenuManagement, KitchenMode, CouponManagement, FlashDealManagement

**Plataforma**: PlatformDashboard, PlatformRestaurants, PlatformCustomers, PlatformIntelligence, PlatformMarketReports, PlatformPartners, PlatformDonations, PlatformOvosDeOuro

### Build
- `npx tsc --noEmit` — 0 erros
- `npm run build` — sucesso completo

---

## Sessão (30/07/2026) — Auditoria operacional completa + 15 correções

### Auditoria: 24 issues encontradas (4 BLOCKER, 4 CRITICAL, 6 HIGH, 7 MEDIUM, 3 LOW)

### BLOCKER corrigidos
1. **AuthContext.tsx**: `signIn` agora chama `refreshUserProfile()` para sincronizar role do Firestore
2. **LandingPage.tsx**: Redireciona usuários logados por role (restaurant → /admin, admin → /plataforma, customer → /busca)
3. **RestaurantOnboarding.tsx**: Valida que produtos tenham categoria antes de submit
4. **RestaurantContext.tsx + RestaurantOnboarding.tsx**: `registerRestaurant` retorna o slug final (com sufixo se houve colisão); step 2 do onboarding usa `finalSlug` em vez de recalcular

### CRITICAL corrigidos
5. **AuthContext.tsx + LoginPage.tsx**: `signIn` bloqueia se `!emailVerified`; LoginPage exibe toast e reenvia email de verificação automaticamente
6. **RestaurantOnboarding.tsx**: AI endpoint retorna erro 404 com mensagem clara de configuração pendente
7. **SelfSignupPage.tsx**: Guard redireciona se `auth.currentUser` existir

### HIGH corrigidos
8. **AdminDashboard.tsx**: Status `accepted` adicionado ao filtro `inProgress`
9. **MenuManagement.tsx**: Criação de produto refatorada para `setDoc` atômico (remove `addDoc`+`updateDoc` non-atomic)
10. **RestaurantOnboarding.tsx**: Progresso do onboarding expira após 24h no localStorage

### MEDIUM corrigidos
11. **LandingPage.tsx**: 4º stat item adicionado ("100% dos pedidos direto no zap")
12. **LoginPage.tsx**: BackButton usa `navigate(-1)` em vez de `to="/"`
13. **MenuManagement.tsx**: `onSnapshot` de categorias compara por Set de IDs (ignora ordem), evitando sobrescrever reordenação

### LOW corrigidos
14. **LandingPage.tsx**: Contagem de restaurantes filtra `isActive == true`
15. **AdminDashboard.tsx**: Near expiry mostra apenas produtos com ≤7 dias de validade

### Build
- `npx tsc --noEmit` — 0 erros
- `npm run build` — 0 erros

---

## Sessão (01/08/2026) — Deploy Vercel: fix serverless ESM + correções finais

### CRÍTICO: API quebrada em produção (FUNCTION_INVOCATION_FAILED)
- **Causa**: `api/index.ts` importava `../src/lib/whatsappWebhook` sem extensão — o runtime ESM serverless da Vercel não resolve imports relativos extensionless (`ERR_MODULE_NOT_FOUND`)
- **Solução**:
  - Fonte movida `api/index.ts` → `server/api.ts`
  - Novo `scripts/build-api.mjs`: bundle auto-contido com esbuild (`--bundle --format=esm --packages=external`) → `api/index.js`
  - `vercel.json` buildCommand: `vite build && node scripts/build-api.mjs`
  - `package.json` build inclui `node scripts/build-api.mjs`
  - `api/index.js` adicionado ao `.gitignore` (gerado no build)
  - Extensões `.ts` adicionadas aos imports em `server/api.ts` e `src/lib/whatsappWebhook.ts` (permite tsc + esbuild)
- **Resultado**: `/api/health` 200 ✅, `/api/ai/generate-menu` 200 com dados reais do Gemini ✅, rotas SPA 200 ✅, sitemap 200 ✅

### Fix C8 — deliverySettings default doc
- **RestaurantContext.tsx**: quando `onSnapshot` não encontra o doc `deliverySettings`, agora cria o doc default (com campos corretos da interface `DeliverySettings`: `restaurantId`, `enabled`, `radiusKm`, `fee`, `estimatedTime`, `minimumOrder`, `observation`, `feeByNeighborhood`)

### Fix L20 — máscara CNPJ/CPF no onboarding
- **RestaurantOnboarding.tsx**: `maskCnpjCpf` adicionada (CPF `000.000.000-00` ou CNPJ `00.000.000/0000-00`, máx 14 dígitos, input `maxLength=18`)

### Arquitetura da API (importante)
- `server.ts` — servidor Express completo (dev local com Vite middleware, prod serve dist/)
- `server/api.ts` — fonte da API serverless (Vercel), bundlada para `api/index.js`
- `api/sitemap.xml.ts` — função serverless independente

### Build
- `npx tsc --noEmit` — 0 erros
- `npm run build` — 0 erros
- `vercel --prod` — READY, alias em https://meu-ovo-pi.vercel.app

---

## Sessão (11/08/2026) — Deploy GitHub: api/index.js commitado

### CRÍTICO: `/api/*` caiu no fallback SPA após push pelo GitHub
- **Causa**: `api/index.js` era gitignored e gerado no build (`scripts/build-api.mjs`). Deploys via CLI (`vercel --prod`) subiam o arquivo local → função `api/index` deployada. Deploys via **GitHub integration** usam checkout limpo do repo → arquivo ausente na detecção de funções → só `api/sitemap.xml` era deployada → rewrite `/api/(.*)` → `/api/index` caía no SPA fallback.
- **Solução**: `api/index.js` removido do `.gitignore` e **commitado** (bundle ESM ~30KB gerado por `scripts/build-api.mjs`). GitHub build agora detecta e deploya a função.
- **Workflow obrigatório**: toda mudança em `server/api.ts`/`server.ts` deve rodar `npm run build` (regenera `api/index.js`) e commitar o bundle junto. Não editar `api/index.js` à mão.
- **Verificação**: deploy → `https://meu-ovo-pi.vercel.app/api/health` 200 JSON, `/api/account/export` 401 sem token, sitemap OK.
- **Integração GitHub→Vercel CONFIRMADA FUNCIONANDO** (12/08/2026, commit `036fb57`): todo push em `master` gera deploy automático de produção via GitHub (`githubDeployment: "1"`, READY/PROMOTED, inclui as 2 lambdas API+sitemap). Para conferir: `npx vercel ls meu-ovo` e, se preciso, `npx vercel api "/v13/deployments/<id>"`. `vercel --prod` é apenas fallback. CUIDADO: não confundir idade relativa do `vercel ls` com hora do push — checar a data do commit (`git log -1`) antes de concluir que "não deployou". Deployments raw e branch alias são protegidos por SSO (login Vercel) — smoke test sempre em `https://meu-ovo-pi.vercel.app`.

---

## Sessão (09/09/2026) — Header mobile profissional + E2E cadastro/checkout em produção

### Commits
- `160117a` — header: botões de ícone unificados, hambúrguer 36px, overflow-x-clip na raiz, cards escuros no landing.
- `476e504` — truthfulness (página única de pedidos, sem "histórico" ficcionar).
- `19923ea` — UX pós-login (redireciona para próximo passo após login).
- `a232caa` — 4 arquivos: `LanguageSwitcher` (dropdown custom: globo+bandeira, chevron, role=listbox, fecha ao clicar fora), `Navbar` (botões `w-9 h-9 sm:w-auto sm:h-auto`), `CheckoutPage` (botão "Acompanhar pedido" só com `user.id`), `OrderStatusPage` (fallback "Pedido não encontrado" em vez de skeleton infinito — erro no onSnapshot).
- `64052a4` — **fix reload `/checkout`**: `RestaurantContext` ganhou flag `restaurantsLoaded` (setado no `onSnapshot` `next`/error). Guard e `<Navigate>` do CheckoutPage agora esperam a descoberta real dos restaurantes em vez de confiar em `restaurants.length` (que inicia em `mockRestaurants` e sempre tinha length>0 → kick para `/carrinho` em reload direto).
- `92c8456` — **fix nome no perfil**: `refreshUserProfile` ignora o `displayName` do Firebase; agora `displayName: data?.displayName || data?.full_name || auth.currentUser?.displayName`. Email-signup via `updateProfile` preenche displayName, mas o refresh sobrescrevia com undefined → "Gourmet Explorer".

### Verificação ao vivo (Playwright, prod `https://meu-ovo-pi.vercel.app`)
- Header: bloco direito 156px (era 200px), 4 botões de 36px, `docOverflowX=0` em 320/360/390/430 e 640/768/1024/1440.
- Dropdown de idioma abre e troca pt→es→pt.
- Reload em `/checkout` **mantém na página** (corrigido por `64052a4`).
- Jornada cliente E2E completa: landing → /busca → cardápio → modal → Adicionar à Sacola → /carrinho → /checkout → pedido criado → popup WhatsApp. (pedido teste `#ORDMTRZOCEGZZ1HZK`)
- Cadastro E2E: toast "Conta criada!", redireciona a `/install-app?next=/busca`, avatar no header do `/busca`, `/perfil` protegido renderiza nome do cliente, login com email não verificado bloqueado com mensagem.
- Login/cadastro sem verificação de email não acessa áreas do cliente (regra Firestore: orders get/list só owner/admin ou userId malhado).
- 0 erros de JS em todos os fluxos.

### Ambiente de teste
- Contas de teste prod: `e2e.audit.<timestamp>@mailinator.com` / `Audit#2026x` (aceitável — Firestore é dev deste projeto).
- Probes E2E ad-hoc vivem em `C:\Users\rotat\AppData\Local\Temp\opencode\` (`postdeploy-check.mjs`, `signup-deep-check.mjs`, `signup-final-check.mjs`, etc.) — **nunca commitar**.

### Pendente (débito consciente)
- i18n parcial: textos de client flow ainda em português após trocar idioma.
- Concluir verificação manual nos demais fluxos (admin, onboarding restaurante) pós-refactor do header; nenhum erro conhecido.

---

## Sessão (08/09/2026) — i18n completo do client flow (pt/en/es) + moeda locale-aware + fix de corrupção de encoding

### Commits
- `22730de` — Fases A+B do i18n: `RestaurantMenuPage` (menuPage), `CartPage` (cart), `CheckoutPage` (checkout, incluindo builder da mensagem WhatsApp com `checkout.wa*`, toasts de cupom/reputação/validação, fidelidade/caixinha/gorjeta, totais, placeholder/troco, PIX não configurado, pay*). Adicionadas ~120 chaves novas por idioma em `src/lib/i18n.ts`; `formatCurrency` com `currencyLocale(lang)` (pt→pt-BR, en→en-US, es→es-ES) e datas com `toLocaleString`.
- `09a36ff` — **fix encoding + cookie consent + narrowSymbol**:
  1. i18n.ts foi corrompido por `Set-Content -Encoding UTF8` (PowerShell) durante um fix do "Vale-Reembolso" → todo não-ASCII virou mojibake (cp1252) e o arquivo corrompido foi commitado/deployado em `22730de`. Restauração byte-a-byte via `git show HEAD:src/lib/i18n.ts` + reverse cp1252 (não latin1 — latin1 é lossy para emojis/bytes 0x80-0x9F). **Lição: nunca editar i18n.ts via PowerShell/Sed; usar sempre as tools de edição.**
  2. `src/components/CookieConsent.tsx` traduzido para `t('cookie.*')` + chaves `cookie` adicionadas em pt/en/es (antes era 100% PT em qualquer idioma e bloqueava cliques/asserts nos probes — overlay).
  3. `formatCurrency` agora usa `currencyDisplay: 'narrowSymbol'` — sem isso es mostrava "29,90 BRL"; com narrowSymbol es mostra "29,90 R$", pt "R$ 29,90", en "R$29.90".

### Verificação ao vivo (Playwright, prod)
- ES completo: cookie consent em es ✓; cardápio es (Añadir a la Cesta, PEDIDOS SIN INTERMEDIARIOS, 100% DIRECTO, ESTAMOS ABIERTOS) ✓; carrinho es ✓; checkout es (Finalizar pedido, CHECKOUT EXPRESS, Tus datos, NOMBRE COMPLETO, ENTREGA/RECOGIDA/LOCAL, DIRECCIÓN COMPLETA, Forma de pago PIX/EFECTIVO/TARJETA, RESUMEN DEL PEDIDO, ¡Ahorraste X R$!, PROPINA, HUCHA MEU OVO, CAUSA SOCIAL, SUBTOTAL, TARIFA DE ENTREGA, TOTAL FINAL, IMPORTANTE, Enviar por WhatsApp) ✓; placeholder "Ej:" ✓; moeda `29,90 R$` com vírgula ✓; sem mojibake (0 U+FFFD) ✓; sem resíduo PT ("Valor Final"/"Gorjeta do entregador"/"Precisa de troco?") ✓.
- PT regressão: landing/cardápio/checkout pt intactos (100% DIRETO, SEM COMISSÃO PARA O APP, DÚVIDAS? CHAME NO ZAP, Valor Final, Gorjeta do entregador) ✓.
- EN: no commission, DIRECT, ADD, Delivery Fee, moeda R$ ✓ (en usa "Total"/"Send to WhatsApp").
- 0 erros de JS durante os fluxos.

### Observações / armadilhas dos probes
- Em es/espanhol o símbolo monetário es-ES sai DEPOIS no narrowSymbol: `29,90 R$` (não é bug).
- Os asserts de checkout es precisam de case-insensitive (o texto é UPPERCASE: "CHECKOUT EXPRESS", "RESUMEN DEL PEDIDO", "TOTAL FINAL").
- Placeholders (`placeholder` attr) não aparecem em `innerText` — checar via `document.querySelectorAll('input').placeholder`.
- Quick-add do card (botão "+" / preço/"Añadir a la Cesta"/"ADD"/"ADICIONAR") adiciona direto ao carrinho sem abrir modal; o login de abrir modal depende de clicar no card, não no botão quick-add.
- i18n.ts é CRLF — scans com `[\\uFFFD\\u0000-\\u001F]` marcam todas as linhas por causa do `\r` (ruído); validar com `node -e` por substrings.

### Pendente (débito consciente)
- Fase C i18n: `OrderStatusPage` + `InstallAppPage` (0 `t()` hoje).
- Fase D i18n: `LoginPage` + `MarketplacePage`/`Home`.
- Milestone/achievement toasts têm wrapper i18n, mas `label`/`description` vêm das libs de dados (ainda em pt nos dados do restaurante de teste).
