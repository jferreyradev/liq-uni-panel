// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

import { useUserStore } from '../userStore'

const API_BOLETAS = 'https://dno-mid-boletas.jferreyradev.deno.net'
const API_BASE = 'https://dno-mid-api-22.jferreyradev.deno.net'

function respuesta(cuerpo, { status = 200 } = {}) {
  return {
    ok: status < 400,
    status,
    statusText: status < 400 ? 'OK' : 'Error',
    headers: new Headers(),
    text: vi.fn().mockResolvedValue(typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)),
  }
}

describe('userStore sobre el cliente HTTP unico', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
    global.fetch = vi.fn()
  })

  it('lee la configuracion desde el servicio de boletas con los headers del tenant', async () => {
    global.fetch.mockResolvedValue(respuesta([{ AMBIENTE: 'PROD' }]))
    const store = useUserStore()

    await store.getConfig()

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe(`${API_BOLETAS}/config`)
    expect(init.method).toBe('GET')
    expect(init.headers['x-project-key']).toBe('concecpcion')
    expect(init.headers['x-project-port']).toBe('3007')
    expect(store.config.AMBIENTE).toBe('PROD')
    expect(store.error).toBe(null)
  })

  it('deja el error en el estado cuando el servidor responde con error', async () => {
    global.fetch.mockResolvedValue(respuesta('boom', { status: 500 }))
    const store = useUserStore()

    await store.getConfig()

    expect(typeof store.error).toBe('string')
    expect(store.error).toContain('500')
    expect(store.loading).toBe(false)
  })

  it('carga el usuario y marca la operacion como exitosa', async () => {
    global.fetch.mockResolvedValue(respuesta([{ ID: 9, ROL: 5, PASSWORD: btoa('secreto') }]))
    const store = useUserStore()

    await store.fetchUser('12345678')

    expect(global.fetch.mock.calls[0][0]).toBe(`${API_BOLETAS}/user/12345678`)
    expect(store.user.ID).toBe(9)
    expect(store.success).toBe(true)
    expect(store.error).toBe(null)
  })

  it('deja el detalle del error del servidor en lastError', async () => {
    global.fetch.mockResolvedValue(respuesta('no existe', { status: 404 }))
    const store = useUserStore()

    await store.fetchUser('999')

    expect(store.user).toBe(null)
    expect(store.success).toBe(false)
    expect(store.lastError.status).toBe(404)
    expect(store.lastError.message).toBe('no existe')
    expect(store.error).toContain('404')
  })

  it('busca el usuario por nombre en el servicio base codificando el parametro', async () => {
    global.fetch.mockResolvedValue(respuesta([{ ID: 3 }]))
    const store = useUserStore()

    await store.fetchUserName('jose perez')

    const [url] = global.fetch.mock.calls[0]
    expect(url.startsWith(`${API_BASE}/api/view/users?`)).toBe(true)
    expect(url).toContain('UserName=jose+perez')
    expect(store.user.ID).toBe(3)
  })

  it('envia el cuerpo JSON al cambiar el estado de un usuario', async () => {
    global.fetch.mockResolvedValue(respuesta({}))
    const store = useUserStore()

    await store.setEstado(7, 0)

    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe(`${API_BOLETAS}/estadoUsuario`)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ IdUsuario: 7, Estado: 0 })
    expect(store.result).toBe('ok')
  })

  it('marca el error del servidor al registrar un usuario', async () => {
    global.fetch.mockResolvedValue(respuesta('rechazado', { status: 400 }))
    const store = useUserStore()

    await store.register({ UserName: 'nuevo', Clave: 'clave' })

    expect(store.result).toBe('')
    expect(store.error).toBeInstanceOf(Error)
    expect(store.error.message).toContain('400')
  })
})
