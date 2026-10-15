// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'

const useFetchMock = vi.fn()

vi.mock('@/composables/useFetch', () => ({
  useFetch: (...args) => useFetchMock(...args)
}))

vi.mock('@/stores/filterStore', () => ({
  useFilterStore: () => ({
    filterPeriodoString: 'Periodo=01/08/2026',
    periodoString: 'Agosto - 2026',
    year: 2026,
    month: '08'
  })
}))

vi.mock('@/composables/useEndPoints', () => ({
  useEndPoints: () => ({
    apiBase: { value: 'https://api.test' },
    buildApiHeaders: () => ({ 'x-project-key': 'desarrollo' }),
    getBoletasHeaders: () => ({ 'x-project-key': 'desarrollo' })
  })
}))

vi.mock('@/shared/components/RepoHeader.vue', () => ({
  default: {
    template: '<div><slot /></div>'
  }
}))

import ArchIPSST from '@/modules/ipsst/components/ArchIPSST.vue'

describe('ArchIPSST', () => {
  beforeEach(() => {
    useFetchMock.mockReset()
    useFetchMock.mockReturnValue({
      data: ref([{ CADENA: '202458404710040000000760...', NOMBREARCHIVO: 'AP0012026.08' }]),
      error: ref(null),
      isPending: ref(false)
    })
  })

  it('consulta el endpoint usando filterPeriodoString y envía headers de tenant', () => {
    shallowMount(ArchIPSST)

    expect(useFetchMock).toHaveBeenCalledTimes(1)
    expect(useFetchMock.mock.calls[0][0]).toEqual(expect.any(Function))

    const urlGetter = useFetchMock.mock.calls[0][0]
    expect(urlGetter()).toBe('https://api.test/api/view/archivoIPSST?Periodo=01/08/2026')

    const optionsGetter = useFetchMock.mock.calls[0][1]
    expect(optionsGetter()).toEqual({
      headers: { 'x-project-key': 'desarrollo' }
    })
  })
})
