/**
 * Configuración y soporte multi-entorno para la API (node-apiliq).
 * Permite definir múltiples entornos backend (ej. RPi Producción, RPi Desarrollo, Localhost),
 * cada uno con su URL base y su respectiva apiKey (X-API-Key).
 */

export const DEFAULT_API_ENVIRONMENTS = [
  {
    id: 'rpi-desa',
    nombre: 'Desarrollo (Cloudflare Desa)',
    url: 'https://api-desa.liqsysonline.com',
    apiKey: import.meta.env?.VITE_API_KEY_DESA || 'admin987front'
  },
  {
    id: 'rpi-tv',
    nombre: 'Servidor TV (Tafí Viejo)',
    url: 'https://api-tv.liqsysonline.com',
    apiKey: import.meta.env?.VITE_API_KEY_TV || 'f098tv'
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
  const envVar =
    import.meta.env?.VITE_API_ENVIRONMENTS ||
    import.meta.env?.API_ENVIRONMENTS
  const fromEnv = parseEnvironments(envVar)
  const baseDefaults = fromEnv || [...DEFAULT_API_ENVIRONMENTS]

  // 1. Prioridad: LocalStorage con enriquecimiento/saneamiento de apiKey
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(STORAGE_ENVIRONMENTS_KEY)
      const parsed = parseEnvironments(stored)
      if (parsed && parsed.length > 0) {
        let changed = false
        const enriched = parsed.map((item) => {
          const match = baseDefaults.find((d) => d.id === item.id || (d.url && d.url === item.url))
          let apiKey = item.apiKey
          if (!apiKey && match?.apiKey) {
            apiKey = match.apiKey
            changed = true
          }
          if (item.id === 'rpi-tv' && (!apiKey || apiKey === 'admin987front')) {
            apiKey = 'f098tv'
            changed = true
          }
          if (item.id === 'rpi-desa' && !apiKey) {
            apiKey = 'admin987front'
            changed = true
          }

          let nombre = item.nombre
          if (nombre === 'Desarrollo Local' && item.id === 'rpi-tv') {
            nombre = 'Servidor TV (Tafí Viejo)'
            changed = true
          } else if (nombre === 'Producción (Raspberry Pi)' && item.id === 'rpi-desa') {
            nombre = 'Desarrollo (Cloudflare Desa)'
            changed = true
          }

          return {
            ...item,
            nombre: nombre || match?.nombre || item.id,
            apiKey: apiKey || match?.apiKey || ''
          }
        })

        // Si se sanearon campos obsoletos, persistir de vuelta
        if (changed) {
          saveApiEnvironmentsToStorage(enriched)
        }
        return enriched
      }
    } catch {
      // ignore
    }
  }

  // 2. Fallback: Lista de variables de entorno o lista base por defecto
  return baseDefaults
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
