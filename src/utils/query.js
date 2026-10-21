/**
 * Utilidades para construir y leer query strings de forma segura.
 *
 * Motivo: antes los filtros se armaban por concatenación directa
 * ("search=Apellido:" + valor), lo que permitía que un valor con "&", "=" o ":"
 * rompiera o manipulase la consulta enviada al backend.
 */

import { MODO_BUSQUEDA, MODOS_BUSQUEDA, SEPARADOR_BUSQUEDA } from "@/config/busqueda";

/**
 * Codifica un valor de "search" con el formato "Campo:Valor".
 *
 * "search=Apellido:Juan Perez" -> "search=Apellido:Juan%20Perez"
 * Se mantiene el separador "campo:valor" legible y se codifica el valor.
 *
 * @param {*} value
 * @returns {string}
 */
function encodeSearchValue(value) {
  const str = String(value ?? "");
  const idx = str.indexOf(":");
  if (idx === -1) return encodeURIComponent(str);
  return `${encodeURIComponent(str.slice(0, idx))}:${encodeURIComponent(str.slice(idx + 1))}`;
}

/**
 * Codificadores especiales por clave.
 * El resto de las claves se codifican con encodeURIComponent.
 */
const ENCODERS = {
  search: encodeSearchValue,
  // El "sort" viaja como JSON. Se preservan ":" y "," para no alterar el
  // contrato que el backend ya acepta (el navegador los envía igual de esa forma).
  sort: (value) =>
    encodeURIComponent(String(value))
      .replace(/%3A/gi, ':')
      .replace(/%2C/gi, ','),
};

function encodeValue(key, value) {
  const encoder = ENCODERS[key];
  return encoder ? encoder(value) : encodeURIComponent(String(value));
}

/**
 * Construye un query string a partir de un objeto.
 * - Descarta valores null/undefined/vacíos.
 * - Los arrays generan un parámetro repetido (search=...&search=...).
 * - Codifica los valores para evitar inyección de parámetros.
 *
 * El parámetro "search" es la excepción: su formato (repetido o compuesto)
 * depende de `src/config/busqueda.js`, para poder cambiarlo sin tocar los
 * componentes que arman los filtros.
 *
 * @param {Object} params
 * @returns {string} query string sin el "?" inicial
 */
export function buildQuery(params = {}) {
  if (!params || typeof params !== 'object') return '';

  const parts = [];

  Object.entries(params).forEach(([key, rawValue]) => {
    if (rawValue === undefined || rawValue === null) return;

    const values = (Array.isArray(rawValue) ? rawValue : [rawValue]).filter(
      (value) => value !== undefined && value !== null && value !== ''
    );
    if (values.length === 0) return;

    // Modo compuesto: un solo parámetro "search" con los campos separados.
    if (key === 'search' && values.length > 1 && MODO_BUSQUEDA === MODOS_BUSQUEDA.COMPUESTO) {
      const compuesto = values.map((value) => encodeSearchValue(value)).join(SEPARADOR_BUSQUEDA);
      parts.push(`${encodeURIComponent(key)}=${compuesto}`);
      return;
    }

    values.forEach((value) => {
      parts.push(`${encodeURIComponent(key)}=${encodeValue(key, value)}`);
    });
  });

  return parts.join('&');
}

/**
 * Convierte un query string en un objeto plano.
 * Las claves repetidas se agrupan en un array.
 *
 * @param {string} query
 * @returns {Object}
 */
export function parseQueryString(query = '') {
  const result = {};
  if (!query) return result;

  const clean = String(query).replace(/^[?&]+/, '');

  clean.split('&').forEach((pair) => {
    if (!pair) return;

    const idx = pair.indexOf('=');
    const rawKey = idx === -1 ? pair : pair.slice(0, idx);
    const rawValue = idx === -1 ? '' : pair.slice(idx + 1);

    let key = rawKey;
    let value = rawValue;
    try {
      key = decodeURIComponent(rawKey);
      value = decodeURIComponent(rawValue);
    } catch {
      // Si no se puede decodificar, se conserva el valor original
    }

    if (Object.prototype.hasOwnProperty.call(result, key)) {
      result[key] = Array.isArray(result[key])
        ? [...result[key], value]
        : [result[key], value];
    } else {
      result[key] = value;
    }
  });

  return result;
}

/**
 * Construye el valor del parámetro "search" con el formato "Campo:Valor".
 * El campo queda legible y el valor correctamente codificado.
 *
 * @param {string} campo
 * @param {string|number} valor
 * @returns {string|null}
 */
export function buildSearchValue(campo, valor) {
  if (campo === undefined || campo === null || campo === '') return null;
  if (valor === undefined || valor === null) return null;

  const str = String(valor).trim();
  if (!str) return null;

  return `${campo}:${str}`;
}

/**
 * Agrega un parámetro a un query string existente sin duplicar la "?".
 *
 * @param {string} query
 * @param {string} param
 * @returns {string}
 */
export function appendQueryParam(query, param) {
  if (!param) return query || '';
  if (!query) return param;
  return `${query}&${param}`;
}
