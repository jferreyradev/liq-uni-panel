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
 *   ejecutarSP_SinEspera / descargaTXT / descargaArchivo / descargaBuffer
 *
 * La política de negocio (por ejemplo, que un 404 en un listado no es un
 * error fatal) vive acá; el transporte vive en httpClient.
 *
 * Esta es la superficie pública de la capa HTTP: los módulos hablan con esta
 * fachada y nunca con el transporte crudo (lo verifica el guard arquitectónico).
 * No todas las funciones tienen un consumidor hoy (`eliminarRegistro` y
 * `ejecutarSPStream` completan el par CRUD y la variante en streaming), pero
 * son parte del contrato de la capa: si una función nueva no entra acá, no
 * entra.
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

export const FALLBACK_VIEW_MAP = {
  'view/conceptoLiq': 'conceptoLiq',
  'view/resumenLiq': 'view/resumenliq',
  'view/archivoAcred': 'view/acredBco',
  'view/detalleAcred': 'view/acredBancoDet',
  'view/resumenAcred': 'view/resumenAcredBco',
};

/**
 * Lee un listado.
 *
 * Acepta tanto una ruta relativa a /api/ ("view/cargo") como una URL absoluta
 * ("https://host/api/view/cargo"), que es lo que necesitan los composables que
 * arman la URL por su cuenta.
 *
 * @param {string} url ruta relativa a /api/ o URL absoluta
 * @param {{signal?: AbortSignal, timeout?: number, headers?: Object, query?: Object, method?: string, body?: *, _isFallback?: boolean}} [options]
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

  const cleanPath = String(url ?? '').replace(/^\/+/, '');
  if (res.notFound && FALLBACK_VIEW_MAP[cleanPath] && !options._isFallback) {
    const fallbackRes = await leerDatos(FALLBACK_VIEW_MAP[cleanPath], {
      ...options,
      _isFallback: true
    });
    if (fallbackRes.operacionOk && !fallbackRes.notFound) {
      return fallbackRes;
    }
  }

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
 * Actualiza un registro en la tabla CARGOS mediante la API REST (PUT /api/cargo).
 * Soporta tanto la nomenclatura de parámetros de SP (vIDCARGO, vIDREP, vORDEN, etc.)
 * como la nomenclatura de entidad/vista (Id, ReparticionId, Orden, etc.).
 *
 * @param {Object} cargoData
 * @returns {Promise<{estado: number, operacionOk: boolean, valorError: number, valorSalida: number, errmsg: string, datos: any, out: Object}>}
 */
