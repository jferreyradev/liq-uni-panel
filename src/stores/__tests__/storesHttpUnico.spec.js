// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

import { useFilterStore } from '../filterStore'
import { usePersonasStore } from '../personasStore'
import { useLiqStore } from '../liqStore'

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

describe('stores migrados al cliente HTTP unico', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
    global.fetch = vi.fn()
  })

  describe('filterStore', () => {
    it('lee el periodo activo y deja el año y el mes en el estado', async () => {
      global.fetch.mockResolvedValue(respuesta([{ PERIODO: '2026-03' }]))
      const store = useFilterStore()

      await store.setPer()

      expect(global.fetch.mock.calls[0][0]).toBe(`${API_BASE}/api/view/periodo?Activo=1`)
      expect(store.year).toBe(2026)
      expect(store.month).toBe('03')
    })

    it('deja la configuracion del servidor en el estado', async () => {
      global.fetch.mockResolvedValue(respuesta([{ AMBIENTE: 'PROD', DESCRIPCION: 'Local' }]))
      const store = useFilterStore()

      await store.setConfig()

      expect(global.fetch.mock.calls[0][0]).toBe(`${API_BASE}/api/view/configServer`)
      expect(store.serverConfig.AMBIENTE).toBe('PROD')
      expect(store.serverConfigError).toBe(null)
      expect(store.serverConfigLoading).toBe(false)
    })

    it('deja el error de la configuración cuando el servidor falla', async () => {
      global.fetch.mockResolvedValue(respuesta('sin permiso', { status: 403 }))
      const store = useFilterStore()

      await store.setConfig()

      expect(store.serverConfigError).toContain('403')
      expect(store.serverConfigLoading).toBe(false)
    })
  })

  describe('personasStore', () => {
    it('mapea las provincias y codifica el parametro sort', async () => {
      global.fetch.mockResolvedValue(respuesta([{ ID: 23, DESCRIPCION: 'Tucumán' }]))
      const store = usePersonasStore()

      await store.leerProvincias()

      const [url] = global.fetch.mock.calls[0]
      expect(url.startsWith(`${API_BASE}/api/en/provincias?`)).toBe(true)
      expect(url).toContain('PaisId=1')
      expect(url).toContain('sort=%7B%22Descripcion%22%3A%22asc%22%7D')
      expect(store.provincias).toEqual([{ name: 'Tucumán', value: 23 }])
    })
  })

  describe('liqStore', () => {
    it('carga los items de la liquidación', async () => {
      global.fetch.mockResolvedValue(respuesta([{ CODIGO: 1, DESCRIPCION: 'Basico' }]))
      const store = useLiqStore()

      await store.setLiqItems(42)

      expect(global.fetch.mock.calls[0][0]).toBe(`${API_BASE}/api/view/liqItem?LiquidacionId=42`)
      expect(store.liqitems).toEqual([{ CODIGO: 1, DESCRIPCION: 'Basico' }])
    })
  })
})
