// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import AgentesView from '../views/AgentesView.vue'
import CargosView from '../views/CargosView.vue'
import PersonasList from '../components/PersonasList.vue'
import { ejecutarSP, leerDatos } from '@/shared/services/apiService'
import { agentesRoutes } from '../routes'

vi.mock('@/shared/services/apiService', () => ({
  leerDatos: vi.fn(async () => ({ operacionOk: true, datos: null })),
  ejecutarSP: vi.fn(async () => ({ operacionOk: true, datos: null })),
  grabarRegistro: vi.fn(async () => ({ operacionOk: true, datos: null }))
}))

const stubs = {
  'v-container': { template: '<div><slot /></div>' },
  'v-row': { template: '<div><slot /></div>' }
}

const stubsListas = {
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

/** Router real con las rutas del modulo: la navegacion se prueba de verdad. */
function crearRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: agentesRoutes.map((ruta) => ({
      ...ruta,
      component: ruta.component
    }))
  })
}

async function montarAgentes(rutaInicial = '/agentes') {
  const router = crearRouter()
  await router.push(rutaInicial)
  await router.isReady()

  const wrapper = mount(AgentesView, {
    global: {
      plugins: [router],
      stubs: stubsListas
    }
  })

  await flushPromises()
  return { wrapper, router }
}

describe('Vistas del módulo de agentes', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('AgentesView muestra el listado de personas por defecto', async () => {
    const { wrapper } = await montarAgentes('/agentes')

    expect(wrapper.text()).toContain('Listado de Personas')
    expect(wrapper.find('.personas-list').exists()).toBe(true)
    expect(wrapper.find('.carga-familiar-list').exists()).toBe(false)
  })

  it('AgentesView cambia a cargas familiares con el título de la persona', async () => {
    const { wrapper, router } = await montarAgentes('/agentes')

    // El listado de personas delega la navegación a la vista
    const personas = wrapper.findComponent({ name: 'PersonasList' })

    // se invoca el callback recibido por prop
    personas.props().setPersonaEdicion(
      { PERSONAID: '12345', DOCUMENTO: '12345', APELLIDO: 'Perez', NOMBRE: 'Juan' },
      1
    )
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/agentes/cargaf/12345')
    expect(wrapper.text()).toContain('Editar Carga familiar de : 12345')
    expect(wrapper.find('.carga-familiar-list').exists()).toBe(true)
    expect(wrapper.find('.personas-list').exists()).toBe(false)
  })

  it('AgentesView vuelve al listado al cerrar la carga familiar', async () => {
    const { wrapper, router } = await montarAgentes('/agentes')

    const personas = wrapper.findComponent({ name: 'PersonasList' })
    personas.props().setPersonaEdicion(
      { PERSONAID: '12345', DOCUMENTO: '12345', APELLIDO: 'Perez', NOMBRE: 'Juan' },
      1
    )
    await flushPromises()

    const carga = wrapper.findComponent({ name: 'CargaFamiliarList' })
    carga.props().setPersonaEdicion(null, 0)
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/agentes')
    expect(wrapper.find('.personas-list').exists()).toBe(true)
    expect(wrapper.text()).toContain('Listado de Personas')
  })

  it('AgentesView abre la carga familiar por link directo a la ruta', async () => {
    const { wrapper, router } = await montarAgentes('/agentes/cargaf/777')

    expect(router.currentRoute.value.path).toBe('/agentes/cargaf/777')
    expect(wrapper.find('.carga-familiar-list').exists()).toBe(true)
    expect(wrapper.find('.personas-list').exists()).toBe(false)
    // Sin el detalle de la persona, el titulo identifica al menos el id.
    expect(wrapper.text()).toContain('Editar Carga familiar de : 777')
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

  it('PersonasList permite cambiar la condición de Cobra Ley invocando sp/estableceNoLey', async () => {
    leerDatos.mockImplementation(async (url) => {
      if (url.includes('view/personaLista')) {
        return {
          operacionOk: true,
          datos: [
            {
              PERSONAID: 101,
              DOCUMENTO: '33444555',
              APELLIDO: 'PEREZ',
              NOMBRE: 'JUAN',
              COBRALEY: 0 // 0 = cobra ley
            }
          ]
        }
      }
      if (url.includes('view/periodo')) {
        return {
          operacionOk: true,
          datos: [{ PERIODO: '2026-11-01' }]
        }
      }
      return { operacionOk: true, datos: [] }
    })

    ejecutarSP.mockResolvedValue({
      operacionOk: true,
      valorError: 0,
      out: { vError: 0 }
    })

    const wrapper = mount(PersonasList, {
      props: {
        setPersonaEdicion: vi.fn()
      }
    })
    await flushPromises()

    const item = {
      PERSONAID: 101,
      DOCUMENTO: '33444555',
      APELLIDO: 'PEREZ',
      NOMBRE: 'JUAN',
      NOCOBRALEY: 0 // 0 = cobra ley (no está excluida)
    }

    // Abrir modal de cambio de ley (cambiará de 0 = cobra a 1 = no cobra)
    await wrapper.vm.abrirCambioLey(item)
    expect(wrapper.vm.muestraDialogoLey).toBe(true)
    expect(wrapper.vm.tipoLeySeleccionado).toBe('1') // sugiere pasar a 1 = no cobra ley

    // Confirmar cambio para excluir de ley (Tipo 1, Dni, Tipo, Periodo)
    wrapper.vm.periodoLey = '01/11/2026'
    await wrapper.vm.confirmarCambioLey()
    await flushPromises()

    expect(ejecutarSP).toHaveBeenCalledWith('sp/estableceNoLey', {
      Dni: '33444555',
      Tipo: 1,
      Periodo: '01/11/2026'
    })

    // Caso 2: volver a cobrar ley (restaurar con sp/eliminaNoLey y DNI solamente)
    const itemExcluido = { ...item, NOCOBRALEY: 1 }
    await wrapper.vm.abrirCambioLey(itemExcluido)
    expect(wrapper.vm.tipoLeySeleccionado).toBe('0')
    await wrapper.vm.confirmarCambioLey()
    await flushPromises()

    expect(ejecutarSP).toHaveBeenCalledWith('sp/eliminaNoLey', {
      Dni: '33444555'
    })
  })
})
