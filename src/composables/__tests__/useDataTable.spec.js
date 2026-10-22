// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useDataTable } from '../useDataTable.js'
import { leerDatos } from '@/shared/services/apiService'

vi.mock('@/shared/services/apiService', () => ({
  leerDatos: vi.fn()
}))

describe('useDataTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('carga el listado y expone los datos', async () => {
    leerDatos.mockResolvedValue({
      operacionOk: true,
      errmsg: '',
      datos: [{ DOCUMENTO: '1' }],
      notFound: false
    })

    const { data, isPending, lecturaOk, load } = useDataTable({
      buildUrl: (filtro) => `view/personaLista${filtro ? `?${filtro}` : ''}`
    })

    expect(isPending.value).toBe(false)

    await load('Documento=1')

    expect(leerDatos).toHaveBeenCalledTimes(1)
    expect(leerDatos.mock.calls[0][0]).toBe('view/personaLista?Documento=1')
    expect(data.value).toEqual([{ DOCUMENTO: '1' }])
    expect(lecturaOk.value).toBe(true)
    expect(isPending.value).toBe(false)
  })

  it('envía el AbortSignal para poder cancelar la petición', async () => {
    leerDatos.mockResolvedValue({
      operacionOk: true,
      errmsg: '',
      datos: [],
      notFound: false
    })

    const { load } = useDataTable({ buildUrl: () => 'view/personaLista' })

    await load()

    const [, options] = leerDatos.mock.calls[0]
    expect(options).toBeDefined()
    expect(options.signal).toBeDefined()
    expect(options.signal.aborted).toBe(false)
  })

  it('descarta la respuesta de una petición anterior (carrera de filtros)', async () => {
    const resolvers = []
    leerDatos.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve)
        })
    )

    const { data, load } = useDataTable({ buildUrl: (f) => `view/personaLista?${f}` })

    const primera = load('Documento=1')
    const segunda = load('Documento=2')

    // Responde primero la petición vieja: no debe pisar el estado
    resolvers[0]({
      operacionOk: true,
      errmsg: '',
      datos: [{ DOCUMENTO: 'obsoleto' }],
      notFound: false
    })
    await primera

    expect(data.value).toBeNull()

    resolvers[1]({
      operacionOk: true,
      errmsg: '',
      datos: [{ DOCUMENTO: 'vigente' }],
      notFound: false
    })
    await segunda

    expect(data.value).toEqual([{ DOCUMENTO: 'vigente' }])
  })

  it('marca el error cuando el servicio responde con error', async () => {
    leerDatos.mockResolvedValue({
      operacionOk: false,
      errmsg: 'Error al intentar leer los datos',
      datos: null,
      notFound: false
    })

    const { data, error, lecturaOk, load } = useDataTable({
      buildUrl: () => 'view/personaLista'
    })

    await load()

    expect(lecturaOk.value).toBe(false)
    expect(error.value).toBe('Error al intentar leer los datos')
    expect(data.value).toBeNull()
  })

  it('captura el error de red sin romper el listado', async () => {
    leerDatos.mockRejectedValue(new Error('Error en la Red'))

    const { data, error, lecturaOk, load } = useDataTable({
      buildUrl: () => 'view/personaLista'
    })

    await load()

    expect(lecturaOk.value).toBe(false)
    expect(error.value).toBe('Error en la Red')
    expect(data.value).toBeNull()
  })

  it('no propaga el AbortError al llamador', async () => {
    const abortError = new Error('aborted')
    abortError.name = 'AbortError'
    leerDatos.mockRejectedValue(abortError)

    const { error, load } = useDataTable({ buildUrl: () => 'view/personaLista' })

    await expect(load()).resolves.toBe(false)
    expect(error.value).toBeNull()
  })

  it('reutiliza el último filtro en reload()', async () => {
    leerDatos.mockResolvedValue({
      operacionOk: true,
      errmsg: '',
      datos: [],
      notFound: false
    })

    const { load, reload } = useDataTable({
      buildUrl: (f) => `view/personaLista?${f}`
    })

    await load('Documento=1')
    await reload()

    expect(leerDatos).toHaveBeenCalledTimes(2)
    expect(leerDatos.mock.calls[1][0]).toBe('view/personaLista?Documento=1')
  })
})
