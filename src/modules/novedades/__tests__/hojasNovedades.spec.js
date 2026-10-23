// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import HojasView from '../views/HojasView.vue'
import NovAltasVista from '../components/NovAltasVista.vue'

vi.mock('@/shared/services/apiService', () => ({
  leerDatos: vi.fn(async () => ({ operacionOk: true, datos: [] })),
  ejecutarSP: vi.fn(async () => ({
    operacionOk: true,
    valorError: 0,
    valorSalida: 202,
    out: { vError: 0, vSalida: 202 }
  })),
}))

const vuetify = createVuetify({ components, directives })

describe('HojasView', () => {
  const stubs = {
    HojasList: {
      name: 'HojasList',
      props: ['setHojaEdicion', 'filtros'],
      template: '<div class="hojas-list"><button class="btn-haberes" @click="setHojaEdicion({ ID: 1, TIPOHOJAID: 1 })">Haberes</button><button class="btn-varias" @click="setHojaEdicion({ ID: 4, TIPOHOJAID: 4 })">Varias</button><button class="btn-altas" @click="setHojaEdicion({ ID: 5, TIPOHOJAID: 5 })">Altas</button></div>',
    },
    NovHaberesList: {
      name: 'NovHaberesList',
      props: ['setHojaEdicion', 'hojaEditar'],
      template: '<div class="nov-haberes-list"><button class="btn-volver" @click="setHojaEdicion(null)">Volver</button></div>',
    },
    NovVariasList: {
      name: 'NovVariasList',
      props: ['setHojaEdicion', 'hojaEditar'],
      template: '<div class="nov-varias-list"><button class="btn-volver" @click="setHojaEdicion(null)">Volver</button></div>',
    },
    NovAltasList: {
      name: 'NovAltasList',
      props: ['setHojaEdicion', 'hojaEditar'],
      template: '<div class="nov-altas-list"><button class="btn-volver" @click="setHojaEdicion(null)">Volver</button></div>',
    },
  }

  it('muestra HojasList por defecto y cambia de vista según el tipo de hoja', async () => {
    const wrapper = mount(HojasView, {
      global: {
        plugins: [vuetify],
        stubs,
      },
    })

    await flushPromises()
    expect(wrapper.find('.hojas-list').exists()).toBe(true)
    expect(wrapper.text()).toContain('Listado de hojas')

    // Cambiar a Haberes (tipo 1)
    await wrapper.find('.btn-haberes').trigger('click')
    await flushPromises()
    expect(wrapper.find('.nov-haberes-list').exists()).toBe(true)
    expect(wrapper.find('.hojas-list').exists()).toBe(false)
    expect(wrapper.text()).toContain('Editar registros de Hoja: 1')

    // Volver al listado
    await wrapper.find('.btn-volver').trigger('click')
    await flushPromises()
    expect(wrapper.find('.hojas-list').exists()).toBe(true)

    // Cambiar a Varias (tipo 4)
    await wrapper.find('.btn-varias').trigger('click')
    await flushPromises()
    expect(wrapper.find('.nov-varias-list').exists()).toBe(true)

    // Volver
    await wrapper.find('.btn-volver').trigger('click')
    await flushPromises()

    // Cambiar a Altas (tipo 5)
    await wrapper.find('.btn-altas').trigger('click')
    await flushPromises()
    expect(wrapper.find('.nov-altas-list').exists()).toBe(true)
  })
})

describe('NovAltasVista', () => {
  it('graba registro nuevo con vVTO en null y vPERIODO de la hoja', async () => {
    const funcionSpy = vi.fn().mockResolvedValue({ ok: true })
    const cerrarSpy = vi.fn()

    const registroNuevo = {
      ID: 0,
      IDREP: 470,
      ORDEN: 12,
      AFILIADO: 1234,
      APELLIDO: 'Gomez',
      NOMBRE: 'Carlos',
      DNI: 30123456,
      CUIL: '20301234562',
      SEXO: 'M',
      TE: 1,
      CC: 1,
      CAT: 10,
      ANTIG: 5,
      VTO: null,
      TITULO: 0,
      DIFCAT: 0,
      AJUB: false,
      PERIODO: null,
    }

    const wrapper = mount(NovAltasVista, {
      props: {
        Registro: registroNuevo,
        cerrar: cerrarSpy,
        funcion: funcionSpy,
        hojaId: 88,
        hojaPeriodo: '2026-10-01T03:00:00.000Z',
      },
      global: { plugins: [vuetify] },
    })

    await flushPromises()

    const btnGrabar = wrapper.find('button[value="grabar"]')
    await btnGrabar.trigger('click')
    await flushPromises()

    expect(funcionSpy).toHaveBeenCalledTimes(1)
    const [payload, id] = funcionSpy.mock.calls[0]
    expect(id).toBe(0)
    expect(payload.vIDHOJANOV).toBe(88)
    expect(payload.vPERIODO).toContain('2026-10')
    expect(payload.vVTO).toBeNull()
    expect(cerrarSpy).toHaveBeenCalledTimes(1)
  })
})
