# Auditoria Completa — MEU OVO

## Resumo Executivo

| Categoria | Score | Status |
|-----------|-------|--------|
| Segurança | 7.2/10 | ✅ 6 correções aplicadas |
| Funcionalidades (Etapa 1) | 7/10 | ✅ 6 correções aplicadas |
| Responsividade | 7/10 | ⚠️ OK, sem bloqueios |
| Legibilidade | 8/10 | ✅ OK |
| Jornadas | 6/10 | ⚠️ Gap de onboarding identificado |
| Acessibilidade | 5/10 | ❌ ARIA ausente, contraste |
| Performance | 6/10 | ⚠️ Chunks grandes, sem lazy |
| Retenção | 5/10 | ❌ Sem onboarding pós-cadastro |

---

## 1. Segurança (15/15 etapas)

**Score final: 7.2/10** (era 5.8)

### Correções aplicadas
- `firestore.rules`: leitura `users/{uid}` auto-protegida
- `firestore.rules`: `role`/`pwaInstallPending` permitidos no update
- `firestore.rules`: `newsletter_subscribers` adicionada (create público + read só admin)
- `api/index.ts`: CORS + rate limiting (30 req/min/IP)
- `server.ts`: rate limiting (30 req/min/IP)
- Todas as rotas `gemini` movidas para server-side

### Pendentes (manual)
- `firebase login` + `firebase deploy --only firestore:rules`
- Ativar Email/Senha + Google no Firebase Console
- Adicionar `meu-ovo-pi.vercel.app` em Authorized domains

---

## 2. Funcionalidades (Etapa 1)

**Score: 7/10**

### Problemas corrigidos (6)
| Arquivo | Problema | Correção |
|---------|----------|----------|
| `CheckoutPage.tsx` | Crash se `restaurant` for null | `<Navigate to="/carrinho">` guard |
| `CheckoutPage.tsx` | PIX key vazia renderizada | Only render when key exists |
| `Footer.tsx` | Social links com `href="#"` | Mudados para `<span>` inert |
| `AdminDashboard.tsx` | `await import('firebase/firestore')` | Substituído por `addDoc` estático |
| `MarketplacePage.tsx` | Fallback query unbounded | `limit(100)` adicionado |
| `MarketplacePage.tsx` | `showLoadMore` oculto com filtros | Removida condição `filtered.length >= PAGE_SIZE` |

### Problemas latentes (5)
| Arquivo | Problema | Severidade |
|---------|----------|------------|
| `CheckoutPage.tsx` | `selectedReward` nunca setado (feature gap) | Média |
| `LoginPage.tsx` | Email verification não cobrado | Média |
| `Navbar.tsx` | Mobile menu sem animação de saída | Baixa |
| `CustomerProfilePage.tsx` | `calculateLoyaltyLevel` hardcoded | Média |
| `WhatsApp` | Número não sanitizado | Baixa |

---

## 3. Responsividade (Etapa 2)

**Score: 7/10**

### Achados
- ✅ Tailwind responsive classes presentes em quase todos componentes
- ✅ Mobile-first via container queries e breakpoints (`sm:`, `md:`, `lg:`)
- ✅ Navbar colapsa corretamente em mobile
- ✅ Grid de restaurantes 1→2→3 colunas
- ⚠️ `CheckoutPage` com largura fixa em alguns elementos (`.max-w-4xl` pode quebrar em telas <360px)
- ⚠️ `AdminDashboard` gráficos não redimensionam em mobile (overflow horizontal)
- ⚠️ `MenuManagement` grid de produtos sem wrap em telas muito pequenas
- ⚠️ `StoreSettings` formulário largo sem scroll horizontal em 320px
- ❌ Nenhum teste de responsividade (cypress/playwright viewport)

---

## 4. Legibilidade (Etapa 3)

**Score: 8/10**

### Achados
- ✅ Contraste adequado na maioria dos componentes
- ✅ Tailwind typography scale consistente
- ✅ `font-sans` usado globalmente
- ⚠️ Textos de ajuda/carregamento em cinza claro podem falhar WCAG AA em fundo branco
- ⚠️ `text-xs` em badges de desconto pode ser pequeno demais (>65 chars)
- ⚠️ `LandingPage` tem blocos de texto densos sem quebras visuais

---

## 5. Jornadas (Etapa 4)

**Score: 6/10**

### Mapeamento de fluxos principais

**Jornada Cliente:**
1. Landing Page → Login/Cadastro → Marketplace → Seleciona restaurante → Menu → Carrinho → Checkout → Pagamento → Status do Pedido ✅
2. Landing Page → Busca → Marketplace (filtrado) → Restaurante → Menu → Checkout ✅

