import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useLogStore = defineStore('logStore', () => {
  const logs = ref([])
  const isDialogOpen = ref(false)
  const maxLogs = 100

  const lastError = computed(() => {
    return logs.value.find((l) => l.type === 'error') || null
  })

  const hasErrors = computed(() => {
    return logs.value.some((l) => l.type === 'error')
  })

  function openDialog() {
    isDialogOpen.value = true
  }

  function closeDialog() {
    isDialogOpen.value = false
  }

  function toggleDialog() {
    isDialogOpen.value = !isDialogOpen.value
  }

  function addLog(entry) {
    const timestamp = new Date().toLocaleTimeString('es-AR', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })

    const logItem = {
      id: Date.now() + Math.random().toString(36).substring(2, 7),
      timestamp,
      type: entry.type || 'info', // 'info' | 'success' | 'warn' | 'error'
      category: entry.category || 'HTTP',
      method: entry.method || 'GET',
      url: entry.url || '',
      params: entry.params || null,
      status: entry.status !== undefined ? entry.status : null,
      statusText: entry.statusText || '',
      headers: entry.headers || {},
      durationMs: entry.durationMs !== undefined ? entry.durationMs : null,
      requestBody: entry.requestBody || null,
      responseBody: entry.responseBody || null,
      error: entry.error || null,
      tenant: entry.tenant || null,
      env: entry.env || null
    }

    // Mantener límite en el buffer
    if (logs.value.length >= maxLogs) {
      logs.value.pop()
    }
    logs.value.unshift(logItem)

    // Salida por consola de desarrollador formateada
    if (!entry.skipConsole && !(typeof window !== 'undefined' && window.__HTTP_LOGGER_ACTIVE__)) {
      printToConsole(logItem)
    }

    return logItem
  }

  function printToConsole(item) {
    if (typeof console === 'undefined') return

    const isErr = item.type === 'error'
    const statusLabel = item.status ? `[HTTP ${item.status}]` : isErr ? '[ERROR]' : '[OK]'
    const groupTitle = `%c[LIQ-LOG] ${statusLabel} ${item.method} ${item.url}`
    const styleBadge = isErr
      ? 'background: #b00020; color: #fff; font-weight: bold; padding: 2px 6px; border-radius: 3px;'
      : item.type === 'warn'
        ? 'background: #fb8c00; color: #fff; font-weight: bold; padding: 2px 6px; border-radius: 3px;'
        : 'background: #2e7d32; color: #fff; font-weight: bold; padding: 2px 6px; border-radius: 3px;'

    try {
      if (console.groupCollapsed) {
        console.groupCollapsed(groupTitle, styleBadge)
      } else {
        console.log(groupTitle)
      }

      console.log('Timestamp:', item.timestamp)
      console.log('Ambiente:', item.env || 'N/A')
      console.log('Municipio:', item.tenant || 'N/A')
      console.log('URL completa:', item.url)

      let queryParams = item.params
      if (!queryParams && item.url) {
        try {
          const u = new URL(item.url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
          if (u.searchParams && Array.from(u.searchParams.keys()).length > 0) {
            queryParams = Object.fromEntries(u.searchParams.entries())
          }
        } catch {
          // URL no parseable: se sigue sin los query params
        }
      }
      if (queryParams) {
        console.log('Parámetros (Query):', queryParams)
      }

      console.log('Encabezados:', item.headers)

      if (item.requestBody) {
        console.log('Request Payload:', item.requestBody)
      }
      if (item.status !== null) {
        console.log('HTTP Status:', `${item.status} ${item.statusText}`)
      }
      if (item.durationMs !== null) {
        console.log('Duración:', `${item.durationMs}ms`)
      }
      if (item.responseBody) {
        console.log('Respuesta:', item.responseBody)
      }
      if (item.error) {
        console.error('Error Detalle:', item.error)
      }

      if (console.groupEnd) {
        console.groupEnd()
      }
    } catch {
      // ignore console logging error
    }
  }

  function clearLogs() {
    logs.value = []
  }

  return {
    logs,
    isDialogOpen,
    lastError,
    hasErrors,
    openDialog,
    closeDialog,
    toggleDialog,
    addLog,
    clearLogs
  }
})
