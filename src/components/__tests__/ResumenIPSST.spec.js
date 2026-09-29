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
    filterPeriodoString: 'periodo=2024',
    liqString: 'filtro',
    liqCompactString: 'filtro'
  })
}))

vi.mock('@/composables/useEndPoints', () => ({
  useEndPoints: () => ({
    apiBase: { value: 'https://api.test' },
    buildApiHeaders: () => ({ 'Content-Type': 'application/json' })
  })
}))

vi.mock('../RepoHeader.vue', () => ({
  default: {
    template: '<div><slot /></div>'
  }
}))

import ResumenIPSST from '../ResumenIPSST.vue'

describe('ResumenIPSST', () => {
  beforeEach(() => {
    useFetchMock.mockReset()
    useFetchMock.mockReturnValue({
      data: ref(null),
      error: ref(null),
      isPending: ref(true)
    })
  })

  it('envía headers en la llamada al fetch', () => {
    shallowMount(ResumenIPSST)

    expect(useFetchMock).toHaveBeenCalledTimes(1)
    expect(useFetchMock.mock.calls[0][0]).toEqual(expect.any(Function))

    const options = useFetchMock.mock.calls[0][1]()
    expect(options).toEqual({
      headers: { 'Content-Type': 'application/json' }
    })
  })
})
