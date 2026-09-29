/**
 * Normaliza un texto para usarlo en nombres de archivo.
 * - Convierte a mayúsculas.
 * - Elimina tildes y caracteres especiales.
 * - Reemplaza espacios por guiones bajos.
 * - Devuelve un valor fallback si el resultado queda vacío.
 */
export function normalizarNombre(texto, fallback = 'SIN_NOMBRE') {
  if (!texto || typeof texto !== 'string') {
    return fallback
  }

  const limpio = texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')

  return limpio || fallback
}

/**
 * Devuelve el código de tipo de liquidación para el nombre de archivo.
 * Mapea descripciones del backend a: MEN, ADI, SAC o GEN (fallback).
 * Nunca devuelve 1SAC ni 2SAC; cualquier variante de SAC se normaliza a SAC.
 */
export function getCodigoTipoLiquidacion(descripcion) {
  if (!descripcion) {
    return 'GEN'
  }

  const desc = String(descripcion)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()

  // Cualquier variante de SAC (incluidas 1SAC, 2SAC, etc.) se normaliza a SAC.
  if (desc.includes('SAC') || desc.includes('SUELDO ANUAL COMPLEMENTARIO')) {
    return 'SAC'
  }

  if (desc.includes('MENSUAL')) {
    return 'MEN'
  }

  if (desc.includes('ADICIONAL')) {
    return 'ADI'
  }

  return 'GEN'
}

/**
 * Convierte un período en formato YYYY-MM o YYYY/M a MMYYYY.
 */
export function formatearPeriodo(periodo) {
  if (!periodo) {
    return '000000'
  }

  const match = String(periodo).match(/(\d{4})[-/](\d{1,2})/)
  if (match) {
    const anio = match[1]
    const mes = match[2].padStart(2, '0')
    return `${mes}${anio}`
  }

  return '000000'
}

/**
 * Genera el nombre de archivo para la descarga de una boleta en PDF.
 * Formato: MMYYYY_TIPO_APELLIDO_NOMBRE.pdf
 */
export function generarNombreBoleta(periodo, tipoLiquidacionDescripcion, apellido, nombre) {
  const mmYYYY = formatearPeriodo(periodo)
  const tipo = getCodigoTipoLiquidacion(tipoLiquidacionDescripcion)
  const apellidoNorm = normalizarNombre(apellido, 'SIN_APELLIDO')
  const nombreNorm = normalizarNombre(nombre, 'SIN_NOMBRE')

  return `${mmYYYY}_${tipo}_${apellidoNorm}_${nombreNorm}.pdf`
}
