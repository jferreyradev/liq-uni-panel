import {
  request,
  isAbsoluteUrl,
  RESPONSE_BLOB,
  RESPONSE_ARRAYBUFFER,
} from "@/shared/services/httpClient";

/**
 * Fachada de dominio sobre el cliente HTTP único (@/shared/services/httpClient).
 *
 * Mantiene los nombres y las formas de retorno que usa la app:
 *   leerDatos / grabarRegistro / eliminarRegistro / ejecutarSP / ejecutarSPStream
 *   ejecutarSP_SinEspera / descargaTXT
 *
 * La política de negocio (por ejemplo, que un 404 en un listado no es un
 * error fatal) vive acá; el transporte vive en httpClient.
 */

/**
 * Convierte el código de error del SP a número.
 * Un valor no numérico (por ejemplo un texto de error) se traduce a -1,
 * de modo que nunca pueda colarse un NaN en la comparación de éxito.
 */
function normalizeErrorCode(rawErr) {
  if (rawErr === undefined || rawErr === null || rawErr === "") return 0;
  if (typeof rawErr === "number") return Number.isFinite(rawErr) ? rawErr : -1;

  const str = String(rawErr).trim();
  if (!str) return 0;
  if (!/^-?\d+$/.test(str)) return -1;

  const num = Number(str);
  return Number.isFinite(num) ? num : -1;
}

export async function grabarRegistro(url = "", data = {}, metodo = "POST", options = {}) {
  const res = await request({
    service: "base",
    path: url,
    method: metodo,
    body: data,
    signal: options.signal,
    timeout: options.timeout,
  });

  return {
    estado: res.estado,
    operacionOk: res.operacionOk,
    errmsg: res.errmsg || "Error al intentar grabar el registro",
    datos: res.datos,
  };
}

export async function eliminarRegistro(url = "", metodo = "DELETE", options = {}) {
  const res = await request({
    service: "base",
    path: url,
    method: metodo,
    body: options.body,
    signal: options.signal,
    timeout: options.timeout,
  });

  return {
    estado: res.estado,
    operacionOk: res.operacionOk,
    errmsg: res.errmsg || "Error al intentar eliminar el registro",
    datos: res.datos,
  };
}

/**
 * Lee un listado.
 *
 * Acepta tanto una ruta relativa a /api/ ("en/cargo") como una URL absoluta
 * ("https://host/api/en/cargo"), que es lo que necesitan los composables que
 * arman la URL por su cuenta.
 *
 * @param {string} url ruta relativa a /api/ o URL absoluta
 * @param {{signal?: AbortSignal, timeout?: number, headers?: Object, query?: Object, method?: string, body?: *}} [options]
 * @returns {Promise<{estado, operacionOk, errmsg, datos, notFound}>}
 */
export async function leerDatos(url = "", options = {}) {
  const res = await request({
    url: isAbsoluteUrl(url) ? url : "",
    service: "base",
    path: url,
    method: options.method || "GET",
    body: options.body,
    headers: options.headers,
    query: options.query,
    signal: options.signal,
    timeout: options.timeout,
  });

  // Se conserva la semántica histórica: un 404 no se considera un error
  // fatal del listado. El flag notFound permite distinguirlo si hace falta.
  const operacionOk = res.operacionOk || res.notFound;

  return {
    estado: res.estado,
    operacionOk,
    errmsg: res.errmsg,
    datos: res.datos,
    notFound: res.notFound,
  };
}

/**
 * Ejecuta un Stored Procedure.
 *
 * @param {string} url ruta relativa al host de SP
 * @param {Object} data payload
 * @param {string} [metodo]
 * @param {{signal?: AbortSignal, timeout?: number}} [options]
 */
export async function ejecutarSP(url = "", data = {}, metodo = "POST", options = {}) {
  let estado = 0;
  let operacionOk = false;
  let errmsg = "";
  let valorError = -1;
  let valorSalida = 0;
  let errorMsg = "";
  let datos = null;
  let out = null;

  try {
    const res = await request({
      service: "sp",
      path: url,
      method: metodo,
      body: data,
      signal: options.signal,
      timeout: options.timeout,
      cache: "no-cache",
    });

    estado = res.estado;
    operacionOk = res.operacionOk;
    datos = res.datos;

    if (operacionOk) {
      let payload = datos && datos.out ? datos.out : datos;
      if (Array.isArray(payload)) {
        payload = payload[0] || {};
      }
      if (payload && typeof payload === "object") {
        const rawErr =
          payload.vError ??
          payload.valorError ??
          payload.ValorError ??
          payload.VALORERROR ??
          payload.error;
        valorError = normalizeErrorCode(rawErr);
        const rawSalida =
          payload.vSALIDA ??
          payload.vSalida ??
          payload.VSALIDA ??
          payload.salida ??
          payload.id;
        valorSalida = rawSalida !== undefined ? rawSalida : 0;
        errorMsg =
          payload.vErrorMsg ||
          payload.vErrorMsj ||
          payload.errorMsg ||
          payload.ErrorMsg ||
          payload.mensaje ||
          payload.message ||
          (typeof payload.error === "string" ? payload.error : "") ||
          "";
        out = datos && datos.out ? datos.out : payload;
      } else {
        valorError = 0;
        out = datos;
      }
    } else {
      errmsg = "Error al intentar ejecutar el proceso";
      errorMsg = errmsg;
    }
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    estado = 999;
    operacionOk = false;
    errmsg = "Error en la Red";
    errorMsg = "Error en la Red";
    datos = null;
  }

  return {
    estado,
    operacionOk,
    errmsg,
    valorError,
    valorSalida,
    errorMsg,
    datos,
    out,
  };
}

