import { describe, it, expect } from 'vitest'
import {
  SP_OK,
  SP_ERROR,
  toErrorCode,
  resolveSpErrorCode,
  extractSpMessage,
  isSpOk
} from '../spRespuesta.js'

describe('toErrorCode', () => {
  it('interpreta números', () => {
    expect(toErrorCode(0)).toBe(0)
    expect(toErrorCode(3)).toBe(3)
    expect(toErrorCode(-1)).toBe(-1)
  })

  it('interpreta strings numéricos', () => {
    expect(toErrorCode('0')).toBe(0)
    expect(toErrorCode('12')).toBe(12)
  })

  it('devuelve undefined cuando no hay dato', () => {
    expect(toErrorCode(undefined)).toBeUndefined()
    expect(toErrorCode(null)).toBeUndefined()
    expect(toErrorCode('')).toBeUndefined()
  })

  it('devuelve -1 cuando el dato no es numérico', () => {
    expect(toErrorCode('Error en el servidor')).toBe(SP_ERROR)
    expect(toErrorCode(NaN)).toBe(SP_ERROR)
  })
})

describe('resolveSpErrorCode', () => {
  it('usa el valorError informado por el servicio', () => {
    expect(resolveSpErrorCode({ operacionOk: true, valorError: 0 })).toBe(SP_OK)
    expect(resolveSpErrorCode({ operacionOk: true, valorError: 3 })).toBe(3)
  })

  it('busca el código en el payload cuando valorError no es utilizable', () => {
    expect(
      resolveSpErrorCode({
        operacionOk: true,
        valorError: -1,
        out: { vError: 7 }
      })
    ).toBe(7)

    expect(
      resolveSpErrorCode({
        operacionOk: true,
        valorError: -1,
        datos: { out: { vError: 9 } }
      })
    ).toBe(9)
  })

  it('devuelve 0 cuando la operación fue exitosa y no hay código', () => {
    expect(resolveSpErrorCode({ operacionOk: true })).toBe(SP_OK)
  })

  it('devuelve -1 cuando la operación falló', () => {
    expect(resolveSpErrorCode({ operacionOk: false, valorError: -1 })).toBe(SP_ERROR)
  })

  it('no se deja contaminar por un NaN vindo del backend', () => {
    const codigo = resolveSpErrorCode({
      operacionOk: true,
      valorError: NaN,
      out: { vError: 'mensaje de error' }
    })

    expect(codigo).toBe(SP_ERROR)
    expect(Number.isNaN(codigo)).toBe(false)
  })

  it('no reporta éxito cuando el backend devolvió un error no numérico', () => {
    const codigo = resolveSpErrorCode({
      operacionOk: true,
      valorError: -1,
      out: { error: 'No se pudo grabar' }
    })

    expect(codigo).toBe(SP_ERROR)
  })
})

describe('extractSpMessage', () => {
  it('prioriza el errorMsg del servicio', () => {
    expect(
      extractSpMessage({ errorMsg: 'Mensaje del SP', out: { vErrorMsg: 'Otro' } })
    ).toBe('Mensaje del SP')
  })

  it('busca el mensaje en las distintas envolturas', () => {
    expect(extractSpMessage({ out: { vErrorMsg: 'Desde out' } })).toBe('Desde out')
    expect(extractSpMessage({ datos: { out: { vErrorMsg: 'Desde datos' } } })).toBe(
      'Desde datos'
    )
    expect(extractSpMessage({ out: { error: 'Mensaje plano' } })).toBe('Mensaje plano')
  })

  it('devuelve el fallback si no hay mensaje', () => {
    expect(extractSpMessage({}, 'Sin mensaje')).toBe('Sin mensaje')
  })
})

describe('isSpOk', () => {
  it('es true solo con operación exitosa y código 0', () => {
    expect(isSpOk({ operacionOk: true, valorError: 0 })).toBe(true)
    expect(isSpOk({ operacionOk: true, valorError: 2 })).toBe(false)
    expect(isSpOk({ operacionOk: false, valorError: 0 })).toBe(false)
  })
})
