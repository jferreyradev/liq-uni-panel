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

vi.mock('@/shared/components/RepoHeader.vue', () => ({
  default: { template: '<div><slot /></div>' }
}))

import RepoResumenLiq from '../components/RepoResumenLiq.vue'
import RepoCod153 from '../components/RepoCod153.vue'
import RepoResumenCod from '../components/RepoResumenCod.vue'
import RepoResumenLiqFDO from '../components/RepoResumenLiqFdo.vue'
import RepoApoPatronales from '../components/RepoApoPatronales.vue'
import RepoPlanillaDetLiq from '../components/RepoPlanillaDetLiq.vue'
import RepoPlanillaRet from '../components/RepoPlanillaRet.vue'
import RepoPlanillaLey from '../components/RepoPlanillaLey.vue'
import RepoPlanillaResSueldo from '../components/RepoPlanillaResSueldo.vue'
import RepoPlanillaRetCargo from '../components/RepoPlanillaRetCargo.vue'
import RepoPlanillaRetencionesCPA from '../components/RepoPlanillaRetencionesCPA.vue'
import RepoBajasLey from '../components/RepoBajasLey.vue'
import RepoPlanillaResSueldoComp from '../components/RepoPlanillaResSueldoComp.vue'
import RepoPlanillaResumenCargos from '../components/RepoPlanillaResumenCargos.vue'

/** Componentes de Vuetify usados por los reportes: se stubean para que
 * Vue no avise por cada componente no resuelto (el ruido tapaba warnings
 * reales) y para no depender del registro global de Vuetify. */
const stubsVuetify = {
  'v-container': true,
  'v-row': true,
  'v-col': true,
  'v-card': true,
  'v-btn': true,
  'v-data-table': true,
  'v-alert': true
}

describe('Reportes Endpoints - Verificación de URLs de API para cada componente', () => {
  beforeEach(() => {
    fetchUrls.length = 0
  })

  it('RepoResumenLiq (Reporte 1) consulta /api/repo/resumenLiq', () => {
    shallowMount(RepoResumenLiq, { global: { stubs: stubsVuetify } })
    expect(fetchUrls.some((u) => u.includes('https://api.midliq.test/api/repo/resumenLiq?periodo=202409'))).toBe(true)
  })

  it('RepoCod153 (Reporte 2) consulta /api/view/resumenCodigo con Codigo=153', () => {
    shallowMount(RepoCod153, { global: { stubs: stubsVuetify } })
    expect(fetchUrls.some((u) => u.includes('/api/view/resumenCodigo') && u.includes('Codigo=153'))).toBe(true)
  })

  it('RepoResumenCod (Reporte 4) consulta /api/view/resumenCodLiq', () => {
    shallowMount(RepoResumenCod, { global: { stubs: stubsVuetify } })
    expect(fetchUrls.some((u) => u.includes('/api/view/resumenCodLiq'))).toBe(true)
  })

  it('RepoResumenLiqFDO (Reporte 5) consulta /api/view/resumenFdo', () => {
    shallowMount(RepoResumenLiqFDO, { global: { stubs: stubsVuetify } })
    expect(fetchUrls.some((u) => u.includes('/api/view/resumenFdo'))).toBe(true)
  })

  it('RepoApoPatronales (Reporte 6) consulta /api/view/aportesPat', () => {
    shallowMount(RepoApoPatronales, { global: { stubs: stubsVuetify } })
    expect(fetchUrls.some((u) => u.includes('/api/view/aportesPat'))).toBe(true)
  })

  it('RepoPlanillaDetLiq (Reporte 7) consulta /api/view/planillaDetLiq', () => {
    shallowMount(RepoPlanillaDetLiq, { global: { stubs: stubsVuetify } })
    expect(fetchUrls.some((u) => u.includes('/api/view/planillaDetLiq'))).toBe(true)
  })

  it('RepoPlanillaRet (Reporte 8) consulta /api/view/planillaRet', () => {
    shallowMount(RepoPlanillaRet, { global: { stubs: stubsVuetify } })
    expect(fetchUrls.some((u) => u.includes('/api/view/planillaRet'))).toBe(true)
  })

  it('RepoPlanillaLey (Reporte 9) consulta /api/view/planillaLey', () => {
    shallowMount(RepoPlanillaLey, { global: { stubs: stubsVuetify } })
    expect(fetchUrls.some((u) => u.includes('/api/view/planillaLey'))).toBe(true)
  })

  it('RepoPlanillaResSueldo (Reporte 10) consulta /api/view/resumenSueldos', () => {
    shallowMount(RepoPlanillaResSueldo, { global: { stubs: stubsVuetify } })
    expect(fetchUrls.some((u) => u.includes('/api/view/resumenSueldos'))).toBe(true)
  })

  it('RepoPlanillaRetCargo (Reporte 12) consulta /api/view/retencionesCargo', () => {
    shallowMount(RepoPlanillaRetCargo, { global: { stubs: stubsVuetify } })
    expect(fetchUrls.some((u) => u.includes('/api/view/retencionesCargo'))).toBe(true)
  })

  it('RepoPlanillaRetencionesCPA (Reporte 11) consulta /api/view/planillaRetCPA', () => {
    shallowMount(RepoPlanillaRetencionesCPA, { global: { stubs: stubsVuetify } })
    expect(fetchUrls.some((u) => u.includes('/api/view/planillaRetCPA'))).toBe(true)
  })

  it('RepoBajasLey (Reporte 13) consulta /api/view/bajasLey', () => {
    shallowMount(RepoBajasLey, { global: { stubs: stubsVuetify } })
    expect(fetchUrls.some((u) => u.includes('/api/view/bajasLey'))).toBe(true)
  })

  it('RepoPlanillaResSueldoComp (Reporte 14) consulta /api/view/resumenSueldosComp', () => {
    shallowMount(RepoPlanillaResSueldoComp, { global: { stubs: stubsVuetify } })
    expect(fetchUrls.some((u) => u.includes('/api/view/resumenSueldosComp'))).toBe(true)
  })

  it('RepoPlanillaResumenCargos (Reporte 15) consulta /api/view/resumenCargos', () => {
    shallowMount(RepoPlanillaResumenCargos, { global: { stubs: stubsVuetify } })
    expect(fetchUrls.some((u) => u.includes('/api/view/resumenCargos'))).toBe(true)
  })
})
