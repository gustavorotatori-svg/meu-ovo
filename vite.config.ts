import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

import { sentryVitePlugin } from '@sentry/vite-plugin';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const base = env.DEPLOY_TARGET === 'gh-pages' ? '/meu-ovo/' : '/';
  const plugins = [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg'],
      manifest: {
        name: 'Meu Ovo',
        short_name: 'Meu Ovo',
        description: 'Peça comida de verdade direto dos melhores restaurantes locais.',
        theme_color: '#111111',
        background_color: '#111111',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'pt-BR',
        icons: [
          {
            src: 'pwa-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'pwa-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ];

  if (env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT) {
    plugins.push(
      sentryVitePlugin({
        org: env.SENTRY_ORG,
        project: env.SENTRY_PROJECT,
        authToken: env.SENTRY_AUTH_TOKEN,
        telemetry: false,
      })
    );
  }

  return {
    base,
    plugins,
    define: {},
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/lucide-react')) return 'lucide';
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) return 'motion';
            if (id.includes('node_modules/firebase/auth')) return 'firebase-auth';
            if (id.includes('node_modules/firebase/firestore')) return 'firebase-firestore';
            if (id.includes('node_modules/firebase/messaging')) return 'firebase-messaging';
            if (id.includes('node_modules/firebase/storage')) return 'firebase-storage';
            if (id.includes('node_modules/firebase/app')) return 'firebase-app';
            if (id.includes('node_modules/firebase')) return 'firebase-other';
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react-vendor';
            if (id.includes('node_modules/react-router')) return 'react-vendor';
            if (id.includes('node_modules/@sentry')) return 'sentry';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
