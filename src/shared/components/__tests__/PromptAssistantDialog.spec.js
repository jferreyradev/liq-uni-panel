// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PromptAssistantDialog from '../PromptAssistantDialog.vue'
import { useFilterStore } from '@/stores/filterStore'
import { useLogStore } from '@/stores/logStore'

const mockRoute = {
  path: '/operaciones',
  name: 'operaciones'
}

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({ push: vi.fn() })
}))

const globalConfig = (pinia) => ({
  plugins: [pinia],
  stubs: {
    'v-dialog': { template: '<div><slot /></div>' },
    'v-card': { template: '<div><slot /></div>' },
    'v-card-title': { template: '<div><slot /></div>' },
    'v-card-text': { template: '<div><slot /></div>' },
    'v-row': { template: '<div><slot /></div>' },
    'v-col': { template: '<div><slot /></div>' },
    'v-spacer': { template: '<div></div>' },
    'v-icon': { template: '<i></i>' },
    'v-chip': { template: '<span><slot /></span>' },
    'v-btn': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
    'v-btn-toggle': { template: '<div><slot /></div>' },
    'v-sheet': { template: '<div><slot /></div>' },
    'v-textarea': {
      props: ['modelValue'],
      emits: ['update:modelValue'],
      template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea>'
    },
    'v-text-field': {
      props: ['modelValue'],
      emits: ['update:modelValue'],
      template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
    },
    'v-radio-group': { template: '<div><slot /></div>' },
    'v-radio': { template: '<div><slot /></div>' },
    'v-checkbox-btn': { template: '<div><slot /></div>' }
  }
})

describe('PromptAssistantDialog', () => {
  let pinia
  let filterStore
  let logStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    filterStore = useFilterStore()
    logStore = useLogStore()
  })

  it('renderiza correctamente el diálogo y detecta el contexto del módulo y período', async () => {
    filterStore.serverConfig = { IDREP: 400, DESCRIPCION: 'Municipalidad de Concepción' }

    const wrapper = mount(PromptAssistantDialog, {
      props: {
        modelValue: true
      },
      global: globalConfig(pinia)
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Asistente de Prompts para Antigravity')
    expect(wrapper.text()).toContain('Operaciones (Transformación, Liquidación, Boletas)')
    expect(wrapper.text()).toContain('Municipalidad de Concepción')
  })

  it('genera el prompt en formato markdown con los datos ingresados', async () => {
    filterStore.serverConfig = { IDREP: 400, DESCRIPCION: 'Concepción' }

    const wrapper = mount(PromptAssistantDialog, {
      props: {
        modelValue: true
      },
      global: globalConfig(pinia)
    })
    await flushPromises()

    // Cambiar descripción
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Revisar proceso de transformación para evitar ORA-06550')
    await flushPromises()

    expect(wrapper.text()).toContain('### 📋 SOLICITUD DE CAMBIO / NUEVA FUNCIÓN')
    expect(wrapper.text()).toContain('Revisar proceso de transformación para evitar ORA-06550')
    expect(wrapper.text()).toContain('Probar con tests unitarios, compilar y desplegar a main y api-rpi')
  })

  it('adjunta el último error HTTP si se detecta uno en el logStore', async () => {
    logStore.addLog({
      type: 'error',
      method: 'POST',
      url: 'https://api-desa.liqsysonline.com/api/sp/transform',
      status: 500,
      statusText: 'Internal Server Error',
      error: 'PLS-00201: identifier PKG_TRANSFORM must be declared'
    })

    const wrapper = mount(PromptAssistantDialog, {
      props: {
        modelValue: true
      },
      global: globalConfig(pinia)
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Error HTTP detectado (500)')
    expect(wrapper.text()).toContain('POST https://api-desa.liqsysonline.com/api/sp/transform')
  })
})
