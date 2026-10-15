import { getActivePinia } from 'pinia'
import { useLogStore } from '@/stores/logStore'

/**
 * Parsea los query params de una URL a un objeto plano.
 * Si un valor es un JSON (empieza con { o [), lo deserializa a objeto/array.
 */
export function parseQueryParams(rawUrl) {
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    const u = new URL(rawUrl, base)
    const params = {}
    for (const [key, value] of u.searchParams.entries()) {
      const trimmed = value.trim()
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        try {
          params[key] = JSON.parse(trimmed)
          continue
        } catch {
          // Si falla JSON.parse, conservar como string
        }
      }
      params[key] = value
    }
    return {
      pathname: u.pathname,
      search: u.search,
      params,
      fullUrl: rawUrl
    }
  } catch {
    return {
      pathname: String(rawUrl),
      search: '',
      params: {},
      fullUrl: String(rawUrl)
    }
  }
}

/**
 * Convierte diferentes formas de headers en un objeto plano { [name]: value }.
 */
export function parseHeaders(headers) {
  if (!headers) return {}
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    const obj = {}
    headers.forEach((val, key) => {
      obj[key] = val
    })
    return obj
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }
  if (typeof headers === 'object') {
    return { ...headers }
  }
  return {}
}

/**
 * Enmascara contraseñas o tokens sensibles en payloads para seguridad en consola.
 */
function sanitizePayload(data) {
  if (!data || typeof data !== 'object') return data
  if (Array.isArray(data)) return data.map(sanitizePayload)
  const clone = { ...data }
  const sensitiveKeys = ['clave', 'password', 'token', 'secret', 'authorization']
  for (const k of Object.keys(clone)) {
    if (sensitiveKeys.some((s) => k.toLowerCase().includes(s))) {
      clone[k] = '••••••'
    } else if (typeof clone[k] === 'object' && clone[k] !== null) {
      clone[k] = sanitizePayload(clone[k])
    }
  }
  return clone
}

/**
 * Parsea el body de la petición (JSON string, FormData, etc.).
 */
export function parseRequestBody(body) {
  if (!body) return null
  if (typeof body === 'string') {
    try {
      return sanitizePayload(JSON.parse(body))
    } catch {
      return body
    }
  }
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const obj = {}
    body.forEach((val, key) => {
      obj[key] = val instanceof File ? `[File: ${val.name}]` : val
    })
    return sanitizePayload(obj)
  }
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
    return sanitizePayload(Object.fromEntries(body.entries()))
  }
  return sanitizePayload(body)
}

/**
 * Determina si la URL corresponde a una llamada de API o servicio backend
 * para no saturar la consola con recursos estáticos de Vite o assets.
 */
export function isApiUrl(url) {
  if (!url) return false
  const s = String(url)
  // Ignorar módulos internos de Vite y assets
  if (
    s.includes('/@vite') ||
    s.includes('/@fs') ||
    s.includes('/node_modules/') ||
    s.includes('/src/') ||
    s.endsWith('.vue') ||
    s.endsWith('.css') ||
    s.endsWith('.woff') ||
    s.endsWith('.woff2') ||
    s.endsWith('.ttf') ||
    s.endsWith('.ico')
  ) {
    return false
  }
  return true
}

function getLogStoreSafe() {
  if (typeof window !== 'undefined' && getActivePinia()) {
    try {
      return useLogStore()
    } catch {
      return null
    }
  }
  return null
}

/**
 * Imprime en la consola de inspección del navegador de forma agrupada y formateada.
 */
export function printApiCallToConsole({
  method,
  fullUrl,
  pathname,
  search,
  params,
  headers,
  body,
  status,
  statusText,
  duration,
  responseBody,
  error
}) {
  if (typeof console === 'undefined') return

  const isError = !status || status >= 400 || !!error
  const statusColor = isError ? '#dc2626' : status >= 300 ? '#ea580c' : '#16a34a'
  const methodColor =
    method === 'GET'
      ? '#0284c7'
      : method === 'POST'
        ? '#16a34a'
        : method === 'PUT'
          ? '#d97706'
          : method === 'DELETE'
            ? '#dc2626'
            : '#4b5563'

  const titlePrefix = isError ? '[API ERROR]' : '[API]'
  const title = `%c${titlePrefix} %c${method} %c${pathname}${search ? decodeURIComponent(search) : ''} %c${status || 'ERR'} ${statusText || ''} %c${duration}ms`
  const styleBadge = isError
    ? 'background: #dc2626; color: #fff; font-weight: bold; padding: 2px 6px; border-radius: 4px;'
    : 'background: #0f172a; color: #38bdf8; font-weight: bold; padding: 2px 6px; border-radius: 4px;'
  const styleMethod = `color: ${methodColor}; font-weight: bold;`
  const styleUrl = 'color: #334155; font-weight: 500;'
  const styleStatus = `color: ${statusColor}; font-weight: bold;`
  const styleDuration = 'color: #94a3b8; font-size: 11px;'

  const groupFn = isError && console.group ? console.group : console.groupCollapsed || console.log

  try {
    groupFn(title, styleBadge, styleMethod, styleUrl, styleStatus, styleDuration)

    console.log('📌 URL completa:', fullUrl)
    console.log(
      '🔍 Parámetros (Query):',
      Object.keys(params || {}).length > 0 ? params : '(sin parámetros)'
    )

    if (body !== null && body !== undefined) {
      console.log('📦 Body (Payload):', body)
    }

    if (headers && Object.keys(headers).length > 0) {
      console.log('🏷️ Encabezados (Headers):', headers)
    }

    console.log('⏱️ Tiempo de respuesta:', `${duration} ms`)
    console.log('📥 Estado HTTP:', `${status} ${statusText || ''}`)

    if (responseBody !== null && responseBody !== undefined) {
      if (Array.isArray(responseBody)) {
        console.log(`📊 Respuesta (${responseBody.length} registros):`, responseBody)
      } else {
        console.log('📊 Respuesta:', responseBody)
      }
    }

    if (error) {
      console.error('❌ Error capturado:', error)
    }
  } finally {
    if (console.groupEnd) {
      console.groupEnd()
    }
  }
}