export async function actualizarCargo(cargoData = {}) {
  const cargoId = Number(
    cargoData.Id ?? cargoData.ID ?? cargoData.idcargo ?? cargoData.IdCargo ?? cargoData.vIDCARGO ?? 0
  );
  if (!cargoId) {
    return {
      estado: 400,
      operacionOk: false,
      valorError: -1,
      valorSalida: 0,
      errmsg: "No se pudo identificar el ID del cargo a actualizar",
      datos: null,
      out: {
        vError: -1,
        vErrorMsg: "No se pudo identificar el ID del cargo a actualizar",
        vSalida: 0,
      },
    };
  }

  const rep = cargoData.ReparticionId ?? cargoData.REPARTICIONID ?? cargoData.vIDREP;
  const ord = cargoData.Orden ?? cargoData.ORDEN ?? cargoData.vORDEN;
  const af = cargoData.Afiliado ?? cargoData.AFILIADO ?? cargoData.vAFILIADO;
  const ant = cargoData.Antiguedad ?? cargoData.ANTIGUEDAD ?? cargoData.vANTIG;
  const vtoEsc = cargoData.VtoEscalafon ?? cargoData.vVTOESC;
  const te = cargoData.TipoEmpleoId ?? cargoData.TIPOEMPLEOID ?? cargoData.vIDTE;
  const sr = cargoData.SituacionRevistaId ?? cargoData.SITUACIONREVISTAID ?? cargoData.vIDSITREV;
  const cat = cargoData.Categoria ?? cargoData.CATEGORIA ?? cargoData.vCATEGORIA;
  const os = cargoData.TipoObraSocialId ?? cargoData.TIPOOBRASOCIALID ?? cargoData.vIDTIPOOS;
  const tl = cargoData.TipoLiquidacionId ?? cargoData.TIPOLIQUIDACIONID ?? cargoData.vIDTIPOLIQ;
  const ec = cargoData.EstadoCargoId ?? cargoData.ESTADOCARGOID ?? cargoData.vIDESTADOCARGO;
  const fb = cargoData.FechaBaja ?? cargoData.FECHABAJA ?? cargoData.vFECHABAJA;
  const sal = cargoData.Salario ?? cargoData.SALARIO;

  const putBody = {
    Id: cargoId,
    ...(rep !== undefined && rep !== null ? { ReparticionId: Number(rep) } : {}),
    ...(ord !== undefined && ord !== null ? { Orden: Number(ord) } : {}),
    ...(af !== undefined && af !== null ? { Afiliado: Number(af) } : {}),
    ...(ant !== undefined && ant !== null ? { Antiguedad: Number(ant) } : {}),
    ...(vtoEsc !== undefined ? { VtoEscalafon: vtoEsc || null } : {}),
    ...(te !== undefined && te !== null ? { TipoEmpleoId: Number(te) } : {}),
    ...(sr !== undefined && sr !== null ? { SituacionRevistaId: Number(sr) } : {}),
    ...(cat !== undefined && cat !== null ? { Categoria: Number(cat) } : {}),
    ...(os !== undefined && os !== null ? { TipoObraSocialId: Number(os) } : {}),
    ...(tl !== undefined && tl !== null ? { TipoLiquidacionId: Number(tl) } : {}),
    ...(ec !== undefined && ec !== null ? { EstadoCargoId: Number(ec) } : {}),
    ...(fb !== undefined ? { FechaBaja: fb || null } : {}),
    ...(sal !== undefined && sal !== null ? { Salario: Number(sal) } : {}),
  };

  const res = await grabarRegistro("cargo", putBody, "PUT");
  const esOk = res.operacionOk && res.estado >= 200 && res.estado < 300;
  return {
    estado: res.estado,
    operacionOk: esOk,
    valorError: esOk ? 0 : -1,
    valorSalida: cargoId,
    errmsg: esOk ? "" : (res.errmsg || "Error al actualizar el cargo"),
    datos: res.datos,
    out: {
      vError: esOk ? 0 : -1,
      vErrorMsg: esOk ? "" : (res.errmsg || "Error al actualizar el cargo"),
      vSalida: cargoId,
    },
  };
}

/**
 * Actualiza un registro en la tabla PERSONAS mediante la API REST (PUT /api/persona).
 * Se utiliza como fallback resiliente cuando el Stored Procedure `sp/persUpd` falla en Oracle
 * (por ejemplo si el paquete PKG_PERSONAS.SPU_PERSONA no está declarado o compilado en la BD).
 *
 * @param {Object} personaData
 * @returns {Promise<{estado: number, operacionOk: boolean, valorError: number, valorSalida: number, errmsg: string, datos: any, out: Object}>}
 */
