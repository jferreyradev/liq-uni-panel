// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AgentesView from '../views/AgentesView.vue'
import CargosView from '../views/CargosView.vue'

const stubs = {
  'v-container': { template: '<div><slot /></div>' },
  'v-row': { template: '<div><slot /></div>' }
}

describe('Vistas del módulo de agentes', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('AgentesView muestra el listado de personas por defecto', () => {
    const wrapper = mount(AgentesView, {
      global: {
        stubs: {
          ...stubs,
          PersonasList: {
            name: 'PersonasList',
            props: ['setPersonaEdicion'],
            template: '<div class="personas-list" />'
          },
          CargaFamiliarList: {
            name: 'CargaFamiliarList',
            props: ['setPersonaEdicion', 'personaEditar'],
            template: '<div class="carga-familiar-list" />'
          }
        }
      }
    })

    expect(wrapper.text()).toContain('Listado de Personas')
    expect(wrapper.find('.personas-list').exists()).toBe(true)
    expect(wrapper.find('.carga-familiar-list').exists()).toBe(false)
  })

  it('AgentesView cambia a cargas familiares con el título de la persona', async () => {
    const wrapper = mount(AgentesView, {
      global: {
        stubs: {
          ...stubs,
          PersonasList: {
            name: 'PersonasList',
            props: ['setPersonaEdicion'],
            template: '<div class="personas-list" />'
          },
          CargaFamiliarList: {
            name: 'CargaFamiliarList',
            props: ['setPersonaEdicion', 'personaEditar'],
            template: '<div class="carga-familiar-list" />'
          }
        }
      }
    })

    // El listado de personas delega la navegación a la vista
    const personas = wrapper.findComponent({ name: 'PersonasList' })

    // se invoca el callback recibido por prop
    const { setPersonaEdicion } = personas.props()
    setPersonaEdicion(
      { DOCUMENTO: '12345', APELLIDO: 'Perez', NOMBRE: 'Juan' },
      1
    )
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Editar Carga familiar de : 12345')
    expect(wrapper.find('.carga-familiar-list').exists()).toBe(true)
    expect(wrapper.find('.personas-list').exists()).toBe(false)
  })

  it('AgentesView vuelve al listado al cerrar la carga familiar', async () => {
    const wrapper = mount(AgentesView, {
      global: {
        stubs: {
          ...stubs,
          PersonasList: {
            name: 'PersonasList',
            props: ['setPersonaEdicion'],
            template: '<div class="personas-list" />'
          },
          CargaFamiliarList: {
            name: 'CargaFamiliarList',
            props: ['setPersonaEdicion', 'personaEditar'],
            template: '<div class="carga-familiar-list" />'
          }
        }
      }
    })

    const personas = wrapper.findComponent({ name: 'PersonasList' })
    personas.props().setPersonaEdicion(
      { DOCUMENTO: '12345', APELLIDO: 'Perez', NOMBRE: 'Juan' },
      1
    )
    await wrapper.vm.$nextTick()

    const carga = wrapper.findComponent({ name: 'CargaFamiliarList' })
    carga.props().setPersonaEdicion(null, 0)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.personas-list').exists()).toBe(true)
    expect(wrapper.text()).toContain('Listado de Personas')
  })

  it('CargosView renderiza el listado de cargos', () => {
    const wrapper = mount(CargosView, {
      global: {
        stubs: {
          ...stubs,
          CargosList: { name: 'CargosList', template: '<div class="cargos-list" />' }
        }
      }
    })

    expect(wrapper.text()).toContain('Listado de Cargos')
    expect(wrapper.find('.cargos-list').exists()).toBe(true)
  })
})
