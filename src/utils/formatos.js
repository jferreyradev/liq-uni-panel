export function financial(x) {
  return x !== null ? Number.parseFloat(x).toFixed(2) : null
}

export const getVto = (vto) => {
  if (vto) {
    const d = vto.split('-')
    if (d.length >= 2) {
      const month = String(d[1]).padStart(2, '0')
      const year = d[0]
      return `${month}/${year}`
    }
    return vto
  }
  return null
}

export const getFechaDMY = (vto) => {
  if (vto) {
    const d = vto.substring(0, 10).split('-')
    if (d.length === 3) {
      const day = String(d[2]).padStart(2, '0')
      const month = String(d[1]).padStart(2, '0')
      const year = d[0]
      return `${day}/${month}/${year}`
    }
    return vto
  }
  return null
}

export const getVtoActual = () => {
  const fecha = new Date()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const anio = fecha.getFullYear()
  return `${mes}/${anio}`
}

export const validaMMYYYY = (vto) => {
  if (!vto) return 'Formato inválido'
  const d = vto.split('/')
  if (d.length !== 2) return 'Formato inválido'
  const m = Number(d[0])
  const y = Number(d[1])
  if (isNaN(m) || m < 1 || m > 12) return 'Formato de Mes inválido'
  if (isNaN(y) || y < 2020 || y > 2060) return 'Formato de Año inválido'
  return null
}

export const normalizePeriodoDMY = (periodo) => {
  if (!periodo) return ''
  const str = String(periodo).trim()
  if (!str) return ''

  // Formato con guiones (YYYY-MM o YYYY-MM-DD o ISO)
  if (str.includes('-')) {
    const cleanStr = str.split('T')[0]
    const parts = cleanStr.split('-')
    if (parts.length >= 2) {
      const year = parts[0]
      const month = String(parts[1]).padStart(2, '0')
      return `01/${month}/${year}`
    }
  }

  // Formato con barras (MM/YYYY, M/YYYY, DD/MM/YYYY, D/M/YYYY)
  if (str.includes('/')) {
    const parts = str.split('/')
    if (parts.length === 2) {
      const month = String(parts[0]).padStart(2, '0')
      const year = parts[1]
      return `01/${month}/${year}`
    }
    if (parts.length === 3) {
      const day = String(parts[0]).padStart(2, '0')
      const month = String(parts[1]).padStart(2, '0')
      const year = parts[2]
      return `${day}/${month}/${year}`
    }
  }

  return str
}

export const getPeriodoFromMMYYYY = (periodo) => {
  if (!periodo) return ''
  const normalized = normalizePeriodoDMY(periodo)
  const parts = normalized.split('/')
  if (parts.length === 3) {
    const month = String(parts[1]).padStart(2, '0')
    const year = parts[2]
    return `01/${month}/${year}`
  }
  return normalized
}

export const getFechaToAPIFromMMYYYY = (periodo) => {
  if (!periodo) return ''
  const dmy = getPeriodoFromMMYYYY(periodo)
  const parts = dmy.split('/')
  if (parts.length === 3) {
    const month = String(parts[1]).padStart(2, '0')
    const year = parts[2]
    return `${year}-${month}-01T03:00:00.000Z`
  }
  return ''
}

export const getFechaToAPIFromDDMMYYYY = (fechaOrigen) => {
  if (!fechaOrigen) return ''
  const str = String(fechaOrigen).trim()
  const sep = str.includes('/') ? '/' : str.includes('-') ? '-' : ''
  if (!sep) return ''
  const parts = str.split(sep)
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      const year = parts[0]
      const month = String(parts[1]).padStart(2, '0')
      const day = String(parts[2]).padStart(2, '0')
      return `${year}-${month}-${day}T03:00:00.000Z`
    }
    const day = String(parts[0]).padStart(2, '0')
    const month = String(parts[1]).padStart(2, '0')
    const year = parts[2]
    return `${year}-${month}-${day}T03:00:00.000Z`
  }
  return ''
}

export const getTipoDescripcion = (id, descripcion, forma = 1) => {
  if (forma === 1) return '(' + id + ') ' + descripcion
  if (forma === 2) return id + ' - ' + descripcion
  return id
}

export const getDecimalToAPI = (valor) => {
  let nuevoValor = valor
  if (valor !== null) {
    if (typeof valor === 'string') {
      let valorFormateado = valor.replace(',', '.')
      nuevoValor = Number(valorFormateado)
    }
  }

  return nuevoValor
}

export const normalizeBoletaName = (value) => {
  if (!value) return ''
  return value
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Ñ/g, 'N')
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

export const getBoletaPdfFileName = ({ periodo, tipoLiquidacion, apellido, nombre }) => {
  let mmYYYY = ''
  if (periodo) {
    const d = periodo.split('-')
    if (d.length >= 2) {
      mmYYYY = `${d[1]}${d[0]}`
    }
  }

  const tipoUpper = (tipoLiquidacion || '').toUpperCase()
  let tipo = 'GEN'
  if (tipoUpper.includes('MENS')) {
    tipo = 'MEN'
  } else if (tipoUpper.includes('ADIC')) {
    tipo = 'ADI'
  } else if (tipoUpper.includes('SAC') || tipoUpper.includes('COMPLEMENTARIO')) {
    tipo = 'SAC'
  }

  const apellidoNorm = normalizeBoletaName(apellido) || 'SIN_APELLIDO'
  const nombreNorm = normalizeBoletaName(nombre) || 'SIN_NOMBRE'

  return `${mmYYYY}_${tipo}_${apellidoNorm}_${nombreNorm}.pdf`
}
