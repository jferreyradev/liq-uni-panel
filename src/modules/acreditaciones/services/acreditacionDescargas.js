import { utils, writeFileXLSX } from "xlsx";
import { leerDatos, descargaArchivo } from "@/shared/services/apiService";
import { agregaTitulosExcel } from "@/utils/reportes.js";
import { descargarDesdeBlob, descargarDesdeUrl } from "@/utils/descargas";

export const getVto = (vto) => {
  if (vto) {
    const d = vto.split("-");
    if (d.length >= 2) {
      return `${d[1]}/${d[0]}`;
    }
    return vto;
  }
  return "-";
};

export const getPeriodo = (per) => {
  if (per) {
    const p = per.split("-");
    if (p.length >= 2) {
      return `${p[0].trim()}_${p[1].trim()}`;
    }
    return per.trim();
  }
  return null;
};

/**
 * Genera el nombre del archivo bancario TXT según régimen Ley (1) o Efe (0).
 * @param {Object} store
 * @returns {string}
 */
export function generarNombreArchivoAcred(store) {
  const modo = Number(store.ley) === 1 ? "Ley" : "Efe";
  const periodo = store.liqCompactString || "Periodo";
  return `${periodo}_Acred_${modo}.txt`;
}

/**
 * Genera el nombre del archivo Excel de Resumen de Acreditaciones.
 * @param {Object} store
 * @returns {string}
 */
export function generarNombreResumenExcel(store) {
  const modo = Number(store.ley) === 1 ? "Ley" : "Efe";
  const periodo = store.liqCompactString || "Periodo";
  return `${periodo}_ResAcred_${modo}.xlsx`;
}

/**
 * Genera el nombre del archivo Excel de Detalle de Acreditaciones.
 * @param {Object} store
 * @returns {string}
 */
export function generarNombreDetalleExcel(store) {
  const modo = Number(store.ley) === 1 ? "Ley" : "Efe";
  const periodo = store.liqCompactString || "Periodo";
  return `${periodo}_DetAcred_${modo}.xlsx`;
}

/**
 * Descarga el archivo Excel de Resumen de Acreditaciones.
 * @param {Object} store - Store de filtros
 * @returns {Promise<string>} Nombre del archivo descargado
 */
export async function descargarResumenExcel(store) {
  const queryStr = store.filterStringLey;
  const { datos, operacionOk, errmsg } = await leerDatos(`view/resumenAcred?${queryStr}`);
  if (!operacionOk || !Array.isArray(datos) || datos.length === 0) {
    throw new Error(errmsg || "No hay datos de resumen de acreditaciones para el período seleccionado.");
  }

  const filas = datos.map((x) => [
    getVto(x.PERIODO),
    getVto(x.FECHADEV),
    x.IMPORTE,
    x.CANTIDAD,
    x.BLOQ,
    x.ESLEY,
  ]);

  const titulosTabla = [
    "Periodo",
    "Fecha dev",
    "Importe",
    "Cantidad",
    "Bloqueo",
    "Es Ley",
  ];
  const filtros = store.liqString;
  const tituloReporte = "Resumen Acreditaciones";
  agregaTitulosExcel(filas, tituloReporte, filtros, titulosTabla);

  const ws = utils.aoa_to_sheet(filas);
  ws["!cols"] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 10 },
    { wch: 10 },
    { wch: 25 },
    { wch: 15 },
  ];

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");

  const nombreArchivo = generarNombreResumenExcel(store);
  writeFileXLSX(wb, nombreArchivo, { compression: true });
  return nombreArchivo;
}

/**
 * Descarga el archivo Excel de Detalle de Acreditaciones.
 * @param {Object} store - Store de filtros
 * @returns {Promise<string>} Nombre del archivo descargado
 */
