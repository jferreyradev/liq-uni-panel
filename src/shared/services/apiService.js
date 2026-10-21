import { useEndPoints } from "@/composables/useEndPoints";

function getUrlApi() {
  const { apiBase } = useEndPoints();
  return `${apiBase.value}/api/`;
}

function getUrlApiSp() {
  const { apiSp } = useEndPoints();
  return `${apiSp.value}/`;
}

function getHeaders(extraHeaders = {}) {
  const { getBoletasHeaders } = useEndPoints();
  return getBoletasHeaders(extraHeaders);
}

/**
 * Lee el cuerpo de una respuesta tolerando cuerpos vacíos o no-JSON.
 * Evita que un 500 con cuerpo HTML termine reportado como "Error en la Red".
 *
 * @param {Response} response
 * @returns {Promise<{ok: boolean, data: any, raw: string|null}>}
 */
async function parseJsonSafe(response) {
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

function isAbortError(error) {
  return error?.name === "AbortError";
}

export async function grabarRegistro(url = "", data = {}, metodo = "POST", options = {}) {
  let estado = 0;
  let operacionOk = false;
  let errmsg = "";
  let datos = null;
  try {
    const response = await fetch(getUrlApi() + url, {
      method: metodo,
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
        ...getHeaders(),
      },
      redirect: "follow",
      referrerPolicy: "no-referrer",
      body: JSON.stringify(data),
      signal: options.signal,
    });
    estado = response.status;
    operacionOk = response.ok;
    if (response.ok) {
      const parsed = await parseJsonSafe(response);
      datos = parsed.data;
      if (!parsed.ok) {
        operacionOk = false;
        errmsg = "La respuesta del servidor no tiene un formato válido";
      }
    } else {
      errmsg = "Error al intentar grabar el registro";
    }
  } catch (error) {
    if (isAbortError(error)) throw error;
    estado = 999;
    operacionOk = false;
    errmsg = "Error en la Red";
    datos = null;
  }
  return { estado, operacionOk, errmsg, datos };
}

export async function eliminarRegistro(url = "", metodo = "DELETE", options = {}) {
  let estado = 0;
  let operacionOk = false;
  let errmsg = "";
  let datos = null;
  try {
    const response = await fetch(getUrlApi() + url, {
      method: metodo,
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        ...getHeaders(),
      },
      signal: options.signal,
    });
    estado = response.status;
    operacionOk = response.ok;
    if (response.ok) {
      const parsed = await parseJsonSafe(response);
      datos = parsed.data;
      if (!parsed.ok) {
        operacionOk = false;
        errmsg = "La respuesta del servidor no tiene un formato válido";
      }
    } else {
      errmsg = "Error al intentar eliminar el registro";
    }
  } catch (error) {
    if (isAbortError(error)) throw error;
    estado = 999;
    operacionOk = false;
    errmsg = "Error en la Red";
    datos = null;
  }
  return { estado, operacionOk, errmsg, datos };
}

/**
 * Lee un listado.
 *
 * @param {string} url ruta relativa a /api/
 * @param {{signal?: AbortSignal}} [options]
 * @returns {Promise<{estado, operacionOk, errmsg, datos, notFound}>}
 */
export async function leerDatos(url = "", options = {}) {
  let estado = 0;
  let operacionOk = false;
  let errmsg = "";
  let datos = null;
  let notFound = false;
  let response = null;
  try {
    response = await fetch(getUrlApi() + url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getHeaders(),
      },
      signal: options.signal,
    });
    estado = response.status;
    if (response.ok) {
      const parsed = await parseJsonSafe(response);
      if (parsed.ok) {
        datos = parsed.data;
        operacionOk = true;
      } else {
        errmsg = "La respuesta del servidor no tiene un formato válido";
        operacionOk = false;
      }
    } else {
      notFound = response.status === 404;
      // Se conserva la semántica histórica: un 404 no se considera un error
      // fatal del listado. El flag notFound permite distinguirlo si hace falta.
      operacionOk = notFound;
      errmsg = notFound
        ? "No se encontraron los datos solicitados"
        : "Error al intentar leer los datos";
    }
  } catch (error) {
    if (isAbortError(error)) throw error;
    estado = 999;
    operacionOk = false;
    errmsg = "Error en la Red";
    datos = null;
  }
  return { estado, operacionOk, errmsg, datos, notFound };
}

/**
 * Ejecuta un Stored Procedure.
 *
 * @param {string} url ruta relativa al host de SP
 * @param {Object} data payload
 * @param {string} [metodo]
 * @param {{signal?: AbortSignal}} [options]
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
    const response = await fetch(getUrlApiSp() + url, {
      method: metodo,
      mode: "cors",
      cache: "no-cache",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...getHeaders(),
      },
      redirect: "follow",
      referrerPolicy: "no-referrer",
      body: JSON.stringify(data),
      signal: options.signal,
    });
    estado = response.status;
    operacionOk = response.ok;

    const parsed = await parseJsonSafe(response);
    datos = parsed.data;

    if (response.ok) {
      if (!parsed.ok) {
        operacionOk = false;
        errmsg = "La respuesta del servidor no tiene un formato válido";
        errorMsg = errmsg;
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
      errorMsg = parsed.raw
        ? `Error al intentar ejecutar el proceso (${parsed.raw})`
        : errmsg;
    }
  } catch (error) {
    if (isAbortError(error)) throw error;
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
    response = fetch(getUrlApiSp() + url, {
      method: metodo,
      mode: "cors",
      cache: "no-cache",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...getHeaders(),
      },
      redirect: "follow",
      referrerPolicy: "no-referrer",
      body: JSON.stringify(data),
      signal: options.signal,
    });

    if (response && typeof response.catch === "function") {
      response.catch((error) => {
        console.error("Error en ejecutarSP_SinEspera:", error);
      });
    }
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
    const response = await fetch(getUrlApiSp() + url, {
      method: metodo,
      mode: "cors",
      cache: "no-cache",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...getHeaders(),
      },
      redirect: "follow",
      referrerPolicy: "no-referrer",
      body: JSON.stringify(data),
      signal: options.signal,
    });
    estado = response.status;
    operacionOk = response.ok;
    if (response.ok) {
      const parsed = await parseJsonSafe(response);
      datos = parsed.data?.out?.Cursor;
      if (!parsed.ok) {
        operacionOk = false;
        errmsg = "La respuesta del servidor no tiene un formato válido";
      }
    } else {
      errmsg = "Error al intentar obtener el stream del archivo";
    }
  } catch (error) {
    if (isAbortError(error)) throw error;
    estado = 999;
    operacionOk = false;
    errmsg = "Error en la Red";
    datos = null;
  }
  return { estado, operacionOk, errmsg, datos };
}

export async function descargaTXT(url) {
  const urlDescargar = getUrlApi() + url;
  const response = await fetch(urlDescargar, {
    method: "GET",
    headers: {
      "Content-Type": "text/plain",
      ...getHeaders(),
    },
  });
  if (!response.ok) {
    return null;
  }
  const datos = await response.blob();
  return window.URL.createObjectURL(datos);
}
