// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

/**
 * Regresion de los reportes: la fila de totales se renderiza en el slot
 * `body.append` de la grilla.
 *
 * Por que importa: si el nombre del slot queda mal escrito (o se usa una
 * forma de `v-slot` que no llega al componente), la fila de totales desaparece
 * en silencio: el reporte se ve completo y los importes no cierran. Nadie lo
 * detecta salvo que alguien mire el PDF exportado.
 *
 * Vuetify lee el slot como `slots['body.append']` (VDataTable.mjs), asi que el
 * stub de la grilla reproduce exactamente ese contrato.
 */

const datosPrueba = [
  { IMPORTE: 100, IDREP: 1, ORDEN: 1, DOCUMENTO: '1', APENOM: 'A', CODIGO: 1, SUBCODIGO: 1, DESCRIPCION: 'x', VTO: '2024-01', CLASE: 'A', DIAS: 30, FECHADEV: '2024-01-01' },
  { IMPORTE: 250.5, IDREP: 2, ORDEN: 2, DOCUMENTO: '2', APENOM: 'B', CODIGO: 2, SUBCODIGO: 2, DESCRIPCION: 'y', VTO: '2024-02', CLASE: 'B', DIAS: 31, FECHADEV: '2024-02-01' }
]

vi.mock('@/composables/useFetch', () => ({
  useFetch: () => ({
    data: ref(datosPrueba),
    error: ref(null),
    isPending: ref(false)
  })
}))

vi.mock('@/stores/filterStore', () => ({
  useFilterStore: () => ({ filterString: 'periodo=202409&tipo=1&adicional=0' })
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

import RepoPlanillaDetLiq from '../components/RepoPlanillaDetLiq.vue'
import RepoPlanillaRet from '../components/RepoPlanillaRet.vue'
import RepoPlanillaRetencionesCPA from '../components/RepoPlanillaRetencionesCPA.vue'
import RepoPlanillaLey from '../components/RepoPlanillaLey.vue'

/**
 * Stub fiel al contrato de Vuetify: la grilla expone el slot `body.append`
 * dentro del `<tbody>` y el slot `item` por cada fila.
 */
const stubs = {
  'v-container': { template: '<div><slot /></div>' },
  'v-row': { template: '<div><slot /></div>' },
  'v-btn': { template: '<button><slot /></button>' },
  'v-data-table': {
    props: ['items', 'headers'],
    template: `
      <table>
        <tbody>
          <template v-for="(item, i) in items" :key="i"><slot name="item" :item="item" /></template>
          <slot name="body.append" />
        </tbody>
      </table>
    `
  }
}

function montar(componente) {
  return mount(componente, { global: { stubs } })
}

/** La fila de totales es la ultima fila directa del cuerpo de la grilla. */
function filaDeTotales(wrapper) {
  return wrapper.find('tbody > tr:last-child')
}

describe('Reportes: fila de totales', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('RepoPlanillaDetLiq suma los importes en la fila de totales', () => {
    const wrapper = montar(RepoPlanillaDetLiq)

    const fila = filaDeTotales(wrapper)
    expect(fila.exists()).toBe(true)
    expect(fila.text()).toContain('350.50')
  })

  it('RepoPlanillaRet suma los importes en la fila de totales', () => {
    const wrapper = montar(RepoPlanillaRet)

    const fila = filaDeTotales(wrapper)
    expect(fila.exists()).toBe(true)
    expect(fila.text()).toContain('350.50')
  })

  it('RepoPlanillaRetencionesCPA suma los importes en la fila de totales', () => {
    const wrapper = montar(RepoPlanillaRetencionesCPA)

    const fila = filaDeTotales(wrapper)
    expect(fila.exists()).toBe(true)
    expect(fila.text()).toContain('350.50')
  })

  it('RepoPlanillaLey suma los importes en la fila de totales', () => {
    const wrapper = montar(RepoPlanillaLey)

    const fila = filaDeTotales(wrapper)
    expect(fila.exists()).toBe(true)
    expect(fila.text()).toContain('350.50')
  })
})
