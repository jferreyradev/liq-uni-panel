import { ref, computed } from 'vue'
import { useTenantStore } from '@/stores/tenantStore'
import { DEFAULT_ENDPOINTS } from '@/config/tenants'

const env = ref('Prod')

export function useEndPoints() {
  const tenantStore = useTenantStore()

  const currentEndpoints = computed(() => {
    const tEndpoints = tenantStore.activeTenant?.endpoints || DEFAULT_ENDPOINTS
    return env.value === 'Desa' ? tEndpoints.desa : tEndpoints.prod
  })

  const apiBase = computed(() => currentEndpoints.value.base)
  const apiBoletas = computed(() => currentEndpoints.value.boletas)
  const apiSp = computed(() => currentEndpoints.value.sp)

  function buildApiHeaders(extraHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'x-project-key': tenantStore.tenantKey,
      'x-project-port': String(tenantStore.tenantPort)
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
