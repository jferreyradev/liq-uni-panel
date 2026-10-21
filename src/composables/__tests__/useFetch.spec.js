// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'

import { useFetch } from '../useFetch.js'
import { leerDatos } from '@/shared/services/apiService'

vi.mock('@/shared/services/apiService', () => ({
  leerDatos: vi.fn(),
}))

function respuestaOk(datos) {
  return { operacionOk: true, errmsg: '', datos, notFound: false, estado: 200 }
}

describe('useFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('carga el listado y expone los datos', async () => {
    leerDatos.mockResolvedValue(respuestaOk([{ id: 1 }]))

    const { data, error, isPending } = useFetch(() => 'https://api.test/api/en/cargo')

    await flushPromises()

    expect(leerDatos).toHaveBeenCalledTimes(1)
    expect(leerDatos.mock.calls[0][0]).toBe('https://api.test/api/en/cargo')
    expect(data.value).toEqual([{ id: 1 }])
    expect(error.value).toBe(null)
    expect(isPending.value).toBe(false)
  })

  it('devuelve una lista vacía cuando la respuesta es 404', async () => {
    leerDatos.mockResolvedValue({
      operacionOk: true,
      errmsg: '',
      datos: null,
      notFound: true,
      estado: 404,
    })

    const { data, error, isPending } = useFetch(() => 'https://api.test/api/en/cargo')

    await flushPromises()

    expect(data.value).toEqual([])
    expect(error.value).toBe(null)
    expect(isPending.value).toBe(false)
  })

  it('expone el error del servidor y no lo disimula como lista vacía', async () => {
    leerDatos.mockResolvedValue({
      operacionOk: false,
      errmsg: 'Error al completar la petición (HTTP 500)',
      datos: null,
      notFound: false,
      estado: 500,
    })

    const { data, error, isPending } = useFetch(() => 'https://api.test/api/en/cargo')

    await flushPromises()

    expect(error.value).toBeInstanceOf(Error)
    expect(error.value.message).toContain('500')
    expect(data.value).toBe(null)
    expect(isPending.value).toBe(false)
  })

  it('detecta el contrato de error que viene dentro de un 200', async () => {
    leerDatos.mockResolvedValue(respuestaOk({ error: 'No se pudo leer el listado' }))

    const { data, error } = useFetch(() => 'https://api.test/api/en/cargo')

    await flushPromises()

    expect(error.value).toBeInstanceOf(Error)
    expect(error.value.message).toBe('No se pudo leer el listado')
    expect(data.value).toBe(null)
  })

  it('envía los headers que entrega el consumidor', async () => {
    leerDatos.mockResolvedValue(respuestaOk([]))

    useFetch(
      () => 'https://api.test/api/en/cargo',
      () => ({ headers: { 'x-extra': '1' } })
    )

    await flushPromises()

    expect(leerDatos.mock.calls[0][1].headers).toEqual({ 'x-extra': '1' })
  })

  it('vuelve a pedir cuando cambia el filtro', async () => {
    const filtro = ref('A')
    leerDatos.mockResolvedValue(respuestaOk([]))

    const scope = effectScope()
    scope.run(() => useFetch(() => `https://api.test/api/en/cargo?f=${filtro.value}`))

    await flushPromises()
    expect(leerDatos).toHaveBeenCalledTimes(1)

    filtro.value = 'B'
    await nextTick()
    await flushPromises()

    expect(leerDatos).toHaveBeenCalledTimes(2)
    expect(leerDatos.mock.calls[1][0]).toBe('https://api.test/api/en/cargo?f=B')
    scope.stop()
  })

  it('cancela la petición anterior y descarta la respuesta obsoleta', async () => {
    const filtro = ref('A')
    let resolverPrimera

    leerDatos
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolverPrimera = resolve
          })
      )
      .mockImplementationOnce(() => Promise.resolve(respuestaOk([{ id: 'nuevo' }])))

    const scope = effectScope()
    const { data } = scope.run(() =>
      useFetch(() => `https://api.test/api/en/cargo?f=${filtro.value}`)
    )

    await flushPromises()

    filtro.value = 'B'
    await nextTick()
    await flushPromises()

    expect(data.value).toEqual([{ id: 'nuevo' }])

    // Llega tarde la respuesta vieja: no debe pisar la nueva
    resolverPrimera(respuestaOk([{ id: 'viejo' }]))
    await flushPromises()

    expect(data.value).toEqual([{ id: 'nuevo' }])
    scope.stop()
  })

  it('propaga el AbortSignal para poder cancelar la petición', async () => {
    leerDatos.mockResolvedValue(respuestaOk([]))

    useFetch(() => 'https://api.test/api/en/cargo')

    await flushPromises()

    expect(leerDatos.mock.calls[0][1].signal).toBeDefined()
    expect(leerDatos.mock.calls[0][1].signal.aborted).toBe(false)
  })

  it('no deja el estado en pending si la petición se cancela', async () => {
    leerDatos.mockRejectedValue(Object.assign(new Error('Aborted'), { name: 'AbortError' }))

    const { error, isPending } = useFetch(() => 'https://api.test/api/en/cargo')

    await flushPromises()

    expect(error.value).toBe(null)
    expect(isPending.value).toBe(false)
  })
})
