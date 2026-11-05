import logoConcepcion from '@/assets/tenants/concepcion.png'
import logoBurru from '@/assets/tenants/burruyacu.png'
import logoTafi from '@/assets/tenants/tafiviejo.png'
import logoTrancas from '@/assets/tenants/trancas.png'
import logoDefault from '@/assets/logo.png'

export const API_URL_PROD = 'https://api-rpi.liqsysonline.com'
export const API_URL_DESA = 'https://api-desa.liqsysonline.com'

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
