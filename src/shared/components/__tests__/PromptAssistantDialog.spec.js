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
      props: ['modelValue', 'label'],
      emits: ['update:modelValue'],
      template: '<textarea :value="modelValue" :placeholder="label" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea>'
    },
    'v-text-field': {
      props: ['modelValue', 'label'],
      emits: ['update:modelValue'],
      template: '<input :value="modelValue" :placeholder="label" @input="$emit(\'update:modelValue\', $event.target.value)" />'
    },
    'v-select': {
      props: ['modelValue'],
      emits: ['update:modelValue'],
      template: '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="build y deploy a main y api-rpi">deploy</option></select>'
    }
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

  it('renderiza correctamente el diálogo y basa el formato en las plantillas estándar', async () => {
    filterStore.serverConfig = { IDREP: 400, DESCRIPCION: 'Municipalidad de Concepción' }

    const wrapper = mount(PromptAssistantDialog, {
      props: {
        modelValue: true
      },
      global: globalConfig(pinia)
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Generador de Prompts (Basado en Plantillas)')
    expect(wrapper.text()).toContain('docs/PLANTILLAS_DESARROLLO.md')
    expect(wrapper.text()).toContain('### SOLICITUD DE CAMBIO / NUEVA FUNCIÓN')
    expect(wrapper.text()).toContain('Módulo o Pantalla:')
    expect(wrapper.text()).toContain('Dónde se ubica en la UI:')
    expect(wrapper.text()).toContain('Procedimiento (SP):')
    expect(wrapper.text()).toContain('Vista o Endpoint:')
  })

  it('genera la Plantilla 2 (REPORTE DE ERROR) cuando se detecta un fallo en el logStore', async () => {
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

    expect(wrapper.text()).toContain('### REPORTE DE ERROR')
    expect(wrapper.text()).toContain('Dónde ocurre:')
    expect(wrapper.text()).toContain('Qué estabas haciendo:')
    expect(wrapper.text()).toContain('Mensaje o Error exacto:')
    expect(wrapper.text()).toContain('PLS-00201: identifier PKG_TRANSFORM must be declared')
    expect(wrapper.text()).toContain('Acción final:')
  })
})