export async function actualizarPersona(personaData = {}) {
  const persId = Number(
    personaData.Id ?? personaData.ID ?? personaData.vIDPERS ?? personaData.IdPersona ?? 0
  );
  if (!persId) {
    return {
      estado: 400,
      operacionOk: false,
      valorError: -1,
      valorSalida: 0,
      errmsg: "No se pudo identificar el ID de la persona a actualizar",
      datos: null,
      out: {
        vError: -1,
        vErrorMsg: "No se pudo identificar el ID de la persona a actualizar",
        vSalida: 0,
      },
    };
  }

  const putBody = {
    Id: persId,
    ...(personaData.vDNI !== undefined || personaData.Documento !== undefined
      ? { Documento: personaData.Documento ?? personaData.DOCUMENTO ?? personaData.vDNI }
      : {}),
    ...(personaData.vAPELLIDO !== undefined || personaData.Apellido !== undefined
      ? { Apellido: personaData.Apellido ?? personaData.APELLIDO ?? personaData.vAPELLIDO }
      : {}),
    ...(personaData.vNOMBRE !== undefined || personaData.Nombre !== undefined
      ? { Nombre: personaData.Nombre ?? personaData.NOMBRE ?? personaData.vNOMBRE }
      : {}),
    ...(personaData.vCUIL !== undefined || personaData.Cuil !== undefined
      ? { Cuil: personaData.Cuil ?? personaData.CUIL ?? personaData.vCUIL }
      : {}),
    ...(personaData.vSEXO !== undefined || personaData.Sexo !== undefined
      ? { Sexo: personaData.Sexo ?? personaData.SEXO ?? personaData.vSEXO }
      : {}),
    ...(personaData.vFECHANAC !== undefined || personaData.FechaNacimiento !== undefined
      ? { FechaNacimiento: personaData.FechaNacimiento ?? personaData.FECHANACIMIENTO ?? personaData.vFECHANAC }
      : {}),
    ...(personaData.vFECHAINGRESO !== undefined || personaData.FechaIngreso !== undefined
      ? { FechaIngreso: personaData.FechaIngreso ?? personaData.FECHAINGRESO ?? personaData.vFECHAINGRESO }
      : {}),
    ...(personaData.vDOMICILIO !== undefined || personaData.DomicilioCalle !== undefined
      ? { DomicilioCalle: personaData.DomicilioCalle ?? personaData.DOMICILIOCALLE ?? personaData.vDOMICILIO }
      : {}),
    ...(personaData.vNRO !== undefined || personaData.DomicilioNumero !== undefined
      ? { DomicilioNumero: personaData.DomicilioNumero ?? personaData.DOMICILIONUMERO ?? personaData.vNRO }
      : {}),
    ...(personaData.vPISO !== undefined || personaData.Piso !== undefined
      ? { Piso: personaData.Piso ?? personaData.PISO ?? personaData.vPISO }
      : {}),
    ...(personaData.vDPTO !== undefined || personaData.Departamento !== undefined
      ? { Departamento: personaData.Departamento ?? personaData.DEPARTAMENTO ?? personaData.vDPTO }
      : {}),
    ...(personaData.vTELEFONO !== undefined || personaData.Telefono !== undefined
      ? { Telefono: personaData.Telefono ?? personaData.TELEFONO ?? personaData.vTELEFONO }
      : {}),
    ...(personaData.vEMAIL !== undefined || personaData.Email !== undefined
      ? { Email: personaData.Email ?? personaData.EMAIL ?? personaData.vEMAIL }
      : {}),
    ...(personaData.vIDTIPODOC !== undefined || personaData.TipoDocumentoId !== undefined
      ? { TipoDocumentoId: personaData.TipoDocumentoId ?? personaData.TIPODOCUMENTOID ?? personaData.vIDTIPODOC }
      : {}),
    ...(personaData.vIDESTCIVIL !== undefined || personaData.EstadoCivilId !== undefined
      ? { EstadoCivilId: personaData.EstadoCivilId ?? personaData.ESTADOCIVILID ?? personaData.vIDESTCIVIL }
      : {}),
    ...(personaData.vLOCALIDAD_ID !== undefined || personaData.LocalidadId !== undefined
      ? { LocalidadId: personaData.LocalidadId ?? personaData.LOCALIDADID ?? personaData.vLOCALIDAD_ID }
      : {}),
    ...(personaData.vCBU !== undefined || personaData.CBU !== undefined
      ? { CBU: personaData.CBU ?? personaData.vCBU }
      : {}),
    ...(personaData.vCUENTA !== undefined || personaData.Cuenta !== undefined
      ? { Cuenta: personaData.Cuenta ?? personaData.CUENTA ?? personaData.vCUENTA }
      : {}),
  };

  const res = await grabarRegistro("persona", putBody, "PUT");
  const esOk = res.operacionOk && res.estado >= 200 && res.estado < 300;
  return {
    estado: res.estado,
    operacionOk: esOk,
    valorError: esOk ? 0 : -1,
    valorSalida: persId,
    errmsg: esOk ? "" : (res.errmsg || "Error al actualizar la persona"),
    datos: res.datos,
    out: {
      vError: esOk ? 0 : -1,
      vErrorMsg: esOk ? "" : (res.errmsg || "Error al actualizar la persona"),
      vSalida: persId,
    },
  };
}

