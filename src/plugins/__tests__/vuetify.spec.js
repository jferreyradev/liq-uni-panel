// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { ITEMS_POR_PAGINA, ITEMS_POR_PAGINA_OPCIONES } from '@/config/paginacion'

/**
 * La paginacion de las grillas se define una sola vez, como default de
 * Vuetify. Antes cada grilla declaraba su propia cantidad de filas por pagina
 * (10, 15 o 20 segun el componente) y ninguna permitia cambiarla.
 *
 * Este test verifica el cableado: que una grilla sin props de paginacion
 * herede el valor centralizado.
 *
 * Usa la misma instancia de Vuetify que la aplicacion, instalada por el
 * setup global de los tests (`src/test/setup.js`): si la app y los tests
 * configuraran Vuetify distinto, un test podria pasar con una configuracion
 * que en produccion no existe.
 */
const Grilla = {
  template: `
    <v-data-table :items="items" :headers="headers" />
  `,
  data: () => ({
    items: [{ id: 1 }],
    headers: [{ title: 'Id', key: 'id' }]
  })
}

describe('Paginacion de las grillas', () => {
  it('la grilla hereda la cantidad de filas por pagina centralizada', () => {
    const wrapper = mount(Grilla)

    // El selector del pie de la grilla es el que muestra el valor efectivo:
    // Vuetify aplica los defaults por dentro del setup, no en las props crudas.
    const selector = wrapper.findComponent({ name: 'VDataTableFooter' }).findComponent({
      name: 'VSelect'
    })
    expect(selector.exists()).toBe(true)
    expect(selector.props('modelValue')).toBe(ITEMS_POR_PAGINA)
  })

  it('la grilla hereda las opciones de filas por pagina', () => {
    const wrapper = mount(Grilla)

    const pie = wrapper.findComponent({ name: 'VDataTableFooter' })
    // Vuetify convierte la opcion "Todos" (-1) en un objeto con su titulo
    // traducible, asi que se comparan los valores.
    const opciones = pie.props('itemsPerPageOptions').map((opcion) => opcion.value ?? opcion)

    expect(opciones).toEqual(ITEMS_POR_PAGINA_OPCIONES)
  })

  it('el valor por defecto esta entre las opciones disponibles', () => {
    // Vuetify no renderiza el selector si el valor actual no esta en la lista.
    expect(ITEMS_POR_PAGINA_OPCIONES).toContain(ITEMS_POR_PAGINA)
  })
})
