// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useDDJJStatus, calcularPeriodoId } from '../useDDJJStatus'

vi.mock('@/shared/services/apiService', () => ({
  leerDatos: vi.fn(),
}))

import { leerDatos } from '@/shared/services/apiService'

describe('useDDJJStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calcularPeriodoId', () => {
    it('convierte formato MM/YYYY a YYYYMM', () => {
      expect(calcularPeriodoId('11/2026')).toBe(202611)
      expect(calcularPeriodoId('05/2025')).toBe(202505)
      expect(calcularPeriodoId('1/2024')).toBe(202401)
    })

    it('convierte formato DD/MM/YYYY a YYYYMM', () => {
      expect(calcularPeriodoId('01/11/2026')).toBe(202611)
      expect(calcularPeriodoId('15/04/2025')).toBe(202504)
    })

    it('convierte formato YYYY-MM a YYYYMM', () => {
      expect(calcularPeriodoId('2026-11')).toBe(202611)
      expect(calcularPeriodoId('2025-08')).toBe(202508)
    })

    it('devuelve null ante valores inválidos o vacíos', () => {
      expect(calcularPeriodoId('')).toBe(null)
      expect(calcularPeriodoId(null)).toBe(null)
      expect(calcularPeriodoId('invalido')).toBe(null)
      expect(calcularPeriodoId('99/2026')).toBe(null)
    })
  })

  describe('consulta de DDJJ', () => {
    it('detecta DDJJ existente cuando djPrevResumenDJ devuelve datos', async () => {
      leerDatos.mockImplementation(async (url) => {
        if (url.includes('djPrevResumenDJ')) {
          return { operacionOk: true, datos: [{ TOTAL_BRUTO: 100000 }] }
        }
        return { operacionOk: true, datos: [] }
      })

      const periodo = ref('11/2026')
      const { ddjjExiste, isChecking, ddjjResumen, checkDDJJ } = useDDJJStatus()

      await checkDDJJ(periodo.value)

      expect(ddjjExiste.value).toBe(true)
      expect(isChecking.value).toBe(false)
      expect(ddjjResumen.value).toEqual({ TOTAL_BRUTO: 100000 })
      expect(leerDatos).toHaveBeenCalledWith('djPrevResumenDJ?Id=202611')
    })

    it('detecta DDJJ existente cuando hay liquidaciones asociadas', async () => {
      leerDatos.mockImplementation(async (url) => {
        if (url.includes('djPrevResumenDJ')) {
          return { operacionOk: true, datos: [] }
        }
        if (url.includes('view/djPrevLiqsPeriodoDJ')) {
          return { operacionOk: true, datos: [{ ID: 1, PERIODOLIQ: '01/11/2026' }] }
        }
        return { operacionOk: false, datos: null }
      })

      const { ddjjExiste, liquidaciones, checkDDJJ } = useDDJJStatus()
      await checkDDJJ('11/2026')

      expect(ddjjExiste.value).toBe(true)
      expect(liquidaciones.value.length).toBe(1)
    })

    it('marca ddjjExiste como false cuando no hay registros ni resumen', async () => {
      leerDatos.mockResolvedValue({ operacionOk: true, datos: [] })

      const { ddjjExiste, checkDDJJ } = useDDJJStatus()
      await checkDDJJ('11/2026')

      expect(ddjjExiste.value).toBe(false)
    })

    it('reacciona reactivamente al cambio de periodoRef', async () => {
      leerDatos.mockResolvedValue({ operacionOk: true, datos: [] })

      const periodo = ref('')
      const { ddjjExiste } = useDDJJStatus(periodo)

      expect(ddjjExiste.value).toBe(false)

      leerDatos.mockResolvedValueOnce({
        operacionOk: true,
        datos: [{ TOTAL_BRUTO: 50000 }]
      })

      periodo.value = '12/2026'
      // Esperar microtareas del watch
      await new Promise((r) => setTimeout(r, 10))

      expect(leerDatos).toHaveBeenCalledWith('djPrevResumenDJ?Id=202612')
      expect(ddjjExiste.value).toBe(true)
    })
  })
})
