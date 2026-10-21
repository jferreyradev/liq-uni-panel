// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '@/stores/userStore'

// El backend devuelve siempre el dato completo: el que decide que se vea es
// el frontend. Se simula un rol restringido para verificar el enmascarado.
vi.mock('@/config/permisos', async () => {
  const real = await vi.importActual('@/config/permisos')
  return {
    ...real,
    ROLES_RESTRINGIDOS: [1]
  }
})

const personas = [
  {
    PERSONAID: 77,
    DOCUMENTO: '12345678',
    APELLIDO: 'Perez',
    NOMBRE: 'Juan',
    PERSONACUIL: '20301234567'
  }
]

vi.mock('@/shared/services/apiService', () => ({
  leerDatos: vi.fn(async () => ({ operacionOk: true, datos: personas })),
  ejecutarSP: vi.fn(async () => ({ operacionOk: true, datos: null })),
  grabarRegistro: vi.fn(async () => ({ operacionOk: true, datos: null }))
}))

import PersonasList from '../components/PersonasList.vue'

const stubs = {
  'v-container': { template: '<div><slot /></div>' },
  'v-row': { template: '<div><slot /></div>' },
  'v-alert': { template: '<div><slot /></div>' },
  'v-dialog': { template: '<div><slot /></div>' },
  'v-data-table': {
    props: ['items', 'headers'],
    template: `
      <table>
        <tbody>
          <template v-for="(item, i) in items" :key="i"><slot name="item" :item="item" /></template>
        </tbody>
      </table>
    `
  }
}

async function montarComo(rol) {
  const userStore = useUserStore()
  userStore.user = { ROL: rol, USERNAME: 'test' }

  const wrapper = mount(PersonasList, {
    props: { setPersonaEdicion: vi.fn() },
    global: { stubs }
  })

  await flushPromises()
  return wrapper
}

describe('Enmascarado de datos personales por rol', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('un rol restringido ve el documento y el CUIL enmascarados', async () => {
    const wrapper = await montarComo(1)

    const texto = wrapper.text()
    expect(texto).toContain('*****678')
    expect(texto).toContain('*********67')
    expect(texto).not.toContain('12345678')
    expect(texto).not.toContain('20301234567')
  })

  it('un rol sin restriccion ve el documento y el CUIL completos', async () => {
    const wrapper = await montarComo(5)

    const texto = wrapper.text()
    expect(texto).toContain('12345678')
    expect(texto).toContain('20301234567')
  })

  it('el nombre se muestra siempre: identifica a la persona para trabajar', async () => {
    const wrapper = await montarComo(1)

    expect(wrapper.text()).toContain('Perez')
    expect(wrapper.text()).toContain('Juan')
  })
})
