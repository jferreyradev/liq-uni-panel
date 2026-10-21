// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import {
  parseQueryParams,
  parseHeaders,
  parseRequestBody,
  isApiUrl,
  printApiCallToConsole,
  setupHttpLogger
} from '../httpLogger'

describe('httpLogger - Utilidades de inspección de red', () => {
  it('parseQueryParams extrae parámetros simples y decodifica valores', () => {
    const url = 'https://mid-api.test/api/view/liqItem?LiquidacionId=67729&Periodo=01/09/2026'
    const result = parseQueryParams(url)

    expect(result.pathname).toBe('/api/view/liqItem')
    expect(result.params).toEqual({
      LiquidacionId: '67729',
      Periodo: '01/09/2026'
    })
  })

  it('parseQueryParams desempaqueta parámetros que contienen objetos JSON serializados (como sort)', () => {
    const url =
      'https://mid-api.test/api/view/planillaRet?TipoLiquidacionId=1&sort=%7B%22IdRep%22%3A%22asc%22%2C%22Codigo%22%3A%22asc%22%7D'
    const result = parseQueryParams(url)

    expect(result.params.TipoLiquidacionId).toBe('1')
    expect(result.params.sort).toEqual({
      IdRep: 'asc',
      Codigo: 'asc'
    })
  })

  it('parseHeaders normaliza Headers de la Fetch API a objeto plano', () => {
    const headers = new Headers()
    headers.set('x-project-key', 'desarrollo')
    headers.set('x-project-port', '3005')

    const result = parseHeaders(headers)
    expect(result['x-project-key']).toBe('desarrollo')
    expect(result['x-project-port']).toBe('3005')
  })

  it('parseRequestBody parsea JSON y enmascara campos sensibles (claves / passwords)', () => {
    const rawBody = JSON.stringify({
      usuario: 'admin',
      clave: 'supersecreto123',
      rol: 'SUPERADMIN'
    })

    const result = parseRequestBody(rawBody)
    expect(result.usuario).toBe('admin')
    expect(result.clave).toBe('••••••')
    expect(result.rol).toBe('SUPERADMIN')
  })

  it('isApiUrl filtra recursos internos de Vite y assets estáticos', () => {
    expect(isApiUrl('/api/view/liqItem')).toBe(true)
    expect(isApiUrl('https://mid-api.test/api/boleta?IdLiq=100')).toBe(true)
    expect(isApiUrl('/@vite/client')).toBe(false)
    expect(isApiUrl('/src/App.vue')).toBe(false)
    expect(isApiUrl('/assets/style.css')).toBe(false)
    expect(isApiUrl('/fonts/roboto.woff2')).toBe(false)
  })

  it('printApiCallToConsole invoca console.groupCollapsed para llamadas 200 y console.group para errores', () => {
    const groupCollapsedSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {})
    const groupSpy = vi.spyOn(console, 'group').mockImplementation(() => {})
    const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // Llamada exitosa
    printApiCallToConsole({
      method: 'GET',
      fullUrl: 'https://test.com/api/view/liqItem?LiquidacionId=1',
      pathname: '/api/view/liqItem',
      search: '?LiquidacionId=1',
      params: { LiquidacionId: '1' },
      headers: { 'x-project-key': 'desarrollo' },
      body: null,
      status: 200,
      statusText: 'OK',
      duration: 35,
      responseBody: [{ CODIGO: 1 }],
      error: null
    })

    expect(groupCollapsedSpy).toHaveBeenCalled()
    expect(groupEndSpy).toHaveBeenCalled()

    // Llamada con error
    printApiCallToConsole({
      method: 'GET',
      fullUrl: 'https://test.com/api/view/liqItem?LiquidacionId=1',
      pathname: '/api/view/liqItem',
      search: '',
      params: {},
      headers: {},
      body: null,
      status: 400,
      statusText: 'Bad Request',
      duration: 20,
      responseBody: { error: 'Campo no permitido' },
      error: new Error('Campo no permitido')
    })

    expect(groupSpy).toHaveBeenCalled()

    groupCollapsedSpy.mockRestore()
    groupSpy.mockRestore()
    groupEndSpy.mockRestore()
    logSpy.mockRestore()
  })

  it('setupHttpLogger intercepta window.fetch y registra la llamada con parámetros', async () => {
    const mockOriginalFetch = vi.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      clone: () => ({
        json: async () => [{ id: 123, nombre: 'Prueba' }],
        text: async () => '[{"id": 123}]'
      })
    })

    window.fetch = mockOriginalFetch
    delete window.__HTTP_LOGGER_INITIALIZED__
    delete window.__HTTP_LOGGER_ACTIVE__

    const groupCollapsedSpy = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {})
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const groupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {})

    setupHttpLogger()

    const res = await window.fetch('https://test.com/api/view/liq?Periodo=01/09/2026&Tipo=1', {
      method: 'GET',
      headers: { 'x-project-key': 'desarrollo' }
    })

    expect(mockOriginalFetch).toHaveBeenCalled()
    expect(res.status).toBe(200)
    expect(groupCollapsedSpy).toHaveBeenCalled()

    groupCollapsedSpy.mockRestore()
    logSpy.mockRestore()
    groupEndSpy.mockRestore()
  })
})
