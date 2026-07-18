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
