import { useEndPoints } from "@/composables/useEndPoints";

/**
 * Cliente HTTP único del proyecto.
 *
 * Objetivo: que exista un solo lugar en el código donde se llame a `fetch`.
 * Todo el resto de la app (apiService, useFetch, useDataTable, useSpGrabar y los
 * stores) pasa por acá, de modo que:
 *  - los headers (x-project-key / x-project-port) se apliquen siempre,
 *  - las URLs se resuelvan contra el municipio/entorno activo,
 *  - toda petición tenga timeout (antes una petición colgada dejaba la UI en
 *    "loading..." para siempre),
 *  - los errores se interpreten igual en todos lados,
 *  - el AbortError se distinga del error de red y del timeout.
 */

export const DEFAULT_TIMEOUT_MS = 30000;

export const RESPONSE_JSON = "json";
export const RESPONSE_TEXT = "text";
export const RESPONSE_BLOB = "blob";
export const RESPONSE_ARRAYBUFFER = "arraybuffer";
export const RESPONSE_RAW = "raw";

/**
 * Resuelve la URL completa a partir del servicio y la ruta.
 *
 * - base    -> {apiBase}/api/{path}
 * - sp      -> {apiSp}/{path}
 * - boletas -> {apiBoletas}/{path}
 *
 * @param {string} service
 * @param {string} path
 * @returns {string}
 */
export function resolveServiceUrl(service = "base", path = "") {
  const { apiBase, apiBoletas, apiSp } = useEndPoints();

  const cleanPath = String(path ?? "").replace(/^\/+/, "");

  if (service === "sp") return `${apiSp.value}/${cleanPath}`;
  if (service === "boletas") return `${apiBoletas.value}/${cleanPath}`;

  return `${apiBase.value}/api/${cleanPath}`;
}

/**
 * Indica si la ruta informada ya es una URL absoluta.
 * Permite que las capas de dominio acepte tanto rutas relativas ("en/cargo")
 * como URLs completas ("https://host/api/en/cargo").
 *
 * @param {string} value
 * @returns {boolean}
 */
export function isAbsoluteUrl(value) {
  return typeof value === "string" && /^[a-z][a-z0-9+.-]*:\/\//i.test(value.trim());
}

/**
 * Agrega query params a una URL sin duplicar la "?".
 *
 * @param {string} url
 * @param {Object|URLSearchParams} query
 * @returns {string}
 */
export function appendQuery(url, query) {
  if (!query) return url;

  const params =
    query instanceof URLSearchParams
      ? query
      : new URLSearchParams(
          Object.entries(query)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => [key, String(value)]),
        );

  const search = params.toString();
  if (!search) return url;

  return url.includes("?") ? `${url}&${search}` : `${url}?${search}`;
}

/**
 * Lee el cuerpo de una respuesta tolerando cuerpos vacíos o no-JSON.
 *
 * @param {Response} response
 * @returns {Promise<{ok: boolean, data: any, raw: string|null}>}
 */
export async function parseJsonSafe(response) {
  let text = "";
  try {
    text = await response.text();
  } catch {
    return { ok: false, data: null, raw: null };
  }

  if (!text || !text.trim()) {
    return { ok: true, data: null, raw: null };
  }

  try {
    return { ok: true, data: JSON.parse(text), raw: null };
  } catch {
    return { ok: false, data: null, raw: text.slice(0, 200) };
  }
}

/**
 * Ejecuta una petición HTTP.
 *
 * @param {Object} options
 * @param {string} [options.url] URL absoluta. Si se informa, tiene prioridad.
 * @param {string} [options.service] 'base' | 'sp' | 'boletas'
 * @param {string} [options.path] ruta relativa al prefijo del servicio
 * @param {string} [options.method]
 * @param {Object} [options.query] query params
 * @param {*} [options.body] objeto (se serializa a JSON) o FormData
 * @param {Object} [options.headers] headers adicionales
 * @param {AbortSignal} [options.signal]
 * @param {string} [options.responseType] json | text | blob | arraybuffer | raw
 * @param {number} [options.timeout] milisegundos (0 desactiva el timeout)
 * @param {boolean} [options.parseErrorBody] incluir el cuerpo del error en errmsg
 * @returns {Promise<{estado, operacionOk, errmsg, datos, notFound, response}>}
 */
