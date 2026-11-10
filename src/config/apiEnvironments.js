/**
 * Configuración y soporte multi-entorno para la API (node-apiliq).
 * Permite definir múltiples entornos backend (ej. RPi Producción, RPi Desarrollo, Localhost),
 * cada uno con su URL base y su respectiva apiKey (X-API-Key).
 */

export const DEFAULT_API_ENVIRONMENTS = [
  {
    id: 'rpi-desa',
    nombre: 'Producción (Raspberry Pi)',
    url: 'https://api-desa.liqsysonline.com',
    apiKey: ''
  },
  {
    id: 'rpi-tv',
    nombre: 'Desarrollo Local',
    url: 'https://api-tv.liqsysonline.com',
    apiKey: ''
  }
]

export const STORAGE_ENVIRONMENTS_KEY = 'liq_api_environments'
export const STORAGE_ACTIVE_ENV_ID_KEY = 'liq_active_env_id'

export function parseEnvironments(raw) {
  if (!raw) return null
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .filter((item) => item && (item.url || item.id))
        .map((item, index) => ({
          id: item.id || `env-${index}`,
          nombre: item.nombre || item.name || `Servidor ${index + 1}`,
          url: (item.url || '').replace(/\/+$/, ''),
          apiKey: item.apiKey || item.api_key || item.key || ''
        }))
    }
  } catch (err) {
    console.warn('[apiEnvironments] Error al parsear formato JSON de API_ENVIRONMENTS:', err)
  }
  return null
}

export function loadApiEnvironments() {
  // 1. Prioridad: LocalStorage (personalizaciones del usuario en la app)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(STORAGE_ENVIRONMENTS_KEY)
      const parsed = parseEnvironments(stored)
      if (parsed) return parsed
    } catch {
      // ignore
    }
  }

  // 2. Prioridad: Variables de entorno Vite (.env / .env.local)
  const envVar =
    import.meta.env?.VITE_API_ENVIRONMENTS ||
    import.meta.env?.API_ENVIRONMENTS
  const fromEnv = parseEnvironments(envVar)
  if (fromEnv) return fromEnv

  // 3. Fallback: Lista por defecto
  return [...DEFAULT_API_ENVIRONMENTS]
}

export function saveApiEnvironmentsToStorage(list) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      if (Array.isArray(list) && list.length > 0) {
        window.localStorage.setItem(STORAGE_ENVIRONMENTS_KEY, JSON.stringify(list))
      } else {
        window.localStorage.removeItem(STORAGE_ENVIRONMENTS_KEY)
      }
    } catch (e) {
      console.warn('[apiEnvironments] Error al guardar en localStorage:', e)
    }
  }
}
