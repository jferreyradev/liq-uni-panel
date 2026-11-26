// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import NovHaberesList from '../components/NovHaberesList.vue'
import { leerDatos } from '@/shared/services/apiService'

vi.mock('@/shared/services/apiService', () => ({
  leerDatos: vi.fn(),
  ejecutarSP: vi.fn(async () => ({
    operacionOk: true,
    valorError: 0,
    valorSalida: 1,
    out: { vError: 0, vSalida: 1 }
  })),
}))

const vuetify = createVuetify({ components, directives })

describe('NovHaberesList', () => {
  const hojaEditarMock = {
    ID: 30,
    TIPOHOJADESCRIPCION: 'HABERES Y RETENCIONES',
    PERIODOID: '2026-10-01T03:00:00.000Z',
    ESTADOHOJAID: 1,
  }

  const sampleRecords = [
    {
      ID: 101,
      NROREPARTICION: 400,
      NROBOLETA: 1,
      NROAFILIADO: 100,
      CODIGO: 2,
      SUBCODIGO: 17,
      CLASE: 0,
      DIAS: 0,
      VENCIMIENTO: null,
      IMPORTE: 15000,
      DOCUMENTO: 30111222,
      APELLIDO: 'PEREZ',
      NOMBRE: 'JUAN',
      TIPOEMPLEOID: 1,
      SITUACIONREVISTAID: 1,
      TIPOOBRASOCIALID: 1,
      PPP: 0,
      FECHAGRABACION: '2026-11-25T00:00:00.000Z',
      HOJAID: 30,
    },
    {
      ID: 102,
      NROREPARTICION: 400,
      NROBOLETA: 2,
      NROAFILIADO: 0,
      CODIGO: 2,
      SUBCODIGO: 17,
      CLASE: 0,
      DIAS: 0,
      VENCIMIENTO: null,
      IMPORTE: 20000,
      DOCUMENTO: 30222333,
      APELLIDO: 'GOMEZ',
      NOMBRE: 'MARIA',
      TIPOEMPLEOID: 1,
      SITUACIONREVISTAID: 4, // Contratado
      TIPOOBRASOCIALID: 1,
      PPP: 0,
      FECHAGRABACION: '2026-11-25T00:00:00.000Z',
      HOJAID: 30,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('consulta novhaberes?HojaId=30 para obtener todos los registros de la hoja', async () => {
    leerDatos.mockResolvedValueOnce({
      operacionOk: true,
      datos: sampleRecords,
    })

    const wrapper = mount(NovHaberesList, {
      props: {
        hojaEditar: hojaEditarMock,
        setHojaEdicion: vi.fn(),
      },
      global: { plugins: [vuetify] },
    })

    await flushPromises()

    expect(leerDatos).toHaveBeenCalledWith('novhaberes?HojaId=30')
    expect(wrapper.text()).toContain('Hoja Nro: 30')
    expect(wrapper.text()).toContain('HABERES Y RETENCIONES')
    expect(wrapper.text()).toContain('Total registros: 2')
    expect(wrapper.text()).toContain('PEREZ')
    expect(wrapper.text()).toContain('GOMEZ')
  })

  it('ejecuta fallback a view/novhaberes si novhaberes devuelve vacio', async () => {
    leerDatos
      .mockResolvedValueOnce({ operacionOk: true, datos: [] })
      .mockResolvedValueOnce({ operacionOk: true, datos: sampleRecords })

    const wrapper = mount(NovHaberesList, {
      props: {
        hojaEditar: hojaEditarMock,
        setHojaEdicion: vi.fn(),
      },
      global: { plugins: [vuetify] },
    })

    await flushPromises()

    expect(leerDatos).toHaveBeenCalledTimes(2)
    expect(leerDatos).toHaveBeenNthCalledWith(1, 'novhaberes?HojaId=30')
    expect(leerDatos).toHaveBeenNthCalledWith(2, 'view/novhaberes?HojaId=30')
    expect(wrapper.text()).toContain('Total registros: 2')
  })

  it('el botón Volver invoca setHojaEdicion(null)', async () => {
    leerDatos.mockResolvedValueOnce({ operacionOk: true, datos: sampleRecords })
    const setHojaEdicionSpy = vi.fn()

    const wrapper = mount(NovHaberesList, {
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
