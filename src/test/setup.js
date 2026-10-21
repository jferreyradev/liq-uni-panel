// @vitest-environment jsdom
import { config } from "@vue/test-utils";
import { createAppVuetify } from "@/plugins/vuetify";

/**
 * Setup global de los tests.
 *
 * Registra Vuetify en todos los tests con la misma configuracion que usa la
 * aplicacion (`src/plugins/vuetify.js`). Sin esto, cada test que monta un
 * componente con grillas, botones o contenedores emite "Failed to resolve
 * component: v-data-table" y el ruido termina tapando los warnings que si
 * importan.
 *
 * Requiere `server.deps.inline: ['vuetify']` en la configuracion de Vite:
 * Vuetify importa CSS desde sus .js y Node rechaza los .css si el paquete no
 * se transforma.
 */
config.global.plugins = [
  ...(config.global.plugins ?? []),
  createAppVuetify(),
];

/**
 * jsdom no implementa `ResizeObserver`, que Vuetify usa en el paginador y en
 * los menus. Con el stub minimo se pueden montar componentes reales de
 * Vuetify en los tests (por ejemplo, para verificar la paginacion).
 */
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