**Jornada Restaurante:**
1. Landing → Cadastro Restaurante → Onboarding → Dashboard → Menu Management → Receber pedidos ✅
2. Dashboard → Cashier (abrir/fechar) → KPIs → Gráficos ⚠️

**Gaps:**
- ❌ Sem onboarding tutorial pós-cadastro do cliente
- ❌ Sem tour guiado para restaurantes no primeiro login
- ❌ Checkout sem feedback de progresso visual (stepper)
- ❌ Sem recovery flow para expiração de sessão no meio do checkout
- ⚠️ AdminDashboard não explica significado dos KPIs para novos usuários

---

## 6. Acessibilidade (Etapa 5)

**Score: 5/10**

### Achados
- ❌ `aria-label` ausente na maioria dos botões de ação
- ❌ `role` e `aria-*` não usados em modais e menus
- ❌ Navegação por teclado não testável (sem focus indicators visíveis)
- ❌ Imagens de restaurante sem `alt` text descritivo
- ⚠️ `html2canvas` nos relatórios não acessível
- ✅ Formulários têm `label` para campos

---

## 7. Performance (Etapa 6)

**Score: 6/10**

### Métricas de build
| Chunk | Tamanho | Gzip |
|-------|---------|------|
| `firebase-BQv5Icij.js` | 581 kB | 133 kB |
| `AdminReports-Cf2oH-Pe.js` | 422 kB | 138 kB |
| `CartesianChart-7E5ch6Q2.js` | 349 kB | 104 kB |
| `sentry-ChgGNJIV.js` | 276 kB | 90 kB |
| `react-vendor-DHnWrbXr.js` | 233 kB | 74 kB |

### Problemas
- ❌ Firebase SDK chunk de 581 kB (sem code-split)
- ❌ Sentry + GraphQL charts em chunks grandes (poderiam ser lazy)
- ❌ Sem lazy loading de imagens explícito
- ❌ PWA precache de 84 entradas (3.8 MB) — pode ser reduzido
- ⚠️ Build leva 2min14s (devido a dependências pesadas)

---

## 8. Retenção (Etapa 7)

**Score: 5/10**

### Achados
- ✅ Notificações push (FCM) configuradas
- ✅ Loyalty program com níveis e pontos
- ⚠️ Reward selection não implementada (`setSelectedReward` nunca chamado)
- ❌ Sem email marketing automation (newsletter existe mas sem trigger pós-cadastro)
- ❌ Sem re-engagement nudges (usuário inativo >7 dias)
- ❌ Sem gamificação além dos Ovos de Ouro

---

## 9. Correções Aplicadas (Resumo)

### Arquivos modificados (6)
| Arquivo | Linhas | O que foi feito |
|---------|--------|-----------------|
| `firestore.rules` | 1-32 | Regras de segurança atualizadas |
| `server.ts` | ~145-155 | Rate limiting adicionado |
| `api/index.ts` | ~40-55 | CORS + rate limiting adicionados |
| `src/pages/CheckoutPage.tsx` | ~8, ~680 | Guard null restaurant + PIX validation |
| `src/components/Footer.tsx` | ~95-102 | Social links para span |
| `src/pages/admin/AdminDashboard.tsx` | ~17, ~380 | Dynamic import → static addDoc |
| `src/pages/MarketplacePage.tsx` | ~152, ~311 | Fallback limit + showLoadMore fix |

---

## 10. Recomendações Imediatas

1. **Firebase Console** (urgente):
   - `firebase login`
   - Ativar Email/Senha + Google
   - Adicionar domínio `meu-ovo-pi.vercel.app`
   - `firebase deploy --only firestore:rules`

2. **Credenciais restantes** (média):
   - `VITE_SENTRY_DSN`
   - `GEMINI_API_KEY`
   - `VITE_PLATFORM_PIX_KEY`

3. **Acessibilidade** (média):
   - Adicionar `aria-label` nos botões de ação
   - Adicionar `role="dialog"` + `aria-modal` nos modais
   - Adicionar `alt` descritivo nas imagens

4. **Retenção** (média):
   - Implementar reward selection (`setSelectedReward`)
   - Adicionar onboarding tutorial pós-cadastro do cliente
   - Adicionar tour guiado para restaurantes

5. **Performance** (baixa):
   - Code-split Firebase SDK (separar auth/firestore do resto)
   - Lazy load imagens com `loading="lazy"`

---

*Relatório gerado em 27/06/2026 — Próxima auditoria recomendada: pós-implementação das recomendações.*