/**
 * Procesa la creación, modificación o eliminación de un registro de novedades de haberes
 * a través de la API REST (/api/novhaberes).
 * Esto permite que componentes como NovHaberesList sigan el contrato arquitectónico
 * de invocar `useSpGrabar` / `ejecutarSP('sp/NovHaberes...')` sin provocar un error 404
 * dado que el backend expone el recurso REST `novhaberes` y no Stored Procedures.
 *
 * @param {Object} data
 * @param {"PUT" | "POST" | "DELETE"} accion
 * @returns {Promise<{estado: number, operacionOk: boolean, valorError: number, valorSalida: number, errmsg: string, errorMsg: string, datos: any, out: Object}>}
 */
export async function actualizarNovHaberes(data = {}, accion = "PUT") {
  const id = Number(
    data.Id ?? data.ID ?? data.vIDNOVHAB ?? data.vIDNOVHABER ?? data.id ?? 0
  );

  let res;
  let errorFallbackMsg = "Error al procesar la novedad de haberes";

  if (accion === "DELETE") {
    errorFallbackMsg = "Error al eliminar la novedad de haberes";
    const path = id ? `novhaberes?Id=${id}` : "novhaberes";
    res = await eliminarRegistro(path, "DELETE");
  } else if (accion === "POST") {
    errorFallbackMsg = "Error al crear la novedad de haberes";
    res = await grabarRegistro("novhaberes", data, "POST");
  } else {
    errorFallbackMsg = "Error al actualizar la novedad de haberes";
    const path = id ? `novhaberes?Id=${id}` : "novhaberes";
    res = await grabarRegistro(path, data, "PUT");
  }

  const esOk = res.operacionOk && res.estado >= 200 && res.estado < 300;
  const salida = id || Number(res.datos?.Id ?? res.datos?.ID ?? 0);
  const errMsg = esOk ? "" : (res.errmsg || errorFallbackMsg);

  return {
    estado: res.estado,
    operacionOk: esOk,
    valorError: esOk ? 0 : -1,
    valorSalida: salida,
    errmsg: errMsg,
    errorMsg: errMsg,
    datos: res.datos,
    out: {
      vError: esOk ? 0 : -1,
      vErrorMsg: errMsg,
      vSalida: salida,
    },
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
  const cleanUrl = String(url || "").replace(/^sp\//, "");
  if (cleanUrl === "cargos_spuCargo") {
    return actualizarCargo(data);
  }
  const cleanLower = cleanUrl.toLowerCase();
  if (cleanLower === "novhaberesupd") {
    return actualizarNovHaberes(data, "PUT");
  }
  if (cleanLower === "novhaberesins") {
    return actualizarNovHaberes(data, "POST");
  }
  if (cleanLower === "novhaberesdel") {
    return actualizarNovHaberes(data, "DELETE");
  }

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
          (typeof payload.error === "string" && payload.error.trim() !== "0" && payload.error.toLowerCase() !== "ok" ? payload.error : "") ||
          "";
        if (typeof errorMsg === "string") {
          const trimmed = errorMsg.trim();
          if (trimmed === "0" || trimmed.toLowerCase() === "ok") {
            errorMsg = "";
          }
        }
        out = datos && datos.out ? datos.out : payload;
      } else {
        valorError = 0;
        out = datos;
      }
    } else {
      errmsg = res.errmsg || "Error al intentar ejecutar el proceso";
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

  // Fallback: si el SP de personas falló en Oracle (ej: PKG_PERSONAS no declarado), intentar PUT /api/persona
  const mensajeFallo = String(errorMsg || errmsg || "").toLowerCase();
  const esFalloPkgPersonas =
    !operacionOk ||
    valorError !== 0 ||
    mensajeFallo.includes("pkg_personas") ||
    mensajeFallo.includes("pls-00201");

  if (cleanUrl === "persUpd" && esFalloPkgPersonas) {
    const fallbackRes = await actualizarPersona(data);
    if (fallbackRes.operacionOk) {
      return fallbackRes;
    }
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
