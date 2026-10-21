// @vitest-environment jsdom
import { config } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

/**
 * Setup global de los tests.
 *
 * Registra los componentes de Vuetify en todos los tests. Sin esto, cada test
 * que monta un componente con grillas, botones o contenedores emite
 * "Failed to resolve component: v-data-table" y el ruido termina tapando los
 * warnings que si importan.
 *
 * Requiere `server.deps.inline: ['vuetify']` en la configuracion de Vite:
 * Vuetify importa CSS desde sus .js y Node rechaza los .css si el paquete no
 * se transforma.
 */
config.global.plugins = [
  ...(config.global.plugins ?? []),
  createVuetify({ components, directives })
]
