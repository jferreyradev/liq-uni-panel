import { describe, it, expect } from 'vitest'
import {
  getBoletaPdfFileName,
  getPeriodoFromMMYYYY,
  getFechaToAPIFromMMYYYY,
  getFechaToAPIFromDDMMYYYY
} from '../formatos.js'

describe('getBoletaPdfFileName', () => {
  it('genera nombre para liquidación mensual con tildes y espacios', () => {
    const result = getBoletaPdfFileName({
      periodo: '2026-08',
      tipoLiquidacion: 'Mensual',
      apellido: 'García',
      nombre: 'Juan Carlos'
    })
    expect(result).toBe('082026_MEN_GARCIA_JUAN_CARLOS.pdf')
  })

  it('genera nombre para liquidación adicional', () => {
    const result = getBoletaPdfFileName({
      periodo: '2025-03',
      tipoLiquidacion: 'Adicional',
      apellido: 'Pérez',
      nombre: 'María Elena'
    })
    expect(result).toBe('032025_ADI_PEREZ_MARIA_ELENA.pdf')
  })

  it('usa SAC sin prefijo numérico', () => {
    const result = getBoletaPdfFileName({
      periodo: '2024-12',
      tipoLiquidacion: 'Sueldo Anual Complementario',
      apellido: 'López',
      nombre: 'Ana'
    })
    expect(result).toBe('122024_SAC_LOPEZ_ANA.pdf')
  })

  it('ignora Content-Disposition genérico y usa el nombre controlado por el frontend', () => {
    const result = getBoletaPdfFileName({
      periodo: '2026-08',
      tipoLiquidacion: 'Mensual',
      apellido: 'García',
      nombre: 'Juan Carlos'
    })
    expect(result).not.toContain('BOLETA_ID')
    expect(result).not.toContain('BOLETA')
  })

  it('usa fallback GEN cuando no se puede determinar el tipo', () => {
    const result = getBoletaPdfFileName({
      periodo: '2023-07',
      tipoLiquidacion: 'Otro tipo',
      apellido: 'Martínez',
      nombre: 'Pedro'
    })
    expect(result).toBe('072023_GEN_MARTINEZ_PEDRO.pdf')
  })

  it('reemplaza caracteres especiales y espacios por guiones bajos', () => {
    const result = getBoletaPdfFileName({
      periodo: '2022-11',
      tipoLiquidacion: 'Mensual',
      apellido: 'Rodríguez-Suárez',
      nombre: 'José María  II'
    })
    expect(result).toBe('112022_MEN_RODRIGUEZ_SUAREZ_JOSE_MARIA_II.pdf')
  })

  it('convierte Ñ a N', () => {
    const result = getBoletaPdfFileName({
      periodo: '2021-05',
      tipoLiquidacion: 'Mensual',
      apellido: 'Ibañez',
      nombre: 'Raúl'
    })
    expect(result).toBe('052021_MEN_IBANEZ_RAUL.pdf')
  })

  it('usa SIN_APELLIDO y SIN_NOMBRE cuando faltan datos', () => {
    const result = getBoletaPdfFileName({
      periodo: '2020-01',
      tipoLiquidacion: 'Mensual',
      apellido: '',
      nombre: null
    })
    expect(result).toBe('012020_MEN_SIN_APELLIDO_SIN_NOMBRE.pdf')
  })
})

describe('getPeriodoFromMMYYYY y normalización de períodos', () => {
  it('garantiza formato DD/MM/YYYY con mes de dos dígitos a partir de M/YYYY', () => {
    expect(getPeriodoFromMMYYYY('9/2026')).toBe('01/09/2026')
    expect(getPeriodoFromMMYYYY('1/2025')).toBe('01/01/2025')
  })

  it('preserva formato DD/MM/YYYY a partir de MM/YYYY', () => {
    expect(getPeriodoFromMMYYYY('09/2026')).toBe('01/09/2026')
    expect(getPeriodoFromMMYYYY('12/2024')).toBe('01/12/2024')
  })

  it('normaliza si ya viene con DD/MM/YYYY o D/M/YYYY', () => {
    expect(getPeriodoFromMMYYYY('01/09/2026')).toBe('01/09/2026')
    expect(getPeriodoFromMMYYYY('01/9/2026')).toBe('01/09/2026')
    expect(getPeriodoFromMMYYYY('15/9/2026')).toBe('01/09/2026')
  })

  it('normaliza a partir de formatos con guiones YYYY-MM o YYYY-MM-DD', () => {
    expect(getPeriodoFromMMYYYY('2026-09')).toBe('01/09/2026')
    expect(getPeriodoFromMMYYYY('2026-9')).toBe('01/09/2026')
    expect(getPeriodoFromMMYYYY('2026-09-01')).toBe('01/09/2026')
  })

  it('maneja valores vacíos o nulos de forma segura', () => {
    expect(getPeriodoFromMMYYYY('')).toBe('')
    expect(getPeriodoFromMMYYYY(null)).toBe('')
    expect(getPeriodoFromMMYYYY(undefined)).toBe('')
  })
})

describe('getFechaToAPIFromMMYYYY', () => {
  it('convierte M/YYYY o MM/YYYY a ISO con mes de 2 dígitos', () => {
    expect(getFechaToAPIFromMMYYYY('9/2026')).toBe('2026-09-01T03:00:00.000Z')
    expect(getFechaToAPIFromMMYYYY('09/2026')).toBe('2026-09-01T03:00:00.000Z')
  })

  it('convierte DD/MM/YYYY o YYYY-MM a ISO de forma segura', () => {
    expect(getFechaToAPIFromMMYYYY('01/09/2026')).toBe('2026-09-01T03:00:00.000Z')
    expect(getFechaToAPIFromMMYYYY('2026-09')).toBe('2026-09-01T03:00:00.000Z')
  })
})

describe('getFechaToAPIFromDDMMYYYY', () => {
  it('convierte DD/MM/YYYY a ISO con día y mes con 2 dígitos', () => {
    expect(getFechaToAPIFromDDMMYYYY('1/9/2026')).toBe('2026-09-01T03:00:00.000Z')
    expect(getFechaToAPIFromDDMMYYYY('15/09/2026')).toBe('2026-09-15T03:00:00.000Z')
  })
})
