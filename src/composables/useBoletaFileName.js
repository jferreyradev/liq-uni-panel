const FALLBACK_APELLIDO = 'SIN_APELLIDO'
const FALLBACK_NOMBRE = 'SIN_NOMBRE'
const FALLBACK_PERIODO = '000000'
const FALLBACK_TIPO = 'GEN'

/**
 * Elimina tildes, convierte a mayúsculas, reemplaza espacios por guiones bajos
 * y descarta caracteres que no sean alfanuméricos o guiones bajos.
 */
export function normalizeName(value, fallback = '') {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    return fallback
  }

  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[-\s]+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
    .replace(/^_+|_+$/g, '')
}

/**
 * Devuelve el código de tipo de liquidación según la descripción.
 * No utiliza 1SAC ni 2SAC; el único código válido para SAC es SAC.
 */
export function getTipoCodigo(tipoDescripcion) {
  if (!tipoDescripcion) {
    return FALLBACK_TIPO
  }

  const normalized = String(tipoDescripcion)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (normalized.includes('MENSUAL')) {
    return 'MEN'
  }

  if (normalized.includes('ADICIONAL')) {
    return 'ADI'
  }

  if (normalized.includes('SAC') || normalized.includes('SUELDO ANUAL')) {
    return 'SAC'
  }

  return FALLBACK_TIPO
}

/**
 * Convierte un período en formato YYYY-MM a MMYYYY.
 */
export function formatPeriodo(periodo) {
  if (!periodo) {
    return FALLBACK_PERIODO
  }

  const [year, month] = String(periodo).split('-')

  if (!year || !month || year.length !== 4 || isNaN(Number(year)) || isNaN(Number(month))) {
    return FALLBACK_PERIODO
  }

  return `${month.padStart(2, '0')}${year}`
}

/**
 * Determina si un nombre de archivo proveniente del backend es genérico
 * y debe ser ignorado (por ejemplo: BOLETA, BOLETA_ID, BOLETA_ID.pdf).
 */
export function isGenericFileName(fileName) {
  if (!fileName) {
    return true
  }

  const normalized = String(fileName)
    .toUpperCase()
    .replace(/\.PDF$/i, '')
    .trim()

  return normalized === '' || normalized === 'BOLETA' || normalized.startsWith('BOLETA_')
}

/**
 * Extrae el nombre de archivo de un header Content-Disposition.
 */
export function extractFileName(contentDisposition) {
  if (!contentDisposition) {
    return null
  }

  const match = contentDisposition.match(/filename\*?=(?:UTF-8''|["'])?([^"';]+)/i)

  if (!match) {
    return null
  }

  return decodeURIComponent(match[1].replace(/["']/g, ''))
}

/**
 * Genera el nombre de archivo para una boleta en formato:
 * MMYYYY_TIPO_APELLIDO_NOMBRE.pdf
 */
export function generateBoletaFileName(boleta) {
  const mmYYYY = formatPeriodo(boleta?.PERIODO)
  const tipo = getTipoCodigo(boleta?.TIPOLIQUIDACIONDESCRIPCION)
  const apellido = normalizeName(boleta?.APELLIDO, FALLBACK_APELLIDO)
  const nombre = normalizeName(boleta?.NOMBRE, FALLBACK_NOMBRE)

  return `${mmYYYY}_${tipo}_${apellido}_${nombre}.pdf`
}
