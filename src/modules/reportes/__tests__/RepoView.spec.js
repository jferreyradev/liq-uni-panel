// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import RepoView from '../views/RepoView.vue'
import { useTenantStore } from '@/stores/tenantStore'

describe('RepoView - Disponibilidad y filtrado de reportes por municipio', () => {
  let pinia
  let tenantStore

  const VSwitchStub = {
    name: 'VSwitch',
    props: ['modelValue', 'label'],
    emits: ['update:modelValue'],
    template: '<div class="v-switch-stub"></div>'
  }

  const VSelectStub = {
    name: 'VSelect',
    props: ['items', 'modelValue', 'itemTitle', 'itemValue'],
    emits: ['update:modelValue'],
    template: '<div class="v-select-stub"></div>'
  }

  const stubs = {
    'v-container': { template: '<div><slot /></div>' },
    'v-row': { template: '<div><slot /></div>' },
    'v-chip': { template: '<span><slot /></span>' },
    'v-switch': VSwitchStub,
    'v-select': VSelectStub,
    LiqInputPanel: { template: '<div><slot /></div>' },
    RepoResumenLiq: { template: '<div data-test="repo-1">Resumen Liquidacion</div>' },
    RepoCod153: { template: '<div data-test="repo-2">Cod 153</div>' },
    RepoResumenCod: { template: '<div data-test="repo-4">Resumen Codigos</div>' },
    RepoResumenLiqFDO: { template: '<div data-test="repo-5">Resumen FDO</div>' },
    RepoApoPatronales: { template: '<div data-test="repo-6">Aportes Patronales</div>' },
    RepoPlanillaDetLiq: { template: '<div data-test="repo-7">Planilla Det Liq</div>' },
    RepoPlanillaRet: { template: '<div data-test="repo-8">Planilla Ret</div>' },
    RepoPlanillaLey: { template: '<div data-test="repo-9">Planilla Ley</div>' },
    RepoPlanillaResSueldo: { template: '<div data-test="repo-10">Resumen Sueldos</div>' },
    RepoPlanillaRetencionesCPA: { template: '<div data-test="repo-11">Ret CPA</div>' },
    RepoPlanillaRetCargo: { template: '<div data-test="repo-12">Ret Cargo</div>' },
    RepoBajasLey: { template: '<div data-test="repo-13">Bajas Ley</div>' },
    RepoPlanillaResSueldoComp: { template: '<div data-test="repo-14">Res Sueldo Comp</div>' },
    RepoPlanillaResumenCargos: { template: '<div data-test="repo-15">Resumen Cargos</div>' }
  }

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    tenantStore = useTenantStore()
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear()
    }
  })

  function createWrapper() {
    return mount(RepoView, {
      global: {
        plugins: [pinia],
        stubs
      }
    })
  }

  it('inicializa con Concepción por defecto y muestra exactamente los 11 reportes habilitados', () => {
    const wrapper = createWrapper()
    const select = wrapper.findComponent(VSelectStub)
    const items = select.props('items')
    const itemValues = items.map((i) => i.value)

    expect(itemValues).toEqual([4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    expect(itemValues).not.toContain(1)
    expect(itemValues).not.toContain(2)
    expect(itemValues).not.toContain(5)
  })

  it('actualiza reactivamente los reportes a [1, 2, 4, 5] al cambiar al municipio Trancas', async () => {
    const wrapper = createWrapper()
    tenantStore.setTenant('trancas')
    await nextTick()

    const select = wrapper.findComponent(VSelectStub)
    const items = select.props('items')
    const itemValues = items.map((i) => i.value)

    expect(itemValues).toEqual([1, 2, 4, 5])
    expect(itemValues).not.toContain(6)
    expect(itemValues).not.toContain(7)
  })

  it('actualiza reactivamente los reportes al cambiar a Burruyacú y Tafí Viejo', async () => {
    const wrapper = createWrapper()

    tenantStore.setTenant('burruyacu')
    await nextTick()
    let select = wrapper.findComponent(VSelectStub)
    expect(select.props('items').map((i) => i.value)).toEqual([4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])

    tenantStore.setTenant('tafiviejo')
    await nextTick()
    select = wrapper.findComponent(VSelectStub)
    expect(select.props('items').map((i) => i.value)).toEqual([4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
  })

  it('muestra el catálogo completo de 14 reportes cuando se activa showAllReports', async () => {
    const wrapper = createWrapper()
    tenantStore.setTenant('trancas')
    await nextTick()

    const switchComp = wrapper.findComponent(VSwitchStub)
    await switchComp.vm.$emit('update:modelValue', true)
    await nextTick()

    const select = wrapper.findComponent(VSelectStub)
    const itemValues = select.props('items').map((i) => i.value)

    expect(itemValues).toHaveLength(14)
    expect(itemValues).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
  })

  it('resetea de forma segura el reporte seleccionado si no es válido en el nuevo municipio', async () => {
    const wrapper = createWrapper()
    tenantStore.setTenant('trancas')
    await nextTick()

    const select = wrapper.findComponent(VSelectStub)
    await select.vm.$emit('update:modelValue', 1)
    await nextTick()
    expect(wrapper.find('[data-test="repo-1"]').exists()).toBe(true)

    // Cambiar a concepcion donde reporte 1 no está permitido
    tenantStore.setTenant('concepcion')
    await nextTick()

    expect(wrapper.find('[data-test="repo-1"]').exists()).toBe(false)
  })

  it('mantiene el reporte seleccionado si es común a ambos municipios (por ejemplo, reporte 4)', async () => {
    const wrapper = createWrapper()
    tenantStore.setTenant('trancas')
    await nextTick()

    const select = wrapper.findComponent(VSelectStub)
    await select.vm.$emit('update:modelValue', 4)
    await nextTick()
    expect(wrapper.find('[data-test="repo-4"]').exists()).toBe(true)

    // Cambiar a concepcion (reporte 4 está en ambos)
    tenantStore.setTenant('concepcion')
    await nextTick()

    expect(wrapper.find('[data-test="repo-4"]').exists()).toBe(true)
  })

  it('renderiza dinámicamente el componente correcto según el reporte seleccionado', async () => {
    const wrapper = createWrapper()
    tenantStore.setTenant('trancas')
    await nextTick()

    const select = wrapper.findComponent(VSelectStub)

    await select.vm.$emit('update:modelValue', 2)
    await nextTick()
    expect(wrapper.find('[data-test="repo-2"]').exists()).toBe(true)

    await select.vm.$emit('update:modelValue', 5)
    await nextTick()
    expect(wrapper.find('[data-test="repo-5"]').exists()).toBe(true)

    tenantStore.setTenant('concepcion')
    await nextTick()

    await select.vm.$emit('update:modelValue', 6)
    await nextTick()
    expect(wrapper.find('[data-test="repo-6"]').exists()).toBe(true)

    await select.vm.$emit('update:modelValue', 7)
    await nextTick()
    expect(wrapper.find('[data-test="repo-7"]').exists()).toBe(true)

    await select.vm.$emit('update:modelValue', 10)
    await nextTick()
    expect(wrapper.find('[data-test="repo-10"]').exists()).toBe(true)
  })
})
