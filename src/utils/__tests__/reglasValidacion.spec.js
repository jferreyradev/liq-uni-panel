import { describe, it, expect } from 'vitest'
import { rules } from '../reglasValidacion'

describe('reglasValidacion - Validación de reglas de entrada', () => {
  it('longitudEntre valida rangos y no falla ante null o undefined', () => {
    expect(rules.longitudEntre(null, 1, 10)).toBe('El campo es requerido')
    expect(rules.longitudEntre(undefined, 1, 10)).toBe('El campo es requerido')
    expect(rules.longitudEntre('12345', 1, 5)).toBe(true)
    expect(rules.longitudEntre(12345, 1, 5)).toBe(true)
    expect(rules.longitudEntre('123456', 1, 5)).toContain('Se acepta entre 1 y 5 caracteres')
  })

  it('longitudEntreONull permite null o vacío sin fallar', () => {
    expect(rules.longitudEntreONull(null, 1, 5)).toBe(true)
    expect(rules.longitudEntreONull(undefined, 1, 5)).toBe(true)
    expect(rules.longitudEntreONull('', 1, 5)).toBe(true)
    expect(rules.longitudEntreONull('123', 1, 5)).toBe(true)
    expect(rules.longitudEntreONull('123456', 1, 5)).toContain('Se acepta entre 1 y 5 caracteres')
  })

  it('longitudMax y longitudMin manejan null y undefined adecuadamente', () => {
    expect(rules.longitudMax(null, 5)).toBe(true)
    expect(rules.longitudMax(undefined, 5)).toBe(true)
    expect(rules.longitudMax('12345', 5)).toBe(true)
    expect(rules.longitudMax('123456', 5)).toContain('se aceptan hasta 5 caracteres')

    expect(rules.longitudMin(null, 3)).toContain('ingresar al menos 3 caracteres')
    expect(rules.longitudMin(undefined, 3)).toContain('ingresar al menos 3 caracteres')
    expect(rules.longitudMin('abc', 3)).toBe(true)
  })
})
