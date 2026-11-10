import { ref, computed } from 'vue'
import { getActivePinia } from 'pinia'
import { useTenantStore } from '@/stores/tenantStore'
import { DEFAULT_ENDPOINTS, TENANTS } from '@/config/tenants'
import {
  loadApiEnvironments,
  saveApiEnvironmentsToStorage,
  STORAGE_ACTIVE_ENV_ID_KEY,
  DEFAULT_API_ENVIRONMENTS
} from '@/config/apiEnvironments'

const STORAGE_ENV_KEY = 'liq_env'
const STORAGE_DESA_BASE_KEY = 'liq_desa_base'
const STORAGE_DESA_BOLETAS_KEY = 'liq_desa_boletas'
const STORAGE_DESA_SP_KEY = 'liq_desa_sp'
const STORAGE_DESA_KEY_HEADER = 'liq_desa_key'
const STORAGE_DESA_PORT_HEADER = 'liq_desa_port'
const STORAGE_AUTH_TOKEN_KEY = 'liq_token'
const STORAGE_API_KEY = 'liq_api_key'
const STORAGE_ADMIN_KEY = 'liq_admin_key'

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
      const val = window.localStorage.getItem(key)
      // Si el navegador tenía guardada una URL obsoleta (Deno o host anterior de pruebas), limpiarla para usar el default
      if (val && (val.includes('deno.net') || val.includes('deno.dev') || val.includes('api-rpi.liqsysonline.com'))) {
        window.localStorage.removeItem(key)
        return fallback
      }
      return val || fallback
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

const defaultEnvApiKey = import.meta.env?.VITE_API_KEY || ''
const defaultEnvAdminKey = import.meta.env?.VITE_ADMIN_KEY || ''

const apiEnvironments = ref(loadApiEnvironments())

function getStoredActiveEnvId() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_ACTIVE_ENV_ID_KEY)
      if (stored && apiEnvironments.value.some((e) => e.id === stored)) {
        return stored
      }
    }
  } catch {
    // ignore
  }
  return null
}

const activeEnvId = ref(getStoredActiveEnvId())

const activeEnvironment = computed(() => {
  if (!activeEnvId.value) return null
  return apiEnvironments.value.find((e) => e.id === activeEnvId.value) || null
})

