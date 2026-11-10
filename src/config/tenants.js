import logoConcepcion from '@/assets/tenants/concepcion.png'
import logoBurru from '@/assets/tenants/burruyacu.png'
import logoTafi from '@/assets/tenants/tafiviejo.png'
import logoTrancas from '@/assets/tenants/trancas.png'
import logoDefault from '@/assets/logo.png'

export const API_URL_PROD = import.meta.env?.VITE_API_URL || import.meta.env?.VITE_API_URL_PROD || 'https://api-rpi.liqsysonline.com'
export const API_URL_DESA = import.meta.env?.VITE_API_URL_DESA || 'https://api-desa.liqsysonline.com'

export const DEFAULT_ENDPOINTS = {
  desa: {
    boletas: `${API_URL_DESA}/api`,
    base: API_URL_DESA,
    sp: `${API_URL_DESA}/api`
  },
  prod: {
    boletas: `${API_URL_PROD}/api`,
    base: API_URL_PROD,
    sp: `${API_URL_PROD}/api`
  }
}

export const TENANTS = [
  {
    id: 'concepcion',
    idrep: 300,
    cela: '0030',
    name: 'Municipalidad de Concepción',
    shortName: 'Concepción',
    location: 'Concepción - Tucumán',
    projectKey: 'concecpcion',
    projectPort: '3007',
    logo: logoConcepcion,
    boletaLogo: logoConcepcion,
    themeColor: '#1976D2',
    allowedReports: [4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    endpoints: { ...DEFAULT_ENDPOINTS }
  },
  {
    id: 'burruyacu',
    idrep: 470,
    cela: '0047',
    name: 'Municipalidad de Burruyacú',
    shortName: 'Burruyacú',
    location: 'Burruyacú - Tucumán',
    projectKey: 'Burru',
    projectPort: '3003',
    logo: logoBurru,
    boletaLogo: logoBurru,
    themeColor: '#2E7D32',
    allowedReports: [4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    endpoints: { ...DEFAULT_ENDPOINTS }
  },
  {
    id: 'tafiviejo',
    idrep: 400,
    cela: '0046',
    name: 'Municipalidad de Tafí Viejo',
    shortName: 'Tafí Viejo',
    location: 'Tafí Viejo - Tucumán',
    projectKey: 'tafiviejo',
    projectPort: '3007',
    logo: logoTafi,
    boletaLogo: logoTafi,
    themeColor: '#00838F',
    allowedReports: [4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    endpoints: { ...DEFAULT_ENDPOINTS }
  },
  {
    id: 'trancas',
    idrep: 500,
    cela: '0050',
    name: 'Municipalidad de Trancas',
    shortName: 'Trancas',
    location: 'Trancas - Tucumán',
    projectKey: 'ServerTrancas',
    projectPort: '3005',
    logo: logoTrancas,
    boletaLogo: logoTrancas,
    themeColor: '#6A1B9A',
    allowedReports: [1, 2, 4, 5],
    endpoints: { ...DEFAULT_ENDPOINTS }
  },
  {
    id: 'desarrollo',
    name: 'Desarrollo',
    shortName: 'Desarrollo',
    location: 'Servidor de Desarrollo / Testing',
    projectKey: 'desarrollo',
    projectPort: '3005',
    logo: logoDefault,
    boletaLogo: logoDefault,
    themeColor: '#7C4DFF',
    isDevelopment: true,
    allowedReports: [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    endpoints: { ...DEFAULT_ENDPOINTS }
  }
]

export const DEFAULT_TENANT_ID = 'concepcion'

export function getTenantById(id) {
  return TENANTS.find((t) => t.id === id) || TENANTS[0]
}

/**
 * Resuelve automáticamente el municipio predeterminado a partir del objeto
 * devuelto por la vista `view/configServer` de Oracle (campos: IdRep, Cela, Descripcion, Ambiente).
 *
 * @param {Record<string, any>} config
 * @returns {typeof TENANTS[0] | null}
 */
export function resolveTenantFromConfig(config) {
  if (!config || typeof config !== 'object') return null

  const idRep = Number(config.IDREP || config.IdRep)
  const cela = String(config.CELA || config.Cela || '').trim()
  const descripcion = String(
    config.DESCRIPCION || config.Descripcion || config.AMBIENTE || config.Ambiente || ''
  ).toLowerCase().trim()

  // 1. Coincidencia por IDREP exacto
  if (idRep) {
    const byRep = TENANTS.find((t) => t.idrep === idRep)
    if (byRep) return byRep
  }

  // 2. Coincidencia por CELA exacto
  if (cela) {
    const byCela = TENANTS.find((t) => t.cela && t.cela === cela)
    if (byCela) return byCela
  }

  // 3. Coincidencia semántica por DESCRIPCION / Nombre
  if (descripcion) {
    if (descripcion.includes('tafi') || descripcion.includes('tafí')) {
      return TENANTS.find((t) => t.id === 'tafiviejo') || null
    }
    if (descripcion.includes('concep')) {
      return TENANTS.find((t) => t.id === 'concepcion') || null
    }
    if (descripcion.includes('burru')) {
      return TENANTS.find((t) => t.id === 'burruyacu') || null
    }
    if (descripcion.includes('tranca')) {
      return TENANTS.find((t) => t.id === 'trancas') || null
    }
  }

  return null
}