export const ejecutaSP = ejecutarSP;

/**
 * Dispara un SP sin esperar el resultado (fire & forget).
 * Se mantiene la semántica "SinEspera" del contrato original, pero se engancha
 * el catch de la promesa para evitar rejections no controlados.
 */
export async function ejecutarSP_SinEspera(
  url = "",
  data = {},
  metodo = "POST",
  options = {},
) {
  let salida = 0;
  let response = null;

  try {
    const promise = request({
      service: "sp",
      path: url,
      method: metodo,
      body: data,
      signal: options.signal,
      timeout: options.timeout ?? 0,
    });

    response = promise;

    promise.catch((error) => {
      console.error("Error en ejecutarSP_SinEspera:", error);
    });
  } catch (error) {
    salida = 1;
  }

  return { response, salida };
}

export async function ejecutarSPStream(
  url = "",
  data = {},
  metodo = "POST",
  options = {},
) {
  let estado = 0;
  let operacionOk = false;
  let errmsg = "";
  let datos = null;

  try {
    const res = await request({
      service: "sp",
      path: url,
      method: metodo,
      body: data,
      signal: options.signal,
      timeout: options.timeout,
      cache: "no-cache",
    });

    estado = res.estado;
    operacionOk = res.operacionOk;
    datos = res.datos?.out?.Cursor;

    if (!operacionOk) {
      errmsg = "Error al intentar obtener el stream del archivo";
    }
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    estado = 999;
    operacionOk = false;
    errmsg = "Error en la Red";
    datos = null;
  }

  return { estado, operacionOk, errmsg, datos };
}

export async function descargaTXT(url) {
  const res = await request({
    service: "base",
    path: url,
    method: "GET",
    responseType: RESPONSE_BLOB,
  });

  if (!res.operacionOk || !res.datos) return null;

  return window.URL.createObjectURL(res.datos);
}

/**
 * Descarga un archivo binario y devuelve una URL de objeto lista para el
 * `download` de un <a> o para abrirlo en una pestaña.
 *
 * Acepta tanto una ruta relativa a /api/ ("txt/archivoIPSST") como una URL
 * absoluta, que es lo que necesitan los archivos que ya traen su URL armada.
 *
 * @param {string} url ruta relativa a /api/ o URL absoluta
 * @param {{service?: string, method?: string, query?: Object, headers?: Object, signal?: AbortSignal, timeout?: number}} [options]
 * @returns {Promise<{operacionOk: boolean, estado: number, errmsg: string, url: string|null, blob: Blob|null}>}
 */
export async function descargaArchivo(url = "", options = {}) {
  const res = await request({
    url: isAbsoluteUrl(url) ? url : "",
    service: options.service || "base",
    path: url,
    method: options.method || "GET",
    query: options.query,
    headers: options.headers,
    signal: options.signal,
    timeout: options.timeout,
    responseType: RESPONSE_BLOB,
  });

  if (!res.operacionOk || !res.datos) {
    return {
      operacionOk: false,
      estado: res.estado,
      errmsg: res.errmsg || "No se pudo descargar el archivo",
      url: null,
      blob: null,
    };
  }

  return {
    operacionOk: true,
    estado: res.estado,
    errmsg: "",
    url: window.URL.createObjectURL(res.datos),
    blob: res.datos,
  };
}

/**
 * Descarga un recurso binario crudo (arraybuffer). Lo usan las imágenes, como
 * el logo del municipio que se estampa en la boleta.
 *
 * @param {string} url ruta relativa a /api/ o URL absoluta
 * @param {{service?: string, method?: string, query?: Object, headers?: Object, signal?: AbortSignal, timeout?: number}} [options]
 * @returns {Promise<{operacionOk: boolean, estado: number, errmsg: string, datos: ArrayBuffer|null}>}
 */
export async function descargaBuffer(url = "", options = {}) {
  const res = await request({
    url: isAbsoluteUrl(url) ? url : "",
    service: options.service || "base",
    path: url,
    method: options.method || "GET",
    query: options.query,
    headers: options.headers,
    signal: options.signal,
    timeout: options.timeout,
    responseType: RESPONSE_ARRAYBUFFER,
  });

  if (!res.operacionOk || !res.datos) {
    return {
      operacionOk: false,
      estado: res.estado,
      errmsg: res.errmsg || "No se pudo descargar el recurso",
      datos: null,
    };
  }

  return {
    operacionOk: true,
    estado: res.estado,
    errmsg: "",
    datos: res.datos,
  };
}