export async function descargarDetalleExcel(store) {
  const queryStr = store.filterStringLey;
  const { datos, operacionOk, errmsg } = await leerDatos(`view/detalleAcred?${queryStr}`);
  if (!operacionOk || !Array.isArray(datos) || datos.length === 0) {
    throw new Error(errmsg || "No hay datos de detalle de acreditaciones para el período seleccionado.");
  }

  const filas = datos.map((x) => [
    x.GRUPOADICIONALID,
    getVto(x.PERIODO),
    getVto(x.FECHADEV),
    x.LIQUIDACIONID,
    x.DOCUMENTO,
    x.APELLIDO,
    x.NOMBRE,
    x.REPARTICIONID,
    x.ORDEN,
    x.AFILIADO,
    x.CUIL,
    x.CBU,
    x.HABERES,
    x.RETENCIONES,
    x.NETO,
    x.UNIORG,
    x.BLOQ,
    x.ESLEY,
  ]);

  const titulosTabla = [
    "Grupo Adicional",
    "Periodo",
    "Fecha dev",
    "Liquidacion Id",
    "Documento",
    "Apellido",
    "Nombre",
    "Reparticion",
    "Orden",
    "Afiliado",
    "CUIL",
    "CBU",
    "Haberes",
    "Retenciones",
    "Neto",
    "Uni Org",
    "Bloqueo",
    "Es Ley",
  ];
  const filtros = store.liqString;
  const tituloReporte = "Detalle Acreditaciones";
  agregaTitulosExcel(filas, tituloReporte, filtros, titulosTabla);

  const ws = utils.aoa_to_sheet(filas);
  ws["!cols"] = [
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
    { wch: 10 },
    { wch: 15 },
    { wch: 20 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 25 },
    { wch: 25 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 10 },
    { wch: 10 },
  ];

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");

  const nombreArchivo = generarNombreDetalleExcel(store);
  writeFileXLSX(wb, nombreArchivo, { compression: true });
  return nombreArchivo;
}

/**
 * Descarga el archivo bancario en formato TXT.
 * @param {Object} store - Store de filtros
 * @param {string} apiBase - URL base de la API
 * @param {Function} [getHeadersFn] - Función de encabezados
 * @returns {Promise<string>} Nombre del archivo descargado
 */
export async function descargarArchivoBancoTxt(store, apiBase, getHeadersFn) {
  const queryStr = store.filterStringLey;
  const headers = getHeadersFn ? getHeadersFn() : {};
  const urlTxt = `${apiBase}/api/txt/archivoAcred?${queryStr}`;
  const nombreArchivo = generarNombreArchivoAcred(store);

  // 1. Intentar descarga de archivo directa via endpoint txt
  const res = await descargaArchivo(urlTxt, {
    headers: {
      ...headers,
      "Content-Type": "text/plain",
    },
  });

  if (res.operacionOk && res.url) {
    descargarDesdeUrl(res.url, nombreArchivo);
    return nombreArchivo;
  }

  // 2. Fallback: consultar view/archivoAcred y ensamblar el Blob
  const { datos, operacionOk, errmsg } = await leerDatos(`view/archivoAcred?${queryStr}`);
  if (!operacionOk || !Array.isArray(datos) || datos.length === 0) {
    throw new Error(errmsg || "No hay registros para generar el archivo bancario TXT en el período seleccionado.");
  }

  let largeString = "";
  for (let index = 0; index < datos.length; index++) {
    const element = datos[index];
    largeString += (element.CADENA || element.cadena || "") + "\r\n";
  }
  const blob = new Blob([largeString], { type: "text/plain;charset=utf-8" });
  descargarDesdeBlob(blob, nombreArchivo);
  return nombreArchivo;
}

/**
 * Descarga los 3 archivos consecutivamente (Resumen, Detalle y TXT).
 * @param {Object} store
 * @param {string} apiBase
 * @param {Function} [getHeadersFn]
 * @returns {Promise<string[]>} Lista de archivos descargados con éxito
 */
export async function descargarTodosArchivos(store, apiBase, getHeadersFn) {
  const resultados = [];
  const errores = [];

  try {
    const res = await descargarResumenExcel(store);
    resultados.push(res);
  } catch (err) {
    errores.push(`Resumen: ${err.message || err}`);
  }

  await new Promise((resolve) => setTimeout(resolve, 350));

  try {
    const det = await descargarDetalleExcel(store);
    resultados.push(det);
  } catch (err) {
    errores.push(`Detalle: ${err.message || err}`);
  }

  await new Promise((resolve) => setTimeout(resolve, 350));

  try {
    const txt = await descargarArchivoBancoTxt(store, apiBase, getHeadersFn);
    resultados.push(txt);
  } catch (err) {
    errores.push(`Archivo TXT: ${err.message || err}`);
  }

  if (resultados.length === 0) {
    throw new Error(`No se pudo descargar ningún archivo. ${errores.join(" | ")}`);
  }

  return resultados;
}
