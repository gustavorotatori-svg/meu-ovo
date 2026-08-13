# Runbook de Lançamento — MEU OVO

> Operação, monitoramento e resposta a incidentes do webapp de pedidos.
> Prod: https://meu-ovo-pi.vercel.app • Repo: `MyEgg-main` (branch `master`)

## 1. Arqueitetura em 1 minuto

- **Frontend**: SPA React/Vite + PWA (push FCM). Hosteado na Vercel (deploy automático do GitHub, branch `master`).
- **Backend**: função serverless `api/index.js` (bundle ESM de `server/api.ts`). Se `server/api.ts` ou `server.ts` mudar, rodar `npm run build` e **commitar o `api/index.js` gerado** (ele é commitado; sem isso o deploy do GitHub fica sem API e `/api/*` cai no fallback SPA).
- **Dados**: Firestore (projeto `gen-lang-client-0267663159`, banco custom `ai-studio-83caa59a-5170-443b-82b8-5354c3a71e8b`). Envs da Vercel: `FIREBASE_SERVICE_ACCOUNT_KEY` (base64), `APP_URL`.
- **Ordem crítica**: nunca `firebase deploy --only firestore:rules` com rules fora de sincronia com o app → sempre usar `scripts/publish-canonical-rules.mjs` (publish das `firestore.rules` canônicas). Não commitar `firebase.json`/`firestore.json`.

## 2. Checklist de lançamento (fase final)

- [ ] `npm run typecheck` limpo
- [ ] `npm run build` OK
- [ ] `api/index.js` regenerado e commitado (se a API mudou)
- [ ] Suíte E2E verde (`npm run test:e2e` ou equivalente)
- [ ] Push para `master` → deploy Vercel concluído no dashboard
- [ ] `node scripts/smoke-prod.mjs` → `SMOKE TEST OK`

> **Como verificar que o deploy do GitHub aconteceu**: `npx vercel ls meu-ovo` — deve aparecer um deployment novo no topo com a idade próxima ao horário do push. Para confirmar que é do GitHub (e não CLI), `npx vercel api "/v13/deployments/<id>"` e checar `githubDeployment: "1"` e `lambdaRuntimeStats` com `nodejs:2` (API + sitemap). Deploys vindos do GitHub são automáticos ao dar push em `master`; `vercel --prod` é só fallback emergencial. Deployments raw (`https://<deploy>-...vercel.app`) e o branch alias são protegidos por SSO da Vercel — não use para smoke test; use o alias de produção real (`https://meu-ovo-pi.vercel.app`).
- [ ] Backup de segurança: `node scripts/firestore-backup.mjs`
- [ ] Domínio custom configurado (pendente): apontar DNS, adicionar domínio na Vercel, revalidar `APP_URL`/sitemap
- [ ] Conteúdo: pelo menos 1 restaurante real com catálogo completo, horário e endereço de entrega
- [ ] WhatsApp Business configurado para o número da loja (mensagens de status do pedido)
- [ ] LGPD: link de privacidade acessível no footer/checkout; opção de consentimento (já implementada via CookieConsent)

## 3. Operação diária

| Tarefa | Frequência | Comando |
|---|---|---|
| Verificar saúde | Diária | `node scripts/smoke-prod.mjs` |
| Backup Firestore | Diária (cron/Tarefa Agendada) | `node scripts/firestore-backup.mjs` |
| Ver erros em produção | Sob demanda | Sentry (`MEU OVO` projeto) — filtra por `environment: production` |
| Listar usuários | Sob demanda | `node scripts/list-users.mjs` |

## 4. Monitoramento

- **Sentry**: erros não capturados + API (Source maps habilitados). Critério de alerta: qualquer erro novo em `production` com 5+ ocorrências.
- **Vercel**: Logs de função (painel Vercel → Project → Logs). Resposta lenta (>1s p95) = revisar.
- **Firestore**: painel do Firebase → Firestore → Usage/Activity (queries indexadas, throttling). Se travar: conferir índices.

## 5. Rollback

1. **Vercel (rápido)**: Vercel → Project → Deployments → menu do deploy anterior → **Redeploy** (ou Promote). O servidor volta em ~1 min sem novo build.
2. **Git (se preciso reverter código)**: `git revert <sha>` (ou `git reset --hard <sha-bom>` + `git push --force-with-lease`), pushar → Vercel re-deploya.
3. **Rules/indexes**: se `firestore.rules` quebrar algo, voltar à versão publicada anterior com `scripts/publish-canonical-rules.mjs` (o arquivo `firestore.rules` no repo é o canônico).

## 6. Incidentes comuns

| Sintoma | Causa provável | Ação |
|---|---|---|
| `/api/*` retorna HTML (SPA) | `api/index.js` fora do commit / não deployado | Rodar `npm run build`, commitar `api/index.js`, pushar |
| `/api/health` → `{"firebase":false}` | env `FIREBASE_SERVICE_ACCOUNT_KEY` vazia/expirada | Recolocar env na Vercel e redeploy |
| Pedidos não chegam no admin | Regras do Firestore bloqueando / índice ausente | Conferir `firestore.rules` publicadas; logs do Sentry |
| Erros de permissão (permission-denied) | Rules desatualizadas | `scripts/publish-canonical-rules.mjs` (SEM `firebase deploy` manual) |
| Push/notificação não chega | VAPID / permissão no dispositivo / Service Worker | Reinstalar PWA; checar `showLocalNotification` nos logs |
| Banco parcialmente corrompido após teste manual | Operação manual | Restaurar backup: `collection(name).doc(id).set(data)` com firebase-admin |

## 7. Restauração de backup

```
node scripts/firestore-backup.mjs          # gera backups/<timestamp>/
# restaurar (um exemplo): ler backups/<ts>/orders.json e gravar cada doc:
#   db.collection('orders').doc(doc.id).set(doc.data)
```
**Cuidado**: restaurar SOBRESCREVE dados atuais. Sempre rodar `firestore-backup` antes de qualquer operação destrutiva.

## 8. Links úteis

- Dashboard Vercel: ver projeto `meu-ovo`
- Firebase Console: projeto `gen-lang-client-0267663159` (Firestore/Auth)
- Sentry: projeto `MEU OVO` (production)
