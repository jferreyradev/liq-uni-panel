// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  parseEnvironments,
  loadApiEnvironments,
  saveApiEnvironmentsToStorage,
  DEFAULT_API_ENVIRONMENTS,
  STORAGE_ENVIRONMENTS_KEY
} from '../apiEnvironments'

describe('apiEnvironments multi-server configuration', () => {
  let store = {}
  const mockStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val) },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} }
  }

  beforeEach(() => {
    store = {}
    vi.stubGlobal('localStorage', mockStorage)
    if (typeof window !== 'undefined') {
      window.localStorage = mockStorage
    }
  })

  it('devuelve null al parsear entradas nulas o vacías', () => {
    expect(parseEnvironments(null)).toBe(null)
    expect(parseEnvironments('')).toBe(null)
    expect(parseEnvironments('[]')).toBe(null)
    expect(parseEnvironments('invalid json')).toBe(null)
  })

  it('parsea correctamente un string JSON de ambientes con url normalizada', () => {
    const raw = JSON.stringify([
      {
        id: 'serv-1',
        nombre: 'Servidor 1',
        url: 'https://api-1.com///',
        apiKey: 'key1'
      },
      {
        id: 'serv-2',
        nombre: 'Servidor 2',
        url: 'https://api-2.com',
        apiKey: 'key2'
      }
    ])

    const result = parseEnvironments(raw)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('serv-1')
    expect(result[0].url).toBe('https://api-1.com')
    expect(result[0].apiKey).toBe('key1')
    expect(result[1].id).toBe('serv-2')
  })

  it('guarda y carga ambientes desde localStorage', () => {
    const customList = [
      { id: 'custom-1', nombre: 'Custom', url: 'https://custom.com', apiKey: 'sec123' }
    ]

    saveApiEnvironmentsToStorage(customList)
    if (typeof window !== 'undefined' && window.localStorage) {
      expect(window.localStorage.getItem(STORAGE_ENVIRONMENTS_KEY)).toContain('custom-1')
    }

    const loaded = loadApiEnvironments()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].id).toBe('custom-1')
    expect(loaded[0].apiKey).toBe('sec123')
  })

  it('devuelve la lista por defecto cuando no hay nada en storage', () => {
    const loaded = loadApiEnvironments()
    expect(loaded).toEqual(DEFAULT_API_ENVIRONMENTS)
    expect(loaded.length).toBeGreaterThanOrEqual(2)
  })
})
