import { ref, computed } from 'vue'
import { getActivePinia } from 'pinia'
import { useTenantStore } from '@/stores/tenantStore'
import { DEFAULT_ENDPOINTS, TENANTS } from '@/config/tenants'

const env = ref('Prod')

export function useEndPoints() {
  function getTenantStoreSafe() {
    if (getActivePinia()) {
      try {
        return useTenantStore()
      } catch {
        return null
      }
    }
    return null
  }

  const currentEndpoints = computed(() => {
    const tStore = getTenantStoreSafe()
    const tEndpoints = tStore?.activeTenant?.endpoints || DEFAULT_ENDPOINTS
    return env.value === 'Desa' ? tEndpoints.desa : tEndpoints.prod
  })

  const apiBase = computed(() => currentEndpoints.value.base)
  const apiBoletas = computed(() => currentEndpoints.value.boletas)
  const apiSp = computed(() => currentEndpoints.value.sp)

  function buildApiHeaders(extraHeaders = {}) {
    const tStore = getTenantStoreSafe()
    const projectKey = tStore?.tenantKey || TENANTS[0].projectKey
    const projectPort = tStore?.tenantPort || TENANTS[0].projectPort

    const headers = {
      'Content-Type': 'application/json',
      'x-project-key': projectKey,
      'x-project-port': String(projectPort)
    }

    if (extraHeaders && typeof extraHeaders === 'object') {
      Object.entries(extraHeaders).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          headers[key] = value
        }
      })
    }

    return headers
  }

  function getBoletasHeaders(extraHeaders = {}) {
    return buildApiHeaders(extraHeaders)
  }

  function getBoletasRequestOptions(options = {}) {
    const { headers = {}, ...rest } = options
    return {
      ...rest,
      headers: {
        ...getBoletasHeaders(),
        ...headers
      }
    }
  }

  function setProd() {
    env.value = 'Prod'
  }

  function setDesa() {
    env.value = 'Desa'
  }

  return {
    apiBase,
    apiBoletas,
    apiSp,
    env,
    setProd,
    setDesa,
    buildApiHeaders,
    getBoletasHeaders,
    getBoletasRequestOptions
  }
}
