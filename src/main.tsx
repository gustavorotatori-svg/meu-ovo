import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './lib/i18n';
import { initSentry } from './lib/sentry';
import { initAnalytics, setupAnalyticsConsentListener } from './lib/analytics';

import { HelmetProvider } from 'react-helmet-async';

initSentry();
setupAnalyticsConsentListener();
initAnalytics();

window.addEventListener('error', (event) => {
  console.error('[Global] Uncaught error:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global] Unhandled promise rejection:', event.reason);
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then(() => console.log('[FCM SW] Registered'))
    .catch(() => {});
}

if (import.meta.env.DEV) {
  const requiredClientVars = [
    'VITE_PLATFORM_PIX_KEY',
    'VITE_SENTRY_DSN',
    'VITE_GA_ID',
    'VITE_FB_PIXEL_ID',
  ] as const;
  const missing = requiredClientVars.filter(v => !import.meta.env[v]);
  if (missing.length > 0) {
    console.warn('[ENV] Variáveis de ambiente faltando:', missing.join(', '));
    console.warn('[ENV] Copie .env.example para .env e preencha os valores.');
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
);
