// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTenantStore } from '../tenantStore'
import { useEndPoints } from '@/composables/useEndPoints'

describe('TenantStore and Multi-Tenant Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear()
    }
  })

  it('inicializa con el municipio por defecto (Concepción)', () => {
    const store = useTenantStore()
    expect(store.activeTenantId).toBe('concepcion')
    expect(store.tenantKey).toBe('concecpcion')
    expect(store.tenantPort).toBe('3007')
    expect(store.tenantName).toContain('Concepción')
  })

  it('contiene la lista completa de municipios y entorno de desarrollo', () => {
    const store = useTenantStore()
    expect(store.tenantsList).toHaveLength(5)
    const ids = store.tenantsList.map((t) => t.id)
    expect(ids).toEqual(['concepcion', 'burruyacu', 'tafiviejo', 'trancas', 'desarrollo'])
  })

  it('permite conmutar a Burruyacú y actualiza la key y puerto', () => {
    const store = useTenantStore()
    const ok = store.setTenant('burruyacu')
    expect(ok).toBe(true)
    expect(store.activeTenantId).toBe('burruyacu')
    expect(store.tenantKey).toBe('Burru')
    expect(store.tenantPort).toBe('3003')
  })

  it('permite conmutar a Tafí Viejo y actualiza key y puerto', () => {
    const store = useTenantStore()
    const ok = store.setTenant('tafiviejo')
    expect(ok).toBe(true)
    expect(store.activeTenantId).toBe('tafiviejo')
    expect(store.tenantKey).toBe('tafiviejo')
    expect(store.tenantPort).toBe('3007')
  })

  it('permite conmutar a Trancas y actualiza key y puerto', () => {
    const store = useTenantStore()
    const ok = store.setTenant('trancas')
    expect(ok).toBe(true)
    expect(store.activeTenantId).toBe('trancas')
    expect(store.tenantKey).toBe('ServerTrancas')
    expect(store.tenantPort).toBe('3005')
  })

  it('permite conmutar a Desarrollo y actualiza key y puerto a desarrollo/3005', () => {
    const store = useTenantStore()
    const ok = store.setTenant('desarrollo')
    expect(ok).toBe(true)
    expect(store.activeTenantId).toBe('desarrollo')
    expect(store.tenantKey).toBe('desarrollo')
    expect(store.tenantPort).toBe('3005')
    expect(store.tenantShortName).toBe('Desarrollo')
  })

  it('conecta con useEndPoints y genera encabezados reactivos', () => {
    const store = useTenantStore()
    const { getBoletasHeaders } = useEndPoints()

    store.setTenant('burruyacu')
    let headers = getBoletasHeaders()
    expect(headers['x-project-key']).toBe('Burru')
    expect(headers['x-project-port']).toBe('3003')

    store.setTenant('trancas')
    headers = getBoletasHeaders()
    expect(headers['x-project-key']).toBe('ServerTrancas')
    expect(headers['x-project-port']).toBe('3005')

    store.setTenant('desarrollo')
    headers = getBoletasHeaders()
    expect(headers['x-project-key']).toBe('desarrollo')
    expect(headers['x-project-port']).toBe('3005')
  })

  it('respeta la asignación de reportes permitidos según el municipio', () => {
    const store = useTenantStore()
    expect(store.activeTenant.allowedReports).toEqual([4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

    store.setTenant('trancas')
    expect(store.activeTenant.allowedReports).toEqual([1, 2, 4, 5])

    store.setTenant('tafiviejo')
    expect(store.activeTenant.allowedReports).toEqual([4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
  })

  it('permite alternar entre Producción y Desarrollo con useEndPoints y persiste en localStorage', () => {
    const { env, setDesa, setProd, toggleEnv, apiBase, isDesa, isProd } = useEndPoints()

    setProd()
    expect(env.value).toBe('Prod')
    expect(isProd.value).toBe(true)
    expect(isDesa.value).toBe(false)
    expect(apiBase.value).toContain('dno-mid-api-22')

    setDesa()
    expect(env.value).toBe('Desa')
    expect(isDesa.value).toBe(true)
    expect(isProd.value).toBe(false)
    expect(apiBase.value).toContain('dno-mid-api-22')
    if (typeof window !== 'undefined' && window.localStorage) {
      expect(window.localStorage.getItem('liq_env')).toBe('Desa')
    }

    toggleEnv()
    expect(env.value).toBe('Prod')
    expect(apiBase.value).toContain('dno-mid-api-22')
    if (typeof window !== 'undefined' && window.localStorage) {
      expect(window.localStorage.getItem('liq_env')).toBe('Prod')
    }
  })
})

