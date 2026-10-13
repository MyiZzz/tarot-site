import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { buildPrivacyCsp } from './src/lib/privacy'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'privacy-csp',
      apply: 'build',
      transformIndexHtml() {
        return [
          {
            tag: 'meta',
            attrs: {
              'http-equiv': 'Content-Security-Policy',
              content: buildPrivacyCsp(),
            },
            injectTo: 'head',
          },
          {
            tag: 'meta',
            attrs: {
              name: 'referrer',
              content: 'no-referrer',
            },
            injectTo: 'head',
          },
        ]
      },
    },
  ],
  build: {
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) {
            return 'react-vendor'
          }
        },
      },
    },
  },
  test: {
    // Bound jsdom CPU/memory pressure on shared CI runners.
    maxWorkers: 2,
    include: ['src/test/**/*.{test,spec}.{ts,tsx}', 'src/test/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**'],
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    reporters: process.env.CI ? ['verbose', 'junit'] : ['default'],
    outputFile: { junit: 'test-results/vitest/junit.xml' },
  },
})
