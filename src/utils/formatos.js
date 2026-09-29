export function financial(x) {
  return x !== null ? Number.parseFloat(x).toFixed(2) : null
}

export const getVto = (vto) => {
  if (vto) {
    const d = vto.split('-')
    return `${d[1]}/${d[0]}`
  }
  return null
}

export const getFechaDMY = (vto) => {
  if (vto) {
    const d = vto.substring(0, 10).split('-')
    return `${d[2]}/${d[1]}/${d[0]}`
  }
  return null
}

export const getVtoActual = () => {
  const fecha = new Date()
  const mes = fecha.getMonth() + 1
  const anio = fecha.getFullYear()
  let resultado = mes + '/' + anio
  if (mes < 10) resultado = '0' + resultado
  return resultado
}

export const validaMMYYYY = (vto) => {
  if (vto.length < 6 || vto.length > 7) return 'Formato inválido'
  const d = vto.split('/')
  if (d.length < 2) return 'Formato inválido'
  if (d[0] < 1 || d[0] > 12) return 'Formato de Mes inválido'
  if (d[1] < 2020 || d[1] > 2060) return 'Formato de Año inválido'
  return null
}

export const getPeriodoFromMMYYYY = (periodo) => {
  const d = periodo.split('/')
  let fecha = '01/' + d[0] + '/' + d[1]
  return fecha
}

export const getFechaToAPIFromMMYYYY = (periodo) => {
  const d = periodo.split('/')
  let fecha = d[1] + '-' + d[0] + '-01' + 'T03:00:00.000Z'
  return fecha
}

export const getFechaToAPIFromDDMMYYYY = (fechaOrigen) => {
  const d = fechaOrigen.split('/')
  let fecha = d[2] + '-' + d[1] + '-' + d[0] + 'T03:00:00.000Z'
  return fecha
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
