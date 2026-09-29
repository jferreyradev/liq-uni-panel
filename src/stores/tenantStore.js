import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { TENANTS, DEFAULT_TENANT_ID, getTenantById } from '@/config/tenants'

const STORAGE_KEY = 'liq_tenant_id'

function getStoredTenantId() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(STORAGE_KEY)
    }
  } catch {
    // ignore
  }
  return null
}

function setStoredTenantId(id) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, id)
    }
  } catch {
    // ignore
  }
}

export const useTenantStore = defineStore('tenant', () => {
  const storedId = getStoredTenantId()
  const activeTenantId = ref(storedId && TENANTS.some((t) => t.id === storedId) ? storedId : DEFAULT_TENANT_ID)
  const tenantsList = ref([...TENANTS])

  const activeTenant = computed(() => {
    return getTenantById(activeTenantId.value)
  })

  const tenantKey = computed(() => activeTenant.value.projectKey)
  const tenantPort = computed(() => activeTenant.value.projectPort)
  const tenantName = computed(() => activeTenant.value.name)
  const tenantShortName = computed(() => activeTenant.value.shortName)
  const tenantLocation = computed(() => activeTenant.value.location)
  const tenantLogo = computed(() => activeTenant.value.logo)
  const boletaLogo = computed(() => activeTenant.value.boletaLogo)

  function setTenant(tenantId) {
    const found = tenantsList.value.find((t) => t.id === tenantId)
    if (!found) {
      console.warn(`Tenant con ID "${tenantId}" no encontrado.`)
      return false
    }

    activeTenantId.value = tenantId
    setStoredTenantId(tenantId)
    return true
  }

  return {
    activeTenantId,
    tenantsList,
    activeTenant,
    tenantKey,
    tenantPort,
    tenantName,
    tenantShortName,
    tenantLocation,
    tenantLogo,
    boletaLogo,
    setTenant
  }
})
