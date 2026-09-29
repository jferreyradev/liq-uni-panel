// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'

const fetchUrls = []

vi.mock('@/composables/useFetch', () => ({
  useFetch: (urlGetter) => {
    const url = typeof urlGetter === 'function' ? urlGetter() : urlGetter
    fetchUrls.push(url)
    return {
      data: ref([]),
      error: ref(null),
      isPending: ref(false)
    }
  }
}))

vi.mock('@/stores/filterStore', () => ({
  useFilterStore: () => ({
    filterString: 'periodo=202409&tipo=1&adicional=0'
  })
}))

vi.mock('@/composables/useEndPoints', () => ({
  useEndPoints: () => ({
    apiBase: { value: 'https://api.midliq.test' },
    buildApiHeaders: () => ({ 'x-project-key': 'testKey' })
  })
}))

vi.mock('../RepoHeader.vue', () => ({
  default: { template: '<div><slot /></div>' }
}))

import RepoResumenLiq from '../RepoResumenLiq.vue'
import RepoCod153 from '../RepoCod153.vue'
import RepoResumenCod from '../RepoResumenCod.vue'
import RepoResumenLiqFDO from '../RepoResumenLiqFdo.vue'
import RepoApoPatronales from '../RepoApoPatronales.vue'
import RepoPlanillaDetLiq from '../RepoPlanillaDetLiq.vue'
import RepoPlanillaRet from '../RepoPlanillaRet.vue'
import RepoPlanillaLey from '../RepoPlanillaLey.vue'
import RepoPlanillaResSueldo from '../RepoPlanillaResSueldo.vue'
import RepoPlanillaRetCargo from '../RepoPlanillaRetCargo.vue'
import RepoPlanillaRetencionesCPA from '../RepoPlanillaRetencionesCPA.vue'
import RepoBajasLey from '../RepoBajasLey.vue'
import RepoPlanillaResSueldoComp from '../RepoPlanillaResSueldoComp.vue'
import RepoPlanillaResumenCargos from '../RepoPlanillaResumenCargos.vue'

describe('Reportes Endpoints - Verificación de URLs de API para cada componente', () => {
  beforeEach(() => {
    fetchUrls.length = 0
  })

  it('RepoResumenLiq (Reporte 1) consulta /api/repo/resumenLiq', () => {
    shallowMount(RepoResumenLiq)
    expect(fetchUrls.some((u) => u.includes('https://api.midliq.test/api/repo/resumenLiq?periodo=202409'))).toBe(true)
  })

  it('RepoCod153 (Reporte 2) consulta /api/view/resumenCodigo con Codigo=153', () => {
    shallowMount(RepoCod153)
    expect(fetchUrls.some((u) => u.includes('/api/view/resumenCodigo') && u.includes('Codigo=153'))).toBe(true)
  })

  it('RepoResumenCod (Reporte 4) consulta /api/view/resumenCodLiq', () => {
    shallowMount(RepoResumenCod)
    expect(fetchUrls.some((u) => u.includes('/api/view/resumenCodLiq'))).toBe(true)
  })

  it('RepoResumenLiqFDO (Reporte 5) consulta /api/view/resumenFdo', () => {
    shallowMount(RepoResumenLiqFDO)
    expect(fetchUrls.some((u) => u.includes('/api/view/resumenFdo'))).toBe(true)
  })

  it('RepoApoPatronales (Reporte 6) consulta /api/view/aportesPat', () => {
    shallowMount(RepoApoPatronales)
    expect(fetchUrls.some((u) => u.includes('/api/view/aportesPat'))).toBe(true)
  })

  it('RepoPlanillaDetLiq (Reporte 7) consulta /api/view/planillaDetLiq', () => {
    shallowMount(RepoPlanillaDetLiq)
    expect(fetchUrls.some((u) => u.includes('/api/view/planillaDetLiq'))).toBe(true)
  })

  it('RepoPlanillaRet (Reporte 8) consulta /api/view/planillaRet', () => {
    shallowMount(RepoPlanillaRet)
    expect(fetchUrls.some((u) => u.includes('/api/view/planillaRet'))).toBe(true)
  })

  it('RepoPlanillaLey (Reporte 9) consulta /api/view/planillaLey', () => {
    shallowMount(RepoPlanillaLey)
    expect(fetchUrls.some((u) => u.includes('/api/view/planillaLey'))).toBe(true)
  })

  it('RepoPlanillaResSueldo (Reporte 10) consulta /api/view/resumenSueldos', () => {
    shallowMount(RepoPlanillaResSueldo)
    expect(fetchUrls.some((u) => u.includes('/api/view/resumenSueldos'))).toBe(true)
  })

  it('RepoPlanillaRetCargo (Reporte 12) consulta /api/view/retencionesCargo', () => {
    shallowMount(RepoPlanillaRetCargo)
    expect(fetchUrls.some((u) => u.includes('/api/view/retencionesCargo'))).toBe(true)
  })

  it('RepoPlanillaRetencionesCPA (Reporte 11) consulta /api/view/planillaRetCPA', () => {
    shallowMount(RepoPlanillaRetencionesCPA)
    expect(fetchUrls.some((u) => u.includes('/api/view/planillaRetCPA'))).toBe(true)
  })

  it('RepoBajasLey (Reporte 13) consulta /api/view/bajasLey', () => {
    shallowMount(RepoBajasLey)
    expect(fetchUrls.some((u) => u.includes('/api/view/bajasLey'))).toBe(true)
  })

  it('RepoPlanillaResSueldoComp (Reporte 14) consulta /api/view/resumenSueldosComp', () => {
    shallowMount(RepoPlanillaResSueldoComp)
    expect(fetchUrls.some((u) => u.includes('/api/view/resumenSueldosComp'))).toBe(true)
  })

  it('RepoPlanillaResumenCargos (Reporte 15) consulta /api/view/resumenCargos', () => {
    shallowMount(RepoPlanillaResumenCargos)
    expect(fetchUrls.some((u) => u.includes('/api/view/resumenCargos'))).toBe(true)
  })
})
