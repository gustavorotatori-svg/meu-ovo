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
