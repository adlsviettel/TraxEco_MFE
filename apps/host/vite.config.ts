import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import legacy from '@vitejs/plugin-legacy'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../../'))
  return {
    envDir: path.resolve(__dirname, '../../'),
    resolve: {
      alias: {
        '@traxeco/shared': path.resolve(__dirname, '../../packages/shared/src'),
        '@traxeco/clinic': path.resolve(__dirname, '../../packages/clinic/src'),
        '@traxeco/fgs-wh': path.resolve(__dirname, '../../packages/fgs-wh/src'),
        '@traxeco/fabric-wh': path.resolve(__dirname, '../../packages/fabric-wh/src'),
        '@traxeco/it-inventory': path.resolve(__dirname, '../../packages/it-inventory/src'),
        '@traxeco/accessory-wh': path.resolve(__dirname, '../../packages/accessory-wh/src'),
        '@traxeco/f2s-delivery': path.resolve(__dirname, '../../packages/f2s-delivery/src'),
        '@traxeco/tcc-template': path.resolve(__dirname, '../../packages/tcc-template/src'),
        '@traxeco/qcfb-wh': path.resolve(__dirname, '../../packages/qcfb-wh/src'),
        '@traxeco/rd-material': path.resolve(__dirname, '../../packages/rd-material/src'),
      }
    },
    base: env.VITE_BASE_PATH || '/',
    plugins: [
      react(), 
      legacy({
        targets: ['Android >= 4.4', 'Chrome >= 39', 'Safari >= 10', 'iOS >= 10'],
        additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
        renderLegacyChunks: true,
      }),
      {
        name: 'remove-crossorigin-from-nomodule',
        enforce: 'post',
        transformIndexHtml(html) {
          return html.replace(/<script nomodule crossorigin/g, '<script nomodule');
        }
      },
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        workbox: {
          maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50MB
          // ── Force ngay lập tức lấy bản mới, không chờ tab cũ đóng ──
          skipWaiting: true,
          clientsClaim: true,
          // Không cache file .html → luôn lấy từ server
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api/],
        },
        devOptions: {
          enabled: false,
          type: 'module',
        },
        manifest: {
          name: 'Trax Eco System',
          short_name: 'TraxEco',
          description: 'Hệ thống Quản lý xưởng dệt TraxEco',
          theme_color: '#2e7d32',
          background_color: '#f8fafc',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: '/logo.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/logo.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    build: {
      target: 'es2015',
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
    },
    server: {
      host: '0.0.0.0',
      proxy: {
        '/api-insw': {
          target: 'https://api.insw.go.id',
          changeOrigin: true,
          secure: true,
          rewrite: (path: string) => path.replace(/^\/api-insw/, ''),
        },
        '/api': {
          target: 'http://localhost:8100',
          changeOrigin: true,
          secure: false,
          xfwd: true,
        },
        '/ws-qc': {
          target: 'http://localhost:8100',
          ws: true,
        },
        '/php-server': {
          target: 'http://192.168.1.248',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/php-server/, ''),
        },
      },
    },
  }
})
