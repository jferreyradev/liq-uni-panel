// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import TenantSelector from '../TenantSelector.vue'
import { useTenantStore } from '@/stores/tenantStore'
import { useUserStore } from '@/stores/userStore'

const pushMock = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock
  })
}))

describe('TenantSelector - Cierre de sesión y conmutación de municipio', () => {
  let pinia
  let tenantStore
  let userStore

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    tenantStore = useTenantStore()
    userStore = useUserStore()
    pushMock.mockClear()
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear()
    }
  })

  it('cierra la sesión y redirige a /login cuando se cambia de municipio', async () => {
    // Simular usuario autenticado en Concepción
    userStore.auth = true
    userStore.user = { USERNAME: 'operador_concepcion', ROL: 1 }

    const wrapper = mount(TenantSelector, {
      global: {
        plugins: [pinia],
        stubs: {
          'v-menu': { template: '<div><slot name="activator" :props="{}" /><slot /></div>' },
          'v-btn': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          'v-list': { template: '<div><slot /></div>' },
          'v-list-item': {
            props: ['value'],
            emits: ['click'],
            template: '<div class="tenant-item" @click="$emit(\'click\')"><slot /><slot name="prepend" /><slot name="append" /></div>'
          },
          'v-list-subheader': { template: '<div><slot /></div>' },
          'v-avatar': { template: '<div><slot /></div>' },
          'v-img': { template: '<img />' },
          'v-icon': { template: '<i></i>' },
          'v-divider': { template: '<hr />' }
        }
      }
    })

    expect(tenantStore.activeTenantId).toBe('concepcion')
    expect(userStore.auth).toBe(true)

    // Cambiar a Trancas
    const items = wrapper.findAll('.tenant-item')
    // El 4to item es Trancas
    const trancasItem = items[3]
    await trancasItem.trigger('click')

    // Verificar que cambió el municipio
    expect(tenantStore.activeTenantId).toBe('trancas')

    // Verificar que se cerró la sesión
    expect(userStore.auth).toBe(false)
    expect(userStore.user).toBe(null)

    // Verificar que redirige a /login
    expect(pushMock).toHaveBeenCalledWith('/login')
  })
})
