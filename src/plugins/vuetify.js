import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { ITEMS_POR_PAGINA, ITEMS_POR_PAGINA_OPCIONES } from "@/config/paginacion";

/**
 * Configuracion de Vuetify de la aplicacion.
 *
 * Vive en un solo lugar y la usan tanto `main.js` como los tests: si la app
 * y los tests configuraran Vuetify distinto, un test podria pasar con una
 * configuracion que en produccion no existe.
 *
 * Los defaults de `VDataTable` centralizan la paginacion de las 37 grillas:
 * antes cada una declaraba su propia cantidad de filas por pagina (10, 15 o
 * 20) y ninguna dejaba cambiarla.
 */
export function createAppVuetify() {
  return createVuetify({
    components,
    directives,
    icons: {
      defaultSet: "mdi",
    },
    theme: {
      defaultTheme: "light",
    },
    defaults: {
      VDataTable: {
        itemsPerPage: ITEMS_POR_PAGINA,
        itemsPerPageOptions: ITEMS_POR_PAGINA_OPCIONES,
      },
    },
  });
}
