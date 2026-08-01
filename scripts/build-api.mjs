import { build } from 'esbuild';

await build({
  entryPoints: ['server/api.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  packages: 'external',
  outfile: 'api/index.js',
  banner: {
    js: `/* AUTO-GENERATED from server/api.ts - do not edit directly */`,
  },
});

console.log('[build-api] bundle gerado em api/index.js');