export async function request({
  url = "",
  service = "base",
  path = "",
  method = "GET",
  query = null,
  body = undefined,
  headers = {},
  signal = null,
  responseType = RESPONSE_JSON,
  timeout = DEFAULT_TIMEOUT_MS,
  cache = "",
  parseErrorBody = false,
} = {}) {
  const { getBoletasHeaders } = useEndPoints();

  const target = url || resolveServiceUrl(service, path);
  const finalUrl = appendQuery(target, query);

  const controller = new AbortController();
  let timedOut = false;
  let timeoutId = null;

  if (timeout > 0) {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeout);
  }

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  const finalHeaders = getBoletasHeaders(headers);

  const requestInit = {
    method,
    mode: "cors",
    redirect: "follow",
    referrerPolicy: "no-referrer",
    headers: finalHeaders,
    signal: controller.signal,
  };

  if (cache) {
    requestInit.cache = cache;
  }

  if (body !== undefined && body !== null) {
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      requestInit.body = body;
    } else if (typeof body === "string") {
      requestInit.body = body;
    } else {
      requestInit.body = JSON.stringify(body);
    }
  }

  let estado = 0;
  let operacionOk = false;
  let errmsg = "";
  let datos = null;
  let notFound = false;
  let response = null;

  try {
    response = await fetch(finalUrl, requestInit);
    estado = response.status;
    operacionOk = response.ok;
    notFound = response.status === 404;

    if (responseType === RESPONSE_RAW) {
      datos = response;
    } else if (responseType === RESPONSE_BLOB) {
      datos = await response.blob();
    } else if (responseType === RESPONSE_ARRAYBUFFER) {
      datos = await response.arrayBuffer();
    } else if (responseType === RESPONSE_TEXT) {
      datos = await response.text();
    } else {
      const parsed = await parseJsonSafe(response);
      datos = parsed.data;
      if (!parsed.ok && response.ok) {
        operacionOk = false;
        errmsg = "La respuesta del servidor no tiene un formato válido";
      }
    }

    if (!response.ok) {
      errmsg = notFound
        ? "No se encontraron los datos solicitados"
        : `Error al completar la petición (HTTP ${response.status})`;

      if (parseErrorBody && responseType === RESPONSE_JSON) {
        const detail =
          datos && typeof datos === "object"
            ? datos.error || datos.mensaje || datos.message
            : null;
        if (detail) errmsg = String(detail);
      }
    }
  } catch (error) {
    if (error?.name === "AbortError") {
      // Timeout: no es una cancelación del llamador
      if (timedOut) {
        estado = 408;
        operacionOk = false;
        errmsg = `La solicitud excedió el tiempo límite (${timeout} ms)`;
      } else {
        // Cancelación del llamador: se propaga para que la distinga
        throw error;
      }
    } else {
      estado = 999;
      operacionOk = false;
      errmsg = "Error en la Red";
    }
    datos = null;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  return { estado, operacionOk, errmsg, datos, notFound, response };
}

/**
 * Igual que request() pero lanza una excepción si la operación no fue exitosa.
 * Útil para los casos en que el llamante prefiera manejar el error con try/catch.
 *
 * @param {Object} options
 * @returns {Promise<any>} los datos de la respuesta
 */
export async function requestOrThrow(options = {}) {
  const res = await request(options);

  if (!res.operacionOk) {
    const error = new Error(res.errmsg || "Error al completar la petición");
    error.estado = res.estado;
    error.notFound = res.notFound;
    throw error;
  }

  return res.datos;
}
