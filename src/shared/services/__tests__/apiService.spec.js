// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { descargaArchivo, descargaBuffer, descargaTXT, actualizarCargo, ejecutarSP } from '../apiService.js'

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

  describe('actualizarCargo y puente cargos_spuCargo', () => {
    it('actualizarCargo ejecuta PUT /api/cargo con los campos mapeados', async () => {
      global.fetch.mockResolvedValue({
        status: 200,
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify({ result: { rowsAffected: 1 }, status: 200, rows: [] })),
      })

      const res = await actualizarCargo({
        vIDCARGO: 101,
        vIDREP: 469,
        vORDEN: 2,
        vCATEGORIA: 18,
        vIDESTADOCARGO: 1,
        vFECHABAJA: null,
      })

      expect(res.operacionOk).toBe(true)
      expect(res.valorError).toBe(0)
      expect(res.valorSalida).toBe(101)

      expect(global.fetch).toHaveBeenCalled()
      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('https://api.test/api/cargo')
      expect(init.method).toBe('PUT')
      const body = JSON.parse(init.body)
      expect(body.Id).toBe(101)
      expect(body.ReparticionId).toBe(469)
      expect(body.Orden).toBe(2)
      expect(body.Categoria).toBe(18)
    })

    it('actualizarCargo rechaza si no hay Id de cargo', async () => {
      const res = await actualizarCargo({ Categoria: 18 })
      expect(res.operacionOk).toBe(false)
      expect(res.valorError).toBe(-1)
      expect(res.errmsg).toMatch(/no se pudo identificar el id/i)
    })

    it('ejecutarSP("sp/cargos_spuCargo") delega transparentemente a actualizarCargo (PUT /api/cargo)', async () => {
      global.fetch.mockResolvedValue({
        status: 200,
        ok: true,
        text: vi.fn().mockResolvedValue(JSON.stringify({ result: { rowsAffected: 1 }, status: 200, rows: [] })),
      })

      const res = await ejecutarSP('sp/cargos_spuCargo', {
        vIDCARGO: 202,
        vIDREP: 469,
        vORDEN: 3,
        vCATEGORIA: 20,
        vIDESTADOCARGO: 3,
        vFECHABAJA: '2026-11-24',
      })

      expect(res.operacionOk).toBe(true)
      expect(res.valorError).toBe(0)
      expect(res.out.vError).toBe(0)

      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('https://api.test/api/cargo')
      expect(init.method).toBe('PUT')
      const body = JSON.parse(init.body)
      expect(body.Id).toBe(202)
      expect(body.EstadoCargoId).toBe(3)
      expect(body.FechaBaja).toBe('2026-11-24')
    })

    it('ejecutarSP("sp/persUpd") ejecuta fallback a actualizarPersona (PUT /api/persona) si el SP falla por PKG_PERSONAS', async () => {
      // 1er llamada (POST sp/persUpd): falla con error de Oracle ORA-06550 / PLS-00201
      // 2da llamada (PUT api/persona): fallback exitoso
      global.fetch
        .mockResolvedValueOnce({
          status: 500,
          ok: false,
          text: vi.fn().mockResolvedValue(
            JSON.stringify({
              error: "ORA-06550: line 1, column 7: PLS-00201: identifier 'PKG_PERSONAS.SPU_PERSONA' must be declared",
              status: 500,
            })
          ),
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          text: vi.fn().mockResolvedValue(
            JSON.stringify({ result: { rowsAffected: 1 }, status: 200, rows: [] })
          ),
        })

      const res = await ejecutarSP('sp/persUpd', {
        vIDPERS: 10,
        vDNI: '30123456',
        vAPELLIDO: 'Perez',
        vNOMBRE: 'Juan',
        vCUIL: '20301234568',
        vCBU: '0110123400000012345678',
        vCUENTA: '1234567890',
      })

      expect(res.operacionOk).toBe(true)
      expect(res.valorError).toBe(0)
      expect(res.out.vError).toBe(0)

      expect(global.fetch).toHaveBeenCalledTimes(2)
      const [fallbackUrl, fallbackInit] = global.fetch.mock.calls[1]
      expect(fallbackUrl).toBe('https://api.test/api/persona')
      expect(fallbackInit.method).toBe('PUT')
      const body = JSON.parse(fallbackInit.body)
      expect(body.Id).toBe(10)
      expect(body.CBU).toBe('0110123400000012345678')
      expect(body.Cuenta).toBe('1234567890')
    })

    it('ejecutarSP("sp/NovHaberesUpd") redirige a PUT /api/novhaberes?Id=... evitando error 404', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        text: vi.fn().mockResolvedValue(
          JSON.stringify({ result: { rowsAffected: 1 }, status: 200 })
        ),
      })

      const item = {
        Id: 55,
        NroReparticion: 101,
        NroBoleta: 1,
        Codigo: 10,
        Subcodigo: 0,
        Importe: 15000.5,
      }

      const res = await ejecutarSP('sp/NovHaberesUpd', item)

      expect(res.operacionOk).toBe(true)
      expect(res.valorError).toBe(0)
      expect(res.valorSalida).toBe(55)
      expect(res.out.vError).toBe(0)

      expect(global.fetch).toHaveBeenCalledTimes(1)
      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('https://api.test/api/novhaberes?Id=55')
      expect(init.method).toBe('PUT')
      const body = JSON.parse(init.body)
      expect(body.Id).toBe(55)
      expect(body.NroReparticion).toBe(101)
      expect(body.Importe).toBe(15000.5)
    })

    it('ejecutarSP("sp/NovHaberesIns") redirige a POST /api/novhaberes', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 201,
        ok: true,
        text: vi.fn().mockResolvedValue(
          JSON.stringify({ Id: 99, status: 201 })
        ),
      })

      const item = {
        Id: 0,
        NroReparticion: 102,
        NroBoleta: 2,
        Codigo: 20,
        Importe: 20000,
      }

      const res = await ejecutarSP('sp/NovHaberesIns', item)

      expect(res.operacionOk).toBe(true)
      expect(res.valorError).toBe(0)
      expect(res.valorSalida).toBe(99)
      expect(res.out.vError).toBe(0)

      expect(global.fetch).toHaveBeenCalledTimes(1)
      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('https://api.test/api/novhaberes')
      expect(init.method).toBe('POST')
      const body = JSON.parse(init.body)
      expect(body.NroReparticion).toBe(102)
    })

    it('ejecutarSP("sp/NovHaberesDel") redirige a DELETE /api/novhaberes?Id=...', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        text: vi.fn().mockResolvedValue(
          JSON.stringify({ result: { rowsAffected: 1 }, status: 200 })
        ),
      })

      const res = await ejecutarSP('sp/NovHaberesDel', { vIDNOVHAB: 88 })

      expect(res.operacionOk).toBe(true)
      expect(res.valorError).toBe(0)
      expect(res.valorSalida).toBe(88)
      expect(res.out.vError).toBe(0)

      expect(global.fetch).toHaveBeenCalledTimes(1)
      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('https://api.test/api/novhaberes?Id=88')
      expect(init.method).toBe('DELETE')
    })
  })
})
