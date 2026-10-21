import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    server: {
      deps: {
        // Vuetify importa CSS desde los .js de cada componente: sin inlinear
        // el paquete, Node rechaza los .css ("Unknown file extension").
        // Inlinear permite montar componentes reales de Vuetify en los tests.
        inline: ['vuetify']
      }
    }
  }
})