const env = ref(getStoredEnv())
const desaBaseOverride = ref(getStoredValue(STORAGE_DESA_BASE_KEY, ''))
const desaBoletasOverride = ref(getStoredValue(STORAGE_DESA_BOLETAS_KEY, ''))
const desaSpOverride = ref(getStoredValue(STORAGE_DESA_SP_KEY, ''))
const desaKeyOverride = ref(getStoredValue(STORAGE_DESA_KEY_HEADER, ''))
const desaPortOverride = ref(getStoredValue(STORAGE_DESA_PORT_HEADER, ''))
const authToken = ref(getStoredValue(STORAGE_AUTH_TOKEN_KEY, ''))
const apiKeyOverride = ref(getStoredValue(STORAGE_API_KEY, defaultEnvApiKey))
const adminKeyOverride = ref(getStoredValue(STORAGE_ADMIN_KEY, defaultEnvAdminKey))

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
    // 1. Si hay un override manual de desarrollo, se prioriza
    if (desaBaseOverride.value) {
      return {
        base: desaBaseOverride.value,
        boletas: desaBoletasOverride.value || `${desaBaseOverride.value}/api`,
        sp: desaSpOverride.value || `${desaBaseOverride.value}/api`
      }
    }

    // 2. Si hay un ambiente API seleccionado explícitamente (ej: rpi-desa, rpi-tv)
    if (activeEnvironment.value?.url) {
      const u = activeEnvironment.value.url.replace(/\/+$/, '')
      return {
        base: u,
        boletas: `${u}/api`,
        sp: `${u}/api`
      }
    }

    // 3. Fallback a endpoints de tenants (Concepción, Burruyacú, etc.)
    const tStore = getTenantStoreSafe()
    const tEndpoints = tStore?.activeTenant?.endpoints || DEFAULT_ENDPOINTS
    const isDesaMode = env.value === 'Desa' || tStore?.activeTenantId === 'desarrollo'
    if (isDesaMode) {
      return {
        base: tEndpoints.desa.base,
        boletas: tEndpoints.desa.boletas,
        sp: tEndpoints.desa.sp
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

    const token = authToken.value || getStoredValue(STORAGE_AUTH_TOKEN_KEY, '')
    // Si el ambiente activo define su propia apiKey, se prioriza sobre el default
    const envApiKey = activeEnvironment.value?.apiKey || ''
    const apiKey = apiKeyOverride.value || envApiKey || getStoredValue(STORAGE_API_KEY, defaultEnvApiKey)
    const adminKey = adminKeyOverride.value || getStoredValue(STORAGE_ADMIN_KEY, defaultEnvAdminKey)

    const headers = {
      'Content-Type': 'application/json',
      'x-project-key': projectKey,
      'x-project-port': String(projectPort)
    }

    // Inyectar credenciales del nuevo sistema de seguridad híbrido de node-apiliq
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    if (apiKey) {
      headers['X-API-Key'] = apiKey
    }

    if (adminKey) {
      headers['X-Admin-Key'] = adminKey
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

  function setAuthToken(val) {
    authToken.value = val || ''
    setStoredValue(STORAGE_AUTH_TOKEN_KEY, val || '')
  }

  function clearAuthToken() {
    authToken.value = ''
    setStoredValue(STORAGE_AUTH_TOKEN_KEY, '')
  }

  function setApiKey(val) {
    apiKeyOverride.value = val || ''
    setStoredValue(STORAGE_API_KEY, val || '')
  }

  function setAdminKey(val) {
    adminKeyOverride.value = val || ''
    setStoredValue(STORAGE_ADMIN_KEY, val || '')
  }

  function setApiEnvironment(envId) {
    const found = apiEnvironments.value.find((e) => e.id === envId)
    if (!found) {
      console.warn(`[useEndPoints] Ambiente API con id "${envId}" no encontrado.`)
      return false
    }

    activeEnvId.value = envId
    setStoredValue(STORAGE_ACTIVE_ENV_ID_KEY, envId)

    // Sincronizar automáticamente la apiKey si el ambiente la define
    if (found.apiKey) {
      setApiKey(found.apiKey)
    }

    // Al conmutar de backend se limpia el token de sesión previo
    clearAuthToken()
    return true
  }

  function clearActiveApiEnvironment() {
    activeEnvId.value = null
    setStoredValue(STORAGE_ACTIVE_ENV_ID_KEY, '')
  }

  function updateApiEnvironments(list) {
    if (Array.isArray(list) && list.length > 0) {
      apiEnvironments.value = [...list]
      saveApiEnvironmentsToStorage(list)
      if (activeEnvId.value && !list.some((e) => e.id === activeEnvId.value)) {
        setApiEnvironment(list[0].id)
      }
    }
  }

  function resetApiEnvironments() {
    apiEnvironments.value = [...DEFAULT_API_ENVIRONMENTS]
    saveApiEnvironmentsToStorage([])
    activeEnvId.value = null
    setStoredValue(STORAGE_ACTIVE_ENV_ID_KEY, '')
  }

  return {
    apiBase,
    apiBoletas,
    apiSp,
    env,
    isDesa,
    isProd,
    authToken,
    apiKeyOverride,
    adminKeyOverride,
    apiEnvironments,
    activeEnvId,
    activeEnvironment,
    setApiEnvironment,
    clearActiveApiEnvironment,
    updateApiEnvironments,
    resetApiEnvironments,
    setAuthToken,
    clearAuthToken,
    setApiKey,
    setAdminKey,
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
