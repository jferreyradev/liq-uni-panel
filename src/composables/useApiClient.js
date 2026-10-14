import { useEndPoints } from './useEndPoints'
import { useLogStore } from '@/stores/logStore'
import { getActivePinia } from 'pinia'

function buildUrl(baseUrl, path, query) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${baseUrl}${normalizedPath}`)
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    })
  }
  return url.toString()
}

function getLogStoreSafe() {
  if (getActivePinia()) {
    try {
      return useLogStore()
    } catch {
      return null
    }
  }
  return null
}

export function useApiClient() {
  const { apiBase, apiBoletas, apiSp, getBoletasHeaders, env } = useEndPoints()

  function getBaseUrl(service) {
    if (service === 'boletas') return apiBoletas.value
    if (service === 'sp') return apiSp.value
    return apiBase.value
  }

  async function request({
    service = 'base',
    path = '',
    method = 'GET',
    query,
    headers = {},
    body,
    responseType = 'json',
    options = {}
  }) {
    const url = buildUrl(getBaseUrl(service), path, query)

    const finalHeaders = {
      ...getBoletasHeaders(),
      ...headers
    }

    const requestOptions = {
      method,
      ...options,
      headers: finalHeaders
    }

    if (body !== undefined && body !== null) {
      requestOptions.body = body instanceof FormData ? body : JSON.stringify(body)
    }

    const logStore = getLogStoreSafe()
    const start = Date.now()

    try {
      const response = await fetch(url, requestOptions)
      const durationMs = Date.now() - start

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '')
        logStore?.addLog({
          type: 'error',
          category: 'API_CLIENT',
          method,
          url,
          headers: finalHeaders,
          status: response.status,
          statusText: response.statusText,
          durationMs,
          error: errorBody,
          env: env.value
        })
        throw new Error(`HTTP ${response.status} - ${url} ${errorBody}`)
      }

      logStore?.addLog({
        type: 'success',
        category: 'API_CLIENT',
        method,
        url,
        headers: finalHeaders,
        status: response.status,
        statusText: response.statusText,
        durationMs,
        env: env.value
      })

      if (responseType === 'blob') return response.blob()
      if (responseType === 'text') return response.text()
      if (responseType === 'raw') return response
      return response.json()
    } catch (err) {
      const durationMs = Date.now() - start
      logStore?.addLog({
        type: 'error',
        category: 'API_CLIENT',
        method,
        url,
        headers: finalHeaders,
        status: 0,
        statusText: 'Error de Red / Conexión',
        durationMs,
        error: err.message,
        env: env.value
      })
      throw err
    }
  }

  function get(params) {
    return request({ ...params, method: 'GET' })
  }

  function post(params) {
    return request({ ...params, method: 'POST' })
  }

  function del(params) {
    return request({ ...params, method: 'DELETE' })
  }

  return { request, get, post, del }
}