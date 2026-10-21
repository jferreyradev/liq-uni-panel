import {
  CAMPOS_SENSIBLES,
  PERFIL_POR_DEFECTO,
  PERFILES,
  ROLES_RESTRINGIDOS,
} from "@/config/permisos";

/**
 * Utilidades de permisos y proteccion de datos personales.
 *
 * El backend siempre devuelve el dato completo: el que decide que se vea es
 * el frontend. Estas funciones concentran esa decision para que ningun
 * componente tenga que inventar su propia regla.
 */

/**
 * Perfil de acceso que corresponde a un rol.
 *
 * Sin sesion (rol null o vacio) el perfil es RESTRINGIDO: si no se sabe quien
 * pregunta, no se muestran datos personales.
 *
 * @param {number|string|null|undefined} rol
 * @returns {string} uno de PERFILES
 */
export function perfilDeRol(rol) {
  if (rol === null || rol === undefined || rol === "") return PERFILES.RESTRINGIDO;

  const restringido = ROLES_RESTRINGIDOS.some((r) => String(r) === String(rol));
  return restringido ? PERFILES.RESTRINGIDO : PERFIL_POR_DEFECTO;
}

/**
 * Indica si el rol puede ver los datos personales sin enmascarar.
 *
 * @param {number|string|null|undefined} rol
 * @returns {boolean}
 */
export function puedeVerPII(rol) {
  return perfilDeRol(rol) === PERFILES.COMPLETO;
}

/**
 * Enmascara un valor sensible dejando visibles los ultimos caracteres.
 *
 * No revela nada del valor si es null, undefined o vacio: se devuelve tal
 * cual, para que la vista muestre el guion que ya usaba.
 *
 * @param {*} valor
 * @param {string} campo clave en CAMPOS_SENSIBLES
 * @returns {*}
 */
export function enmascararValor(valor, campo) {
  if (valor === null || valor === undefined || valor === "") return valor;

  const regla = CAMPOS_SENSIBLES[campo];
  if (!regla) return valor;

  const texto = String(valor);
  const { visibles, caracter } = regla;

  if (texto.length <= visibles) {
    return caracter.repeat(texto.length);
  }

  return caracter.repeat(texto.length - visibles) + texto.slice(-visibles);
}

/**
 * Devuelve el valor a mostrar de un dato personal segun el rol.
 *
 * Si el rol puede ver la PII, devuelve el valor original. Si no, devuelve el
 * valor enmascarado.
 *
 * @param {*} valor
 * @param {string} campo clave en CAMPOS_SENSIBLES
 * @param {number|string|null|undefined} rol
 * @returns {*}
 */
export function valorVisible(valor, campo, rol) {
  if (puedeVerPII(rol)) return valor;
  return enmascararValor(valor, campo);
}
