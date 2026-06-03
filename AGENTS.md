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
