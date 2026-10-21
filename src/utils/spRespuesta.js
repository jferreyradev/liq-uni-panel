/**
 * Normalización de la respuesta de los Stored Procedures.
 *
 * El backend devuelve el resultado con distintas envolturas ("out", "datos.out",
 * "vError", "valorError", ...) y antes cada componente repetía su propia cadena
 * de fallback. Esta centraliza la interpretación para que el cambio de contrato
 * se resuelva en un único lugar y pueda testearse de forma aislada.
 */

export const SP_OK = 0;
export const SP_ERROR = -1;

/**
 * Convierte un valor arbitrario en un código de error numérico.
 *
 * @param {*} value
 * @returns {number|undefined} undefined si no hay dato; -1 si el dato no es numérico
 */
export function toErrorCode(value) {
  if (value === undefined || value === null || value === '') return undefined;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : SP_ERROR;
  }

  const str = String(value).trim();
  if (!/^-?\d+$/.test(str)) return SP_ERROR;

  const num = Number(str);
  return Number.isFinite(num) ? num : SP_ERROR;
}

/**
 * Resuelve el código de error de una respuesta de SP.
 *
 * - 0  => operación exitosa
 * - N  => error de negocio con código N
 * - -1 => error genérico (red, HTTP o mensaje sin código)
 *
 * @param {Object} result resultado de ejecutarSP
 * @returns {number}
 */
export function resolveSpErrorCode(result = {}) {
  const { operacionOk, valorError, out, datos } = result || {};

  const primary = toErrorCode(valorError);
  if (primary !== undefined && primary !== SP_ERROR) return primary;

  const candidates = [
    out?.vError,
    out?.ValorError,
    out?.valorError,
    datos?.out?.vError,
    datos?.out?.ValorError,
    datos?.out?.valorError,
    datos?.vError,
    datos?.ValorError,
  ];

  for (const candidate of candidates) {
    const code = toErrorCode(candidate);
    if (code !== undefined) return code;
  }

  if (primary === SP_ERROR) return SP_ERROR;

  return operacionOk ? SP_OK : SP_ERROR;
}

/**
 * Extrae el mensaje de error de la respuesta del SP.
 *
 * @param {Object} result resultado de ejecutarSP
 * @param {string} [fallback]
 * @returns {string}
 */
export function extractSpMessage(result = {}, fallback = 'No se pudo completar la operación') {
  const { errorMsg, errmsg, out, datos } = result || {};

  const candidates = [
    errorMsg,
    out?.vErrorMsg,
    out?.vErrorMsj,
    out?.errorMsg,
    out?.ErrorMsg,
    out?.mensaje,
    out?.message,
    out?.error,
    datos?.out?.vErrorMsg,
    datos?.out?.vErrorMsj,
    datos?.out?.errorMsg,
    datos?.out?.mensaje,
    datos?.out?.message,
    datos?.out?.error,
    errmsg,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }

  return fallback;
}

/**
 * Indica si la operación fue exitosa (HTTP ok y código de error 0).
 *
 * @param {Object} result resultado de ejecutarSP
 * @returns {boolean}
 */
export function isSpOk(result = {}) {
  if (!result || !result.operacionOk) return false;
  return resolveSpErrorCode(result) === SP_OK;
}
