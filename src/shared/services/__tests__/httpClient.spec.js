// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import {
  request,
  requestOrThrow,
  resolveServiceUrl,
  appendQuery,
  parseJsonSafe,
  isAbsoluteUrl,
  DEFAULT_TIMEOUT_MS,
} from '../httpClient.js'

const ENDPOINTS = {
  apiBase: { value: 'https://api.test' },
  apiBoletas: { value: 'https://boletas.test' },
  apiSp: { value: 'https://sp.test' },
  getBoletasHeaders: vi.fn((extra = {}) => ({
    'Content-Type': 'application/json',
    'x-project-key': 'demo',
    'x-project-port': '3000',
    ...extra,
  })),
}

vi.mock('@/composables/useEndPoints', () => ({
  useEndPoints: () => ENDPOINTS,
}))

function respuestaJson(cuerpo, { status = 200, ok = status < 400 } = {}) {
  return {
    status,
    ok,
    headers: new Headers(),
    text: vi.fn().mockResolvedValue(typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)),
    json: vi.fn().mockResolvedValue(cuerpo),
    blob: vi.fn().mockResolvedValue(cuerpo),
    arrayBuffer: vi.fn().mockResolvedValue(cuerpo),
  }
}

describe('httpClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('resolveServiceUrl', () => {
    it('resuelve el servicio base con el prefijo /api/', () => {
      expect(resolveServiceUrl('base', 'view/cargo')).toBe('https://api.test/api/view/cargo')
    })

    it('resuelve el servicio sp sin prefijo', () => {
      expect(resolveServiceUrl('sp', 'sp/persUpd')).toBe('https://sp.test/sp/persUpd')
    })

    it('resuelve el servicio boletas sin prefijo', () => {
      expect(resolveServiceUrl('boletas', 'users')).toBe('https://boletas.test/users')
    })

    it('no duplica las barras iniciales', () => {
      expect(resolveServiceUrl('base', '/view/cargo')).toBe('https://api.test/api/view/cargo')
    })
  })

  describe('appendQuery', () => {
    it('agrega los params a una URL sin query', () => {
      expect(appendQuery('https://x/api/a', { b: 1, c: 'd' })).toBe('https://x/api/a?b=1&c=d')
    })

    it('respeta el query ya existente', () => {
      expect(appendQuery('https://x/api/a?z=0', { b: 1 })).toBe('https://x/api/a?z=0&b=1')
    })

    it('ignora los valores nulos o indefinidos', () => {
      expect(appendQuery('https://x/api/a', { b: undefined, c: null, d: 1 })).toBe('https://x/api/a?d=1')
    })

    it('devuelve la URL sin tocar si no hay query', () => {
      expect(appendQuery('https://x/api/a', null)).toBe('https://x/api/a')
    })
  })

  describe('isAbsoluteUrl', () => {
    it('detecta las URLs absolutas', () => {
      expect(isAbsoluteUrl('https://api.test/api/x')).toBe(true)
      expect(isAbsoluteUrl('view/cargo')).toBe(false)
      expect(isAbsoluteUrl('')).toBe(false)
    })
  })

  describe('parseJsonSafe', () => {
    it('parsea un JSON válido', async () => {
      const res = await parseJsonSafe(respuestaJson({ a: 1 }))
      expect(res.ok).toBe(true)
      expect(res.data).toEqual({ a: 1 })
    })

    it('tolera un cuerpo vacío', async () => {
      const res = await parseJsonSafe(respuestaJson(''))
      expect(res.ok).toBe(true)
      expect(res.data).toBe(null)
    })

    it('marca como inválido un cuerpo que no es JSON', async () => {
      const res = await parseJsonSafe(respuestaJson('<html>error</html>'))
      expect(res.ok).toBe(false)
      expect(res.data).toBe(null)
    })
  })

  describe('request', () => {
    it('arma la URL, aplica los headers del proyecto y devuelve los datos', async () => {
      global.fetch.mockResolvedValue(respuestaJson([{ id: 1 }]))

      const res = await request({ service: 'base', path: 'view/cargo' })

      expect(global.fetch).toHaveBeenCalledTimes(1)
      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('https://api.test/api/view/cargo')
      expect(init.headers['x-project-key']).toBe('demo')
      expect(init.signal).toBeDefined()
      expect(res.operacionOk).toBe(true)
      expect(res.estado).toBe(200)
      expect(res.datos).toEqual([{ id: 1 }])
    })

    it('usa la URL absoluta cuando se informa', async () => {
      global.fetch.mockResolvedValue(respuestaJson([]))

      await request({ url: 'https://otro.test/api/x' })

      expect(global.fetch.mock.calls[0][0]).toBe('https://otro.test/api/x')
    })

    it('agrega el query a la URL', async () => {
      global.fetch.mockResolvedValue(respuestaJson([]))

      await request({ service: 'base', path: 'view/cargo', query: { Documento: '12' } })

      expect(global.fetch.mock.calls[0][0]).toBe('https://api.test/api/view/cargo?Documento=12')
    })

    it('serializa el body como JSON', async () => {
      global.fetch.mockResolvedValue(respuestaJson({ ok: 1 }))

      await request({ service: 'base', path: 'x', method: 'POST', body: { a: 1 } })

      expect(global.fetch.mock.calls[0][1].body).toBe('{"a":1}')
    })

    it('no serializa un FormData', async () => {
      global.fetch.mockResolvedValue(respuestaJson({ ok: 1 }))
      const fd = new FormData()

      await request({ service: 'base', path: 'x', method: 'POST', body: fd })

      expect(global.fetch.mock.calls[0][1].body).toBe(fd)
    })

    it('marca notFound en un 404 sin considerarlo error de transporte', async () => {
      global.fetch.mockResolvedValue(respuestaJson('[]', { status: 404 }))

      const res = await request({ service: 'base', path: 'view/cargo' })

      expect(res.notFound).toBe(true)
      expect(res.estado).toBe(404)
      expect(res.operacionOk).toBe(false)
    })

    it('reporta el error del servidor con el código HTTP', async () => {
      global.fetch.mockResolvedValue(respuestaJson('', { status: 500 }))

      const res = await request({ service: 'base', path: 'view/cargo' })

      expect(res.operacionOk).toBe(false)
      expect(res.estado).toBe(500)
      expect(res.errmsg).toContain('500')
    })

    it('detecta un cuerpo que no es JSON en una respuesta OK', async () => {
      global.fetch.mockResolvedValue(respuestaJson('<html>ok</html>'))

      const res = await request({ service: 'base', path: 'view/cargo' })

      expect(res.operacionOk).toBe(false)
      expect(res.errmsg).toContain('formato válido')
    })

    it('devuelve el cuerpo como texto', async () => {
      global.fetch.mockResolvedValue(respuestaJson('texto plano'))

      const res = await request({ service: 'base', path: 'x', responseType: 'text' })

      expect(res.datos).toBe('texto plano')
    })

    it('devuelve el cuerpo como blob', async () => {
      global.fetch.mockResolvedValue(respuestaJson('binario'))

      const res = await request({ service: 'base', path: 'x', responseType: 'blob' })

      expect(res.datos).toBe('binario')
    })

    it('traduce un error de red', async () => {
      global.fetch.mockRejectedValue(new TypeError('Failed to fetch'))

      const res = await request({ service: 'base', path: 'x' })

      expect(res.operacionOk).toBe(false)
      expect(res.estado).toBe(999)
      expect(res.errmsg).toBe('Error en la Red')
    })

    it('corta la petición cuando se agota el tiempo límite', async () => {
      global.fetch.mockImplementation(
        (url, init) =>
          new Promise((resolve, reject) => {
            if (init.signal.aborted) {
              const err = new Error('Aborted')
              err.name = 'AbortError'
              reject(err)
              return
            }
            init.signal.addEventListener('abort', () => {
              const err = new Error('Aborted')
              err.name = 'AbortError'
              reject(err)
            })
          })
      )

      const res = await request({ service: 'base', path: 'x', timeout: 10 })

      expect(res.operacionOk).toBe(false)
      expect(res.estado).toBe(408)
      expect(res.errmsg).toContain('tiempo límite')
    })

    it('propaga el AbortError cuando el llamador cancela', async () => {
      const controller = new AbortController()
      global.fetch.mockImplementation(
        (url, init) =>
          new Promise((resolve, reject) => {
            init.signal.addEventListener('abort', () => {
              const err = new Error('Aborted')
              err.name = 'AbortError'
              reject(err)
            })
          })
      )

      const promesa = request({ service: 'base', path: 'x', signal: controller.signal })
      controller.abort()

      await expect(promesa).rejects.toThrow(/Aborted/)
    })

    it('usa un timeout por defecto de 30 segundos', () => {
      expect(DEFAULT_TIMEOUT_MS).toBe(30000)
    })
  })

  describe('requestOrThrow', () => {
    it('devuelve los datos cuando la operación es exitosa', async () => {
      global.fetch.mockResolvedValue(respuestaJson([{ id: 1 }]))

      const datos = await requestOrThrow({ service: 'base', path: 'view/cargo' })

      expect(datos).toEqual([{ id: 1 }])
    })

    it('lanza una excepción con el estado cuando la operación falla', async () => {
      global.fetch.mockResolvedValue(respuestaJson('', { status: 503 }))

      await expect(requestOrThrow({ service: 'base', path: 'view/cargo' })).rejects.toThrow(/503/)
    })
  })
})
