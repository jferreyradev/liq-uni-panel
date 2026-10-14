// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLogStore } from '../logStore'
import { useTenantStore } from '../tenantStore'
import { useEndPoints } from '@/composables/useEndPoints'

describe('LogStore y Diagnóstico de Conexión', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear()
    }
  })

  it('inicializa vacío y permite registrar logs de peticiones HTTP', () => {
    const logStore = useLogStore()
    expect(logStore.logs).toHaveLength(0)
    expect(logStore.hasErrors).toBe(false)
    expect(logStore.lastError).toBeNull()

    logStore.addLog({
      type: 'info',
      category: 'HTTP',
      method: 'GET',
      url: 'https://test.com/api',
      status: 200,
      statusText: 'OK'
    })

    expect(logStore.logs).toHaveLength(1)
    expect(logStore.logs[0].url).toBe('https://test.com/api')
    expect(logStore.logs[0].status).toBe(200)
    expect(logStore.hasErrors).toBe(false)
  })

  it('detecta y reporta errores en lastError y hasErrors', () => {
    const logStore = useLogStore()

    logStore.addLog({
      type: 'error',
      category: 'AUTH',
      method: 'GET',
      url: 'https://test.com/api/view/users',
      status: 404,
      statusText: 'Not Found',
      error: 'DEPLOYMENT_NOT_FOUND'
    })

    expect(logStore.hasErrors).toBe(true)
    expect(logStore.lastError).not.toBeNull()
    expect(logStore.lastError.status).toBe(404)
    expect(logStore.lastError.error).toBe('DEPLOYMENT_NOT_FOUND')
  })

  it('permite abrir, cerrar y alternar el diálogo de diagnóstico', () => {
    const logStore = useLogStore()
    expect(logStore.isDialogOpen).toBe(false)

    logStore.openDialog()
    expect(logStore.isDialogOpen).toBe(true)

    logStore.closeDialog()
    expect(logStore.isDialogOpen).toBe(false)

    logStore.toggleDialog()
    expect(logStore.isDialogOpen).toBe(true)
  })

  it('permite personalizar y restablecer overrides de endpoints de desarrollo', () => {
    const { env, setDesa, apiBase, setDesaOverrides, resetDesaOverrides, getDesaOverrides } = useEndPoints()

    setDesa()
    expect(env.value).toBe('Desa')

    setDesaOverrides({
      base: 'http://localhost:3005',
      boletas: 'http://localhost:3005',
      sp: 'http://localhost:3005'
    })

    expect(apiBase.value).toBe('http://localhost:3005')
    const current = getDesaOverrides()
    expect(current.base).toBe('http://localhost:3005')

    resetDesaOverrides()
    expect(apiBase.value).toContain('dno-mid-api-22')
  })

  it('envía x-project-key: desarrollo y x-project-port: 3005 en modo desarrollo', () => {
    const tenantStore = useTenantStore()
    const { env, setDesa, setProd, getBoletasHeaders, setDesaOverrides, resetDesaOverrides } = useEndPoints()

    tenantStore.setTenant('tafiviejo')
    setProd()
    expect(env.value).toBe('Prod')
    let headers = getBoletasHeaders()
    expect(headers['x-project-key']).toBe('tafiviejo')
    expect(headers['x-project-port']).toBe('3007')

    setDesa()
    expect(env.value).toBe('Desa')
    headers = getBoletasHeaders()
    expect(headers['x-project-key']).toBe('desarrollo')
    expect(headers['x-project-port']).toBe('3005')

    // Override personalizado
    setDesaOverrides({ key: 'customDesa', port: '9999' })
    headers = getBoletasHeaders()
    expect(headers['x-project-key']).toBe('customDesa')
    expect(headers['x-project-port']).toBe('9999')

    resetDesaOverrides()
    headers = getBoletasHeaders()
    expect(headers['x-project-key']).toBe('desarrollo')
    expect(headers['x-project-port']).toBe('3005')
  })
})
