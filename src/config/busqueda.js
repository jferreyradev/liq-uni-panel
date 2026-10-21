/**
 * Configuracion del parametro "search" que se envia al backend.
 *
 * El backend (.NET) recibe el filtro de busqueda como un parametro "search"
 * con el formato "Campo:Valor". Lo que no esta confirmado es que happen con
 * dos campos simultaneos:
 *
 *   REPETIDO  -> search=Apellido:Perez&search=Nombre:Jose
 *   COMPUESTO -> search=Apellido:Perez,Nombre:Jose
 *
 * El formato REPETIDO es el que la app usa hoy y el que el backend acepta.
 * Con dos "search" al mismo tiempo no esta confirmado que se apliquen los
 * dos: puede quedarse solo con el primero, y el filtro por nombre
 * desapareceria sin avisar.
 *
 * Por eso el modo vive aca y no en los componentes: cambiarlo es una linea,
 * y el backend solo tiene que confirmar cual de los dos formatos soporta
 * para cambiar `MODO_BUSQUEDA`.
 */

/** Formatos soportados para el parametro "search". */
export const MODOS_BUSQUEDA = {
  /** Un parametro "search" por campo: search=A:1&search=B:2 */
  REPETIDO: "REPETIDO",
  /** Un unico parametro "search" con los campos separados: search=A:1,B:2 */
  COMPUESTO: "COMPUESTO",
};

/**
 * Modo con el que se arma el parametro "search".
 *
 * REPETIDO: es el contrato vigente con el backend; no cambiar hasta que el
 * backend confirme que soporta el formato compuesto.
 */
export const MODO_BUSQUEDA = MODOS_BUSQUEDA.REPETIDO;

/**
 * Separador entre campos cuando el modo es COMPUESTO.
 * Solo se usa si `MODO_BUSQUEDA` pasa a COMPUESTO.
 */
export const SEPARADOR_BUSQUEDA = ",";
