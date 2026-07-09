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
      dedupe: ['react', 'react-dom', 'react-router-dom', 'i18next', 'react-i18next', '@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled', '@mui/x-date-pickers', '@mui/x-data-grid'],
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
        targets: ['Android >= 6.0', 'Chrome >= 64', 'Safari >= 12', 'iOS >= 12'],
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
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        injectRegister: false,
        injectManifest: {
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15MB
          globIgnores: ['**/travel/**'],
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
              type: 'image/png'
            },
            {
              src: '/logo.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            mui: ['@mui/material', '@mui/icons-material', '@mui/x-data-grid', '@mui/x-date-pickers']
          }
        }
      }
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
