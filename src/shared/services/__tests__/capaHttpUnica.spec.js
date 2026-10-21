// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'

/**
 * Guard de arquitectura: el trafico HTTP del proyecto debe salir por un unico
 * punto, el cliente unico (src/shared/services/httpClient.js).
 *
 * Si este test falla, hay un fetch() directo que se escapa del cliente y hay
 * que migrarlo (no agregar excepciones: la idea es que no vuelva a haber
 * varias capas HTTP conviviendo).
 */

const CLIENTE_UNICO = 'src/shared/services/httpClient.js'

// Se leen los fuentes crudos de todo el proyecto.
const fuentesCrudos = import.meta.glob('/src/**/*.{js,vue}', {
  eager: true,
  query: '?raw',
  import: 'default',
})

// Las claves de import.meta.glob vienen con "/" inicial: se normalizan.
const fuentes = Object.fromEntries(
  Object.entries(fuentesCrudos).map(([ruta, contenido]) => [ruta.replace(/^\//, ''), contenido])
)

const REGEX_FETCH_DIRECTO = new RegExp(
  '(^|[^\\w$.])fetch\\s*\\(|\\b(?:window|globalThis|self)\\.fetch\\s*\\('
)

describe('capa HTTP unica', () => {
  it('no hay llamadas a fetch() fuera del cliente unico', () => {
    const ofensores = []

    for (const [ruta, contenido] of Object.entries(fuentes)) {
      if (ruta.includes('__tests__')) continue
      if (ruta === CLIENTE_UNICO) continue
      if (typeof contenido !== 'string') continue

      // window.fetch( / globalThis.fetch( también cuentan como acceso directo
      if (REGEX_FETCH_DIRECTO.test(contenido)) {
        ofensores.push(ruta)
      }
    }

    expect(ofensores).toEqual([])
  })

  it('el cliente unico es el unico archivo que invoca fetch', () => {
    const conFetch = Object.entries(fuentes)
      .filter(([ruta, contenido]) => !ruta.includes('__tests__'))
      .filter(([, contenido]) => typeof contenido === 'string' && /fetch\s*\(/.test(contenido))
      .map(([ruta]) => ruta)

    expect(conFetch).toEqual([CLIENTE_UNICO])
  })

  it('no queda el cliente duplicado useApiClient', () => {
    const existe = Object.keys(fuentes).some((ruta) => ruta.endsWith('useApiClient.js'))

    expect(existe).toBe(false)
  })
})
