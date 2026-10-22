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
  build: {
    rollupOptions: {
      output: {
        /**
         * Parte el bundle en chunks por library.
         *
         * Sin esto, todo lo que se importa en el arranque (Vue, Vuetify)
         * viajaba en un unico chunk de ~575 kB, junto con el codigo de la
         * app. Partirlo tiene dos beneficios: el chunk de libreria se cachea
         * entre deploys (cambia menos que el codigo propio) y el aviso de
         * "chunks larger than 500 kB" deja de aparecer.
         *
         * `xlsx` y `pdf-lib` ya quedaban aparte por el import dinamico de las
         * vistas; se los nombra explicitamente para que no cambien de chunk
         * segun el arbol de imports.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('/vuetify/') || id.includes('/vueuc/')) return 'vuetify'
          if (id.includes('/xlsx/')) return 'xlsx'
          if (id.includes('/pdf-lib/')) return 'pdf-lib'
          if (
            id.includes('/vue/') ||
            id.includes('/vue-router/') ||
            id.includes('/pinia/') ||
            id.includes('/@vue/')
          ) {
            return 'vue'
          }

          return undefined
        }
      }
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
