// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import NovVariasVista from '../components/NovVariasVista.vue'
import NovVariasList from '../components/NovVariasList.vue'

vi.mock('@/shared/services/apiService', () => ({
  leerDatos: vi.fn(async () => ({ operacionOk: true, datos: [] })),
  ejecutarSP: vi.fn(async () => ({
    operacionOk: true,
    valorError: 0,
    valorSalida: 101,
    out: { vError: 0, vSalida: 101 }
  })),
}))

const vuetify = createVuetify({ components, directives })

describe('NovVariasVista', () => {
  it('graba registro nuevo con vVTO en null y vPERIODO de la hoja', async () => {
    const funcionSpy = vi.fn().mockResolvedValue({ ok: true })
    const cerrarSpy = vi.fn()

    const wrapper = mount(NovVariasVista, {
      props: {
        Registro: null,
        cerrar: cerrarSpy,
        funcion: funcionSpy,
        hojaId: 42,
        hojaPeriodo: '2026-10-01T03:00:00.000Z',
      },
      global: { plugins: [vuetify] },
    })

    await flushPromises()

    const textFields = wrapper.findAllComponents({ name: 'VTextField' })
    const ordenField = textFields.find((tf) => tf.props('label') === 'Nro. Boleta')
    const codigoField = textFields.find((tf) => tf.props('label') === 'Código')
    const importeField = textFields.find((tf) => tf.props('label') === 'Importe')

    await ordenField.find('input').setValue('123')
    await codigoField.find('input').setValue('201')
    await importeField.find('input').setValue('1500.50')
    await flushPromises()

    const btnGrabar = wrapper.find('button[value="grabar"]')
    await btnGrabar.trigger('click')
    await flushPromises()

    expect(funcionSpy).toHaveBeenCalledTimes(1)
    const [payload, id] = funcionSpy.mock.calls[0]
    expect(id).toBe(0)
    expect(payload.vORDEN).toBe(123)
    expect(payload.vCOD).toBe(201)
    expect(payload.vIMP).toBe(1500.5)
    expect(payload.vIDHOJANOV).toBe(42)
    expect(payload.vVTO).toBeNull()
    expect(payload.vPERIODO).toContain('2026-10')
    expect(cerrarSpy).toHaveBeenCalledTimes(1)
  })

  it('al editar registro toma el período de la hoja si el registro no tiene PERIODO', async () => {
    const funcionSpy = vi.fn().mockResolvedValue({ ok: true })
    const cerrarSpy = vi.fn()

    const registroExistente = {
      ID: 77,
      IDREP: 470,
      ORDEN: 55,
      CODIGO: 300,
      SUBCODIGO: 1,
      PARAM1: 2,
      PARAM2: 0,
      VENCIMIENTO: '2026-12-01T03:00:00.000Z',
      IMPORTE: 3500.75,
      FECHAGRABACION: '2026-10-15T10:00:00.000Z',
      ESTADOREGISTRO: 1,
    }

    const wrapper = mount(NovVariasVista, {
      props: {
        Registro: registroExistente,
        cerrar: cerrarSpy,
        funcion: funcionSpy,
        hojaId: 42,
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
    expect(id).toBe(77)
    expect(payload.vIDNOV).toBe(77)
    expect(payload.vPERIODO).toContain('2026-10')
    expect(payload.vVTO).toContain('2026-12')
    expect(cerrarSpy).toHaveBeenCalledTimes(1)
  })

  it('muestra mensaje de error si la función de guardado falla', async () => {
    const funcionSpy = vi.fn().mockResolvedValue({ ok: false, mensaje: 'El código 999 no existe' })
    const cerrarSpy = vi.fn()

    const wrapper = mount(NovVariasVista, {
      props: {
        Registro: null,
        cerrar: cerrarSpy,
        funcion: funcionSpy,
        hojaId: 42,
        hojaPeriodo: '2026-10-01T03:00:00.000Z',
      },
      global: { plugins: [vuetify] },
    })

    await flushPromises()

    const textFields = wrapper.findAllComponents({ name: 'VTextField' })
    const ordenField = textFields.find((tf) => tf.props('label') === 'Nro. Boleta')
    const codigoField = textFields.find((tf) => tf.props('label') === 'Código')
    const importeField = textFields.find((tf) => tf.props('label') === 'Importe')

    await ordenField.find('input').setValue('10')
    await codigoField.find('input').setValue('999')
    await importeField.find('input').setValue('500')
    await flushPromises()

    const btnGrabar = wrapper.find('button[value="grabar"]')
    await btnGrabar.trigger('click')
    await flushPromises()

    expect(funcionSpy).toHaveBeenCalledTimes(1)
    expect(cerrarSpy).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('El código 999 no existe')
  })
})

describe('NovVariasList', () => {
  const hojaEditarMock = {
    ID: 10,
    TIPOHOJADESCRIPCION: 'Novedades Varias',
    PERIODOID: '2026-10-01T03:00:00.000Z',
    ESTADOHOJAID: 1,
  }

  it('renderiza cabecera con número de hoja y botones', async () => {
    const wrapper = mount(NovVariasList, {
      props: {
        hojaEditar: hojaEditarMock,
        setHojaEdicion: vi.fn(),
      },
      global: { plugins: [vuetify] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Hoja Nro: 10')
    expect(wrapper.text()).toContain('Novedades Varias')
    expect(wrapper.text()).toContain('Nuevo registro')
    expect(wrapper.text()).toContain('Volver')
  })

  it('el botón Volver invoca setHojaEdicion(null)', async () => {
    const setHojaEdicionSpy = vi.fn()
    const wrapper = mount(NovVariasList, {
      props: {
        hojaEditar: hojaEditarMock,
        setHojaEdicion: setHojaEdicionSpy,
      },
      global: { plugins: [vuetify] },
    })

    await flushPromises()

    const btnVolver = wrapper.findAll('button').find((b) => b.text().includes('Volver'))
    expect(btnVolver).toBeDefined()
    await btnVolver.trigger('click')

    expect(setHojaEdicionSpy).toHaveBeenCalledWith(null)
  })
})
