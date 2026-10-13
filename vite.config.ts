import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { siteMetadata } from './scripts/siteMetadata'
import { buildPrivacyCsp } from './src/lib/privacy'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    siteMetadata(),
    VitePWA({
      // External registration respects the CSP; waiting updates preserve active readings.
      injectRegister: 'script',
      manifest: {
        name: '浮世塔罗',
        short_name: '浮世塔罗',
        lang: 'zh-CN',
        start_url: './',
        scope: './',
        display: 'standalone',
        theme_color: '#09131b',
        background_color: '#09131b',
        icons: [192, 512].map((size) => ({
          src: `icon-${size}.png`, sizes: `${size}x${size}`, type: 'image/png',
        })),
      },
      workbox: {
        // Cache the app shell, not all 78 artworks. Viewed images remain available offline.
        globPatterns: ['**/*.{js,css,html}', 'icon-*.png', 'favicon.svg'],
        runtimeCaching: [{
          urlPattern: /\/cards\/rws\/[^/]+\.(?:avif|webp|jpg)$/,
          handler: 'CacheFirst',
          options: { cacheName: 'tarot-artwork', expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 } },
        }],
      },
    }),
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
