import { describe, it, expect } from 'vitest'
import {
  normalizeName,
  getTipoCodigo,
  formatPeriodo,
  isGenericFileName,
  extractFileName,
  generateBoletaFileName
} from '../useBoletaFileName'

describe('useBoletaFileName', () => {
  describe('normalizeName', () => {
    it('convierte a mayúsculas, quita tildes y reemplaza espacios por guiones bajos', () => {
      expect(normalizeName('García')).toBe('GARCIA')
      expect(normalizeName('Juan Carlos')).toBe('JUAN_CARLOS')
      expect(normalizeName('  María Elena  ')).toBe('MARIA_ELENA')
    })

    it('elimina caracteres especiales', () => {
      expect(normalizeName('Pérez-Méndez')).toBe('PEREZ_MENDEZ')
      expect(normalizeName('O\'Connor Jr.')).toBe('OCONNOR_JR')
    })

    it('devuelve el fallback cuando el valor está vacío', () => {
      expect(normalizeName('', 'SIN_APELLIDO')).toBe('SIN_APELLIDO')
      expect(normalizeName(null, 'SIN_NOMBRE')).toBe('SIN_NOMBRE')
      expect(normalizeName(undefined, 'VACIO')).toBe('VACIO')
      expect(normalizeName('   ', 'VACIO')).toBe('VACIO')
    })
  })

  describe('getTipoCodigo', () => {
    it('devuelve MEN para liquidación mensual', () => {
      expect(getTipoCodigo('Mensual')).toBe('MEN')
      expect(getTipoCodigo('mensual')).toBe('MEN')
      expect(getTipoCodigo('LIQUIDACIÓN MENSUAL')).toBe('MEN')
    })

    it('devuelve ADI para liquidación adicional', () => {
      expect(getTipoCodigo('Adicional')).toBe('ADI')
      expect(getTipoCodigo('adicional')).toBe('ADI')
      expect(getTipoCodigo('Grupo Adicional')).toBe('ADI')
    })

    it('devuelve SAC para sueldo anual complementario sin usar 1SAC ni 2SAC', () => {
      expect(getTipoCodigo('SAC')).toBe('SAC')
      expect(getTipoCodigo('Sueldo Anual Complementario')).toBe('SAC')
      expect(getTipoCodigo('sac')).toBe('SAC')
    })

    it('devuelve GEN como fallback para tipos desconocidos', () => {
      expect(getTipoCodigo('Liq Final')).toBe('GEN')
      expect(getTipoCodigo('Ayuda escolar')).toBe('GEN')
      expect(getTipoCodigo('')).toBe('GEN')
      expect(getTipoCodigo(null)).toBe('GEN')
    })
  })

  describe('formatPeriodo', () => {
    it('convierte YYYY-MM a MMYYYY', () => {
      expect(formatPeriodo('2026-08')).toBe('082026')
      expect(formatPeriodo('2024-01')).toBe('012024')
      expect(formatPeriodo('2024-12')).toBe('122024')
    })

    it('devuelve 000000 para períodos inválidos', () => {
      expect(formatPeriodo('')).toBe('000000')
      expect(formatPeriodo(null)).toBe('000000')
      expect(formatPeriodo('2024')).toBe('000000')
      expect(formatPeriodo('08-2026')).toBe('000000')
      expect(formatPeriodo('AAAA-MM')).toBe('000000')
    })
  })

  describe('isGenericFileName', () => {
    it('considera genéricos nombres vacíos, BOLETA o BOLETA_ID', () => {
      expect(isGenericFileName('')).toBe(true)
      expect(isGenericFileName(null)).toBe(true)
      expect(isGenericFileName('BOLETA')).toBe(true)
      expect(isGenericFileName('BOLETA.pdf')).toBe(true)
      expect(isGenericFileName('BOLETA_123.pdf')).toBe(true)
      expect(isGenericFileName('BOLETA_ID')).toBe(true)
    })

    it('considera no genéricos nombres personalizados', () => {
      expect(isGenericFileName('082026_MEN_GARCIA_JUAN_CARLOS.pdf')).toBe(false)
      expect(isGenericFileName('mi_boleta.pdf')).toBe(false)
    })
  })

  describe('extractFileName', () => {
    it('extrae el nombre de archivo de Content-Disposition', () => {
      expect(extractFileName('attachment; filename="boleta.pdf"')).toBe('boleta.pdf')
      expect(extractFileName("attachment; filename='boleta.pdf'")).toBe('boleta.pdf')
      expect(extractFileName("attachment; filename*=UTF-8''boleta.pdf")).toBe('boleta.pdf')
    })

    it('devuelve null si no hay header o no contiene filename', () => {
      expect(extractFileName('')).toBe(null)
      expect(extractFileName(null)).toBe(null)
      expect(extractFileName('attachment')).toBe(null)
    })
  })

  describe('generateBoletaFileName', () => {
    it('genera el nombre esperado con el ejemplo del requerimiento', () => {
      const boleta = {
        PERIODO: '2026-08',
        TIPOLIQUIDACIONDESCRIPCION: 'Mensual',
        APELLIDO: 'García',
        NOMBRE: 'Juan Carlos'
      }

      expect(generateBoletaFileName(boleta)).toBe('082026_MEN_GARCIA_JUAN_CARLOS.pdf')
    })

    it('usa SAC como código único para sueldo anual complementario', () => {
      const boleta = {
        PERIODO: '2026-06',
        TIPOLIQUIDACIONDESCRIPCION: 'SAC',
        APELLIDO: 'López',
        NOMBRE: 'Ana'
      }

      expect(generateBoletaFileName(boleta)).toBe('062026_SAC_LOPEZ_ANA.pdf')
    })

    it('usa ADI para liquidación adicional', () => {
      const boleta = {
        PERIODO: '2026-03',
        TIPOLIQUIDACIONDESCRIPCION: 'Adicional',
        APELLIDO: 'Martínez',
        NOMBRE: 'Pedro'
      }

      expect(generateBoletaFileName(boleta)).toBe('032026_ADI_MARTINEZ_PEDRO.pdf')
    })

    it('usa GEN para tipos desconocidos y valores vacíos', () => {
      const boleta = {
        PERIODO: '',
        TIPOLIQUIDACIONDESCRIPCION: 'Otro',
        APELLIDO: '',
        NOMBRE: ''
      }

      expect(generateBoletaFileName(boleta)).toBe('000000_GEN_SIN_APELLIDO_SIN_NOMBRE.pdf')
    })

    it('normaliza correctamente apellidos y nombres con caracteres especiales', () => {
      const boleta = {
        PERIODO: '2026-08',
        TIPOLIQUIDACIONDESCRIPCION: 'Mensual',
        APELLIDO: 'García-Méndez',
        NOMBRE: 'José María'
      }

      expect(generateBoletaFileName(boleta)).toBe('082026_MEN_GARCIA_MENDEZ_JOSE_MARIA.pdf')
    })
  })
})
