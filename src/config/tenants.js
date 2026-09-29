import logoBurru from '@/assets/tenants/burruyacu.png'
import logoTafi from '@/assets/tenants/tafiviejo.png'
import logoTrancas from '@/assets/tenants/trancas.png'
import logoDefault from '@/assets/logo.png'

export const DEFAULT_ENDPOINTS = {
  desa: {
    boletas: 'https://api-boletas-9jn3t0ca7a3j.deno.dev',
    base: 'https://midliq-api-hdprsd64qb7n.deno.dev',
    sp: 'https://josrferreyr-deno-api-su-79--desarrollo.deno.dev'
  },
  prod: {
    boletas: 'https://dno-mid-boletas.jferreyradev.deno.net',
    base: 'https://dno-mid-api-22.jferreyradev.deno.net',
    sp: 'https://dno-mid-boletas.jferreyradev.deno.net'
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
    logo: logoDefault,
    boletaLogo: logoDefault,
    themeColor: '#1976D2',
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
    endpoints: { ...DEFAULT_ENDPOINTS }
  }
]

export const DEFAULT_TENANT_ID = 'concepcion'

export function getTenantById(id) {
  return TENANTS.find((t) => t.id === id) || TENANTS[0]
}
