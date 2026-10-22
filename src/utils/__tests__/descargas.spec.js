// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { descargarDesdeUrl, descargarDesdeBlob } from '../descargas.js'

describe('utilidades de descarga', () => {
  let clickSpy

  beforeEach(() => {
    vi.useFakeTimers()
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    global.URL.createObjectURL = vi.fn(() => 'blob:creado')
    global.URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('descargarDesdeUrl', () => {
    it('dispara el click sobre un ancla con el nombre pedido', () => {
      const resultado = descargarDesdeUrl('blob:existente', 'planilla.txt')

      expect(resultado).toBe(true)
      expect(clickSpy).toHaveBeenCalledTimes(1)

      const ancla = clickSpy.mock.instances[0]
      expect(ancla.getAttribute('href')).toBe('blob:existente')
      expect(ancla.getAttribute('download')).toBe('planilla.txt')
    })

    it('saca el ancla del documento', () => {
      descargarDesdeUrl('blob:existente', 'planilla.txt')

      expect(document.querySelectorAll('a')).toHaveLength(0)
    })

    it('libera la URL con retardo, no en el mismo tick', () => {
      descargarDesdeUrl('blob:existente', 'planilla.txt')

      expect(global.URL.revokeObjectURL).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1000)

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:existente')
    })

    it('no hace nada si no hay URL', () => {
      expect(descargarDesdeUrl('', 'planilla.txt')).toBe(false)
      expect(descargarDesdeUrl(null, 'planilla.txt')).toBe(false)
      expect(clickSpy).not.toHaveBeenCalled()
    })
  })

  describe('descargarDesdeBlob', () => {
    it('crea la object URL y dispara la descarga', () => {
      const blob = new Blob(['contenido'], { type: 'text/plain' })

      const resultado = descargarDesdeBlob(blob, 'archivo.txt')

      expect(resultado).toBe(true)
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(blob)
      expect(clickSpy).toHaveBeenCalledTimes(1)
    })

    it('no hace nada si no hay blob', () => {
      expect(descargarDesdeBlob(null, 'archivo.txt')).toBe(false)
      expect(global.URL.createObjectURL).not.toHaveBeenCalled()
    })
  })
})
