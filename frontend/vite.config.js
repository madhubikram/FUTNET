import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'


// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true, 
    proxy: {
      '^/api/.*': {
        target: 'http://192.168.1.70:5000',
        changeOrigin: true,
        secure: false, // Bypass certificate check in development
        host: true
      }
    }
  },
  base: '/',
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      manifest: {
        name: 'FUTNET',
        short_name: 'FUTNET',
        description: 'Your Futsal Booking Platform',
        theme_color: '#4CAF50',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',  
        scope: '/',
        id: '/futnet', 
        categories: ['sports', 'fitness'],
        prefer_related_applications: false,
        icons: [
          {
            src: '/pwa-192x192.png',  
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'        
          },
          {
            src: '/pwa-512x512.png',  
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'        
          },
          {
            src: '/maskable-icon.png',  
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'  
          }
        ],
        screenshots: [
          {
            src: '/screenshot-1.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide'
          },
          {
            src: '/screenshot-mobile.png',
            sizes: '750x1334',
            type: 'image/png',
            form_factor: 'narrow'
          }
        ]
      },
      injectManifest: {
         injectionPoint: undefined
      },
      devOptions: {
        enabled: true,
        type: 'module',
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  
})

