import { describe, it, expect } from 'vitest'
import {
  normalizarNombre,
  getCodigoTipoLiquidacion,
  formatearPeriodo,
  generarNombreBoleta
} from '../boletas.js'

describe('normalizarNombre', () => {
  it('convierte a mayúsculas y reemplaza espacios por guiones bajos', () => {
    expect(normalizarNombre('Juan Carlos')).toBe('JUAN_CARLOS')
  })

  it('elimina tildes y caracteres especiales', () => {
    expect(normalizarNombre('García')).toBe('GARCIA')
    expect(normalizarNombre('Pérez-López')).toBe('PEREZLOPEZ')
  })

  it('devuelve el fallback cuando el texto está vacío', () => {
    expect(normalizarNombre('')).toBe('SIN_NOMBRE')
    expect(normalizarNombre(null)).toBe('SIN_NOMBRE')
    expect(normalizarNombre(undefined)).toBe('SIN_NOMBRE')
  })

  it('permite personalizar el fallback', () => {
    expect(normalizarNombre('', 'SIN_APELLIDO')).toBe('SIN_APELLIDO')
  })
})

describe('getCodigoTipoLiquidacion', () => {
  it('mapea liquidación mensual', () => {
    expect(getCodigoTipoLiquidacion('Mensual')).toBe('MEN')
    expect(getCodigoTipoLiquidacion('LIQUIDACION MENSUAL')).toBe('MEN')
  })

  it('mapea liquidación adicional', () => {
    expect(getCodigoTipoLiquidacion('Adicional')).toBe('ADI')
  })

  it('mapea cualquier variante de SAC a SAC', () => {
    expect(getCodigoTipoLiquidacion('SAC')).toBe('SAC')
    expect(getCodigoTipoLiquidacion('1SAC')).toBe('SAC')
    expect(getCodigoTipoLiquidacion('2SAC')).toBe('SAC')
    expect(getCodigoTipoLiquidacion('Sueldo Anual Complementario')).toBe('SAC')
  })

  it('devuelve GEN cuando no se puede determinar el tipo', () => {
    expect(getCodigoTipoLiquidacion('Otra liquidación')).toBe('GEN')
    expect(getCodigoTipoLiquidacion('')).toBe('GEN')
    expect(getCodigoTipoLiquidacion(null)).toBe('GEN')
  })
})

describe('formatearPeriodo', () => {
  it('convierte YYYY-MM a MMYYYY', () => {
    expect(formatearPeriodo('2026-08')).toBe('082026')
  })

  it('convierte YYYY/M a MMYYYY', () => {
    expect(formatearPeriodo('2026/8')).toBe('082026')
  })

  it('devuelve 000000 para períodos inválidos', () => {
    expect(formatearPeriodo('')).toBe('000000')
    expect(formatearPeriodo('invalido')).toBe('000000')
  })
})

describe('generarNombreBoleta', () => {
  it('genera el nombre con el formato esperado', () => {
    const nombre = generarNombreBoleta('2026-08', 'Mensual', 'García', 'Juan Carlos')
    expect(nombre).toBe('082026_MEN_GARCIA_JUAN_CARLOS.pdf')
  })

  it('usa los fallbacks cuando faltan apellido o nombre', () => {
    const nombre = generarNombreBoleta('2026-08', 'Mensual', '', null)
    expect(nombre).toBe('082026_MEN_SIN_APELLIDO_SIN_NOMBRE.pdf')
  })

  it('normaliza cualquier variante de SAC a SAC', () => {
    const nombre = generarNombreBoleta('2026-12', '2SAC', 'Pérez', 'Ana')
    expect(nombre).toBe('122026_SAC_PEREZ_ANA.pdf')
  })
})
