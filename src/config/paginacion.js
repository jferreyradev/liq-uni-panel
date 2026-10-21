/**
 * Configuracion de la paginacion de las grillas.
 *
 * Antes cada grilla definiia su propia cantidad de filas por pagina (10, 15
 * o 20, segun el componente) y ninguna permitia cambiarlo: el valor era una
 * constante enterrada en la plantilla. Con lo unica que se lee de un solo
 * lugar es que el comportamiento de las 37 grillas sea el mismo y que se
 * pueda cambiar sin tocar 37 archivos.
 *
 * El valor por defecto se aplica como default de Vuetify para `VDataTable`
 * (ver `src/main.js`), asi que alcanza con declararlo aca.
 */

/** Filas por pagina por defecto en todas las grillas. */
export const ITEMS_POR_PAGINA = 10;

/**
 * Opciones que el usuario puede elegir desde el pie de la grilla.
 *
 * La primera opcion es la que se usa por defecto. Vuetify exige que el valor
 * actual este entre las opciones, por eso ITEMS_POR_PAGINA esta incluido.
 * El -1 final es la opcion "Todos" que Vuetify ya trae por defecto.
 */
export const ITEMS_POR_PAGINA_OPCIONES = [10, 15, 20, 50, 100, -1];

/**
 * Paginacion del lado del servidor.
 *
 * Estado: PENDIENTE DE CONFIRMAR CON EL BACKEND.
 *
 * Hoy todas las grillas paginan en el cliente: el backend devuelve la lista
 * completa y Vuetify la corta en paginas. Eso funciona, pero con listados
 * grandes travels toda la data y el tiempo de respuesta crece.
 *
 * Para pasar a paginacion en el servidor hacen falta dos cosas:
 * 1. Que el backend acepte los parametros de pagina y de cantidad.
 * 2. Que cada endpoint los aplique y devuelva ademas el total de registros.
 *
 * Los nombres de los parametros de abajo son una propuesta: hay que
 * confirmarlos antes de habilitarlos. Con `habilitada: false` no se envia
 * ningun parametro extra, asi que el backend actual no se ve afectado.
 */
export const PAGINACION_SERVER = {
  habilitada: false,
  /** Parametro de numero de pagina (base 1). */
  paramPagina: "page",
  /** Parametro de cantidad de registros por pagina. */
  paramItems: "pageSize",
  /** Campo de la respuesta con el total de registros. */
  paramTotal: "total",
};
