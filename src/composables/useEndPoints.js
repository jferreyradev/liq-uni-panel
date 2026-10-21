import { ref, computed } from 'vue'
import { getActivePinia } from 'pinia'
import { useTenantStore } from '@/stores/tenantStore'
import { DEFAULT_ENDPOINTS, TENANTS } from '@/config/tenants'

const STORAGE_ENV_KEY = 'liq_env'
const STORAGE_DESA_BASE_KEY = 'liq_desa_base'
const STORAGE_DESA_BOLETAS_KEY = 'liq_desa_boletas'
const STORAGE_DESA_SP_KEY = 'liq_desa_sp'
const STORAGE_DESA_KEY_HEADER = 'liq_desa_key'
const STORAGE_DESA_PORT_HEADER = 'liq_desa_port'

function getStoredEnv() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(STORAGE_ENV_KEY)
      if (val === 'Desa' || val === 'Prod') {
        return val
      }
    }
  } catch {
    // ignore
  }
  return 'Prod'
}

function setStoredEnv(val) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_ENV_KEY, val)
    }
  } catch {
    // ignore
  }
}

function getStoredValue(key, fallback = '') {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key) || fallback
    }
  } catch {
    // ignore
  }
  return fallback
}

function setStoredValue(key, val) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (val) {
        window.localStorage.setItem(key, val)
      } else {
        window.localStorage.removeItem(key)
      }
    }
  } catch {
    // ignore
  }
}

const env = ref(getStoredEnv())
const desaBaseOverride = ref(getStoredValue(STORAGE_DESA_BASE_KEY, ''))
const desaBoletasOverride = ref(getStoredValue(STORAGE_DESA_BOLETAS_KEY, ''))
const desaSpOverride = ref(getStoredValue(STORAGE_DESA_SP_KEY, ''))
const desaKeyOverride = ref(getStoredValue(STORAGE_DESA_KEY_HEADER, ''))
const desaPortOverride = ref(getStoredValue(STORAGE_DESA_PORT_HEADER, ''))

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
    const isDesaMode = env.value === 'Desa' || tStore?.activeTenantId === 'desarrollo'
    if (isDesaMode) {
      return {
        base: desaBaseOverride.value || tEndpoints.desa.base,
        boletas: desaBoletasOverride.value || tEndpoints.desa.boletas,
        sp: desaSpOverride.value || tEndpoints.desa.sp
      }
    }
    return tEndpoints.prod
  })

  const apiBase = computed(() => currentEndpoints.value.base)
  const apiBoletas = computed(() => currentEndpoints.value.boletas)
  const apiSp = computed(() => currentEndpoints.value.sp)

  function buildApiHeaders(extraHeaders = {}) {
    const tStore = getTenantStoreSafe()
    const isDesaMode = env.value === 'Desa' || tStore?.activeTenantId === 'desarrollo'

    // En ambiente de desarrollo se utiliza la clave 'desarrollo' y puerto '3005'
    // En producción se utiliza la clave y puerto del municipio activo seleccionado
    const defaultKey = isDesaMode ? 'desarrollo' : (tStore?.tenantKey || TENANTS[0].projectKey)
    const defaultPort = isDesaMode ? '3005' : (tStore?.tenantPort || TENANTS[0].projectPort)

    const projectKey = isDesaMode
      ? (desaKeyOverride.value || defaultKey)
      : defaultKey

    const projectPort = isDesaMode
      ? (desaPortOverride.value || defaultPort)
      : defaultPort

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
    setStoredEnv('Prod')
  }

  function setDesa() {
    env.value = 'Desa'
    setStoredEnv('Desa')
  }

  function setEnv(val) {
    if (val === 'Desa') {
      setDesa()
    } else {
      setProd()
    }
  }

  function toggleEnv() {
    if (env.value === 'Desa') {
      setProd()
    } else {
      setDesa()
    }
  }

  function getDesaOverrides() {
    return {
      base: desaBaseOverride.value,
      boletas: desaBoletasOverride.value,
      sp: desaSpOverride.value,
      key: desaKeyOverride.value,
      port: desaPortOverride.value
    }
  }

  function setDesaOverrides({ base, boletas, sp, key, port }) {
    if (base !== undefined) {
      desaBaseOverride.value = base || ''
      setStoredValue(STORAGE_DESA_BASE_KEY, base || '')
    }
    if (boletas !== undefined) {
      desaBoletasOverride.value = boletas || ''
      setStoredValue(STORAGE_DESA_BOLETAS_KEY, boletas || '')
    }
    if (sp !== undefined) {
      desaSpOverride.value = sp || ''
      setStoredValue(STORAGE_DESA_SP_KEY, sp || '')
    }
    if (key !== undefined) {
      desaKeyOverride.value = key || ''
      setStoredValue(STORAGE_DESA_KEY_HEADER, key || '')
    }
    if (port !== undefined) {
      desaPortOverride.value = port || ''
      setStoredValue(STORAGE_DESA_PORT_HEADER, port || '')
    }
  }

  function resetDesaOverrides() {
    desaBaseOverride.value = ''
    desaBoletasOverride.value = ''
    desaSpOverride.value = ''
    desaKeyOverride.value = ''
    desaPortOverride.value = ''
    setStoredValue(STORAGE_DESA_BASE_KEY, '')
    setStoredValue(STORAGE_DESA_BOLETAS_KEY, '')
    setStoredValue(STORAGE_DESA_SP_KEY, '')
    setStoredValue(STORAGE_DESA_KEY_HEADER, '')
    setStoredValue(STORAGE_DESA_PORT_HEADER, '')
  }

  const isDesa = computed(() => env.value === 'Desa' || getTenantStoreSafe()?.activeTenantId === 'desarrollo')
  const isProd = computed(() => env.value === 'Prod' && getTenantStoreSafe()?.activeTenantId !== 'desarrollo')

  return {
    apiBase,
    apiBoletas,
    apiSp,
    env,
    isDesa,
    isProd,
    setProd,
    setDesa,
    setEnv,
    toggleEnv,
    buildApiHeaders,
    getBoletasHeaders,
    getBoletasRequestOptions,
    getDesaOverrides,
    setDesaOverrides,
    resetDesaOverrides
  }
}
