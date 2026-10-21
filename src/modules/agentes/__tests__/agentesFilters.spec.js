// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useAgentesFilterStore } from '@/stores/agentesFilterStore'
import PersonasListFilter from '../components/PersonasListFilter.vue'
import CargosListFilter from '../components/CargosListFilter.vue'

const stubs = {
  'v-container': { template: '<div><slot /></div>' },
  'v-row': { template: '<div><slot /></div>' },
  'v-col': { template: '<div><slot /></div>' },
  'v-form': {
    name: 'VForm',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    methods: {
      async validate() {
        return { valid: true, errors: [] }
      }
    },
    template: '<form><slot /></form>'
  },
  'v-text-field': {
    name: 'VTextField',
    props: ['modelValue', 'label', 'rules'],
    emits: ['update:modelValue'],
    template:
      '<input class="text-field" :value="modelValue ?? \'\'" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  'v-select': {
    name: 'VSelect',
    props: ['modelValue', 'items', 'itemTitle', 'itemValue', 'returnObject'],
    emits: ['update:modelValue'],
    template:
      '<select class="select" :value="modelValue?.value" @change="$emit(\'update:modelValue\', items.find(i => String(i.value) === $event.target.value))"><option v-for="i in items" :key="i.value" :value="i.value">{{ i.name }}</option></select>'
  },
  'v-btn': {
    name: 'VBtn',
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot /></button>'
  }
}

describe('Filtros del módulo de agentes', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('arma el filtro de personas codificando los valores', async () => {
    const filtrar = vi.fn()
    const wrapper = mount(PersonasListFilter, {
      props: { filtrar },
      global: { stubs }
    })

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('12345')
    await inputs[1].setValue('Pérez')
    await inputs[2].setValue('José')

    await wrapper.find('button').trigger('click')

    const filtroEsperado =
      'Documento=12345&search=Apellido:P%C3%A9rez&search=Nombre:Jos%C3%A9'

    expect(filtrar).toHaveBeenCalledWith(filtroEsperado)

    const store = useAgentesFilterStore()
    expect(store.personasFiltro).toBe(filtroEsperado)
    expect(store.personas.campos.DNI).toBe('12345')
  })

  it('no deja que un valor con & inyecte parámetros en la URL', async () => {
    const filtrar = vi.fn()
    const wrapper = mount(PersonasListFilter, {
      props: { filtrar },
      global: { stubs }
    })

    const inputs = wrapper.findAll('input')
    await inputs[1].setValue('Perez&EstadoCargoId=99')

    await wrapper.find('button').trigger('click')

    const filtro = filtrar.mock.calls[0][0]
    expect(filtro.split('&')).toHaveLength(1)
    expect(filtro).toBe('search=Apellido:Perez%26EstadoCargoId%3D99')
  })

  it('pre-carga los valores del store y los mantiene al filtrar', async () => {
    const store = useAgentesFilterStore()
    store.setPersonasFiltros('Documento=999', { DNI: '999', Apellido: 'Gomez' })

    const filtrar = vi.fn()
    const wrapper = mount(PersonasListFilter, {
      props: { filtrar },
      global: { stubs }
    })

    const inputs = wrapper.findAll('input')
    expect(inputs[0].element.value).toBe('999')
    expect(inputs[1].element.value).toBe('Gomez')
  })

  it('arma el filtro de cargos con el estado por defecto del store', async () => {
    const filtrar = vi.fn()
    const wrapper = mount(CargosListFilter, {
      props: { filtrar },
      global: { stubs }
    })

    await wrapper.find('button').trigger('click')

    expect(filtrar).toHaveBeenCalledWith('TipoLiquidacionId=1&EstadoCargoId=1')

    const store = useAgentesFilterStore()
    expect(store.cargosFiltro).toBe('TipoLiquidacionId=1&EstadoCargoId=1')
  })

  it('arma el filtro de cargos con documento, búsqueda y repartición', async () => {
    const filtrar = vi.fn()
    const wrapper = mount(CargosListFilter, {
      props: { filtrar },
      global: { stubs }
    })

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('12345')
    await inputs[1].setValue('Gomez')
    await inputs[2].setValue('470')
    await inputs[3].setValue('2')

    await wrapper.find('button').trigger('click')

    expect(filtrar).toHaveBeenCalledWith(
      'PersonaDocumento=12345&search=PersonaApellido:Gomez&ReparticionId=470&Orden=2&TipoLiquidacionId=1&EstadoCargoId=1'
    )
  })
})
