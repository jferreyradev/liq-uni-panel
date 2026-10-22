// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { descargaArchivo, descargaBuffer, descargaTXT } from '../apiService.js'

const ENDPOINTS = {
  apiBase: { value: 'https://api.test' },
  apiBoletas: { value: 'https://boletas.test' },
  apiSp: { value: 'https://sp.test' },
  getBoletasHeaders: vi.fn((extra = {}) => ({
    'x-project-key': 'demo',
    ...extra,
  })),
}

vi.mock('@/composables/useEndPoints', () => ({
  useEndPoints: () => ENDPOINTS,
}))

/** Respuesta con un blob simulado. */
function respuestaBlob(contenido = 'contenido', { status = 200, ok = status < 400 } = {}) {
  return {
    status,
    ok,
    statusText: ok ? 'OK' : 'Error',
    headers: new Headers(),
    text: vi.fn().mockResolvedValue(''),
    blob: vi.fn().mockResolvedValue(contenido),
    arrayBuffer: vi.fn().mockResolvedValue(contenido),
  }
}

describe('apiService - descargas binarias', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    global.URL.createObjectURL = vi.fn(() => 'blob:mock')
    global.URL.revokeObjectURL = vi.fn()
  })

  describe('descargaArchivo', () => {
    it('devuelve la URL del objeto y el blob descargado', async () => {
      const blob = { size: 10 }
      global.fetch.mockResolvedValue(respuestaBlob(blob))

      const res = await descargaArchivo('txt/archivoIPSST')

      expect(res.operacionOk).toBe(true)
      expect(res.url).toBe('blob:mock')
      expect(res.blob).toBe(blob)
      expect(global.fetch.mock.calls[0][0]).toBe('https://api.test/api/txt/archivoIPSST')
    })

    it('propaga el query y los headers que pide el llamador', async () => {
      global.fetch.mockResolvedValue(respuestaBlob({ size: 1 }))

      await descargaArchivo('boleta', {
        query: { IdLiq: 42 },
        headers: { 'Content-Type': 'text/plain' },
      })

      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('https://api.test/api/boleta?IdLiq=42')
      expect(init.headers['Content-Type']).toBe('text/plain')
      expect(init.headers['x-project-key']).toBe('demo')
    })

    it('acepta una URL absoluta sin volver a prefijar /api/', async () => {
      global.fetch.mockResolvedValue(respuestaBlob({ size: 1 }))

      await descargaArchivo('https://api.test/api/txt/archivoAcred?Periodo=01/08/2026')

      expect(global.fetch.mock.calls[0][0]).toBe(
        'https://api.test/api/txt/archivoAcred?Periodo=01/08/2026'
      )
    })

    it('informa el error sin lanzar excepción cuando el servidor falla', async () => {
      global.fetch.mockResolvedValue(respuestaBlob(null, { status: 500, ok: false }))

      const res = await descargaArchivo('txt/archivoIPSST')

      expect(res.operacionOk).toBe(false)
      expect(res.estado).toBe(500)
      expect(res.url).toBeNull()
      expect(res.blob).toBeNull()
      expect(res.errmsg).toBeTruthy()
    })

    it('no crea una URL de objeto cuando la descarga falla', async () => {
      global.fetch.mockResolvedValue(respuestaBlob(null, { status: 404, ok: false }))

      await descargaArchivo('txt/archivoIPSST')

      expect(global.URL.createObjectURL).not.toHaveBeenCalled()
    })
  })

  describe('descargaBuffer', () => {
    it('devuelve el buffer crudo del recurso', async () => {
      const buffer = new ArrayBuffer(8)
      global.fetch.mockResolvedValue(respuestaBlob(buffer))

      const res = await descargaBuffer('https://api.test/logo.png')

      expect(res.operacionOk).toBe(true)
      expect(res.datos).toBe(buffer)
    })

    it('informa el error cuando el recurso no existe', async () => {
      global.fetch.mockResolvedValue(respuestaBlob(null, { status: 404, ok: false }))

      const res = await descargaBuffer('https://api.test/logo.png')

      expect(res.operacionOk).toBe(false)
      expect(res.datos).toBeNull()
    })
  })

  describe('descargaTXT', () => {
    it('devuelve la URL del objeto o null si la descarga falla', async () => {
      global.fetch.mockResolvedValue(respuestaBlob({ size: 3 }))
      expect(await descargaTXT('txt/archivoAcred')).toBe('blob:mock')

      global.fetch.mockResolvedValue(respuestaBlob(null, { status: 500, ok: false }))
      expect(await descargaTXT('txt/archivoAcred')).toBeNull()
    })
  })
})