/**
 * Inicializa el interceptor global de fetch para registrar todas las llamadas
 * a APIs y servicios con sus parámetros en la consola de inspección.
 */
export function setupHttpLogger() {
  if (typeof window === 'undefined' || !window.fetch) return
  if (window.__HTTP_LOGGER_INITIALIZED__) return
  window.__HTTP_LOGGER_INITIALIZED__ = true
  window.__HTTP_LOGGER_ACTIVE__ = true

  if (typeof window.__HTTP_LOGGER_ENABLED__ === 'undefined') {
    window.__HTTP_LOGGER_ENABLED__ = true
  }

  const nativeFetch = window.fetch

  window.fetch = async function (input, init = {}) {
    let rawUrl = ''
    let method = 'GET'
    let headers = {}
    let body = null

    if (typeof input === 'string') {
      rawUrl = input
      method = (init?.method || 'GET').toUpperCase()
      headers = init?.headers || {}
      body = init?.body || null
    } else if (typeof URL !== 'undefined' && input instanceof URL) {
      rawUrl = input.toString()
      method = (init?.method || 'GET').toUpperCase()
      headers = init?.headers || {}
      body = init?.body || null
    } else if (input && typeof input === 'object') {
      rawUrl = input.url || ''
      method = (init?.method || input.method || 'GET').toUpperCase()
      headers = init?.headers || input.headers || {}
      body = init?.body || input.body || null
    }

    if (!window.__HTTP_LOGGER_ENABLED__ || !isApiUrl(rawUrl)) {
      return nativeFetch.apply(this, arguments)
    }

    const { pathname, search, params, fullUrl } = parseQueryParams(rawUrl)
    const parsedHeaders = parseHeaders(headers)
    const parsedBody = parseRequestBody(body)
    const start = performance.now()

    let response
    let error = null
    let responseBody = null

    try {
      response = await nativeFetch.apply(this, arguments)

      // Clona la respuesta para inspeccionar el cuerpo sin alterar el stream del llamador
      try {
        const contentType = response.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          const clone = response.clone()
          responseBody = await clone.json()
        } else if (contentType.includes('text/')) {
          const clone = response.clone()
          const text = await clone.text()
          responseBody = text.length > 500 ? text.substring(0, 500) + '...' : text
        }
      } catch {
        // En caso de streams ya leídos o no clonables, continúa sin error
      }

      return response
    } catch (err) {
      error = err
      throw err
    } finally {
      const duration = Math.round(performance.now() - start)
      const status = response ? response.status : 0
      const statusText = response ? response.statusText : (error ? error.message : 'Error de Conexión')

      // 1. Mostrar en consola de inspección
      printApiCallToConsole({
        method,
        fullUrl,
        pathname,
        search,
        params,
        headers: parsedHeaders,
        body: parsedBody,
        status,
        statusText,
        duration,
        responseBody,
        error
      })

      // 2. Registrar en logStore para el diálogo de diagnóstico sin duplicar en consola
      const logStore = getLogStoreSafe()
      if (logStore) {
        logStore.addLog({
          type: error || status >= 400 ? 'error' : status >= 300 ? 'warn' : 'success',
          category: 'HTTP',
          method,
          url: fullUrl,
          params,
          headers: parsedHeaders,
          status,
          statusText,
          durationMs: duration,
          requestBody: parsedBody,
          responseBody: Array.isArray(responseBody) ? `[${responseBody.length} items]` : responseBody,
          error: error ? error.message : (status >= 400 ? JSON.stringify(responseBody) : null),
          skipConsole: true
        })
      }
    }
  }

  console.log(
    '%c[Antigravity HTTP Logger]%c Interceptor de red activado. Las llamadas y parámetros se detallan en esta consola.',
    'background: #0284c7; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
    'color: inherit;'
  )
}
