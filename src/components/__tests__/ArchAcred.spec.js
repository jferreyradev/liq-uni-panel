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
    filterStringLey: 'TipoLiquidacionId=1&GrupoAdicionalId=0&Ley=1&Periodo=01/08/2026',
    periodoString: 'Agosto - 2026',
    liqCompactString: '2026AgoM0',
    year: 2026,
    month: '08',
    ley: 1
  })
}))

vi.mock('@/composables/useEndPoints', () => ({
  useEndPoints: () => ({
    apiBase: { value: 'https://api.test' },
    buildApiHeaders: () => ({ 'x-project-key': 'concepcion' }),
    getBoletasHeaders: () => ({ 'x-project-key': 'concepcion' })
  })
}))

vi.mock('@/shared/components/RepoHeader.vue', () => ({
  default: {
    template: '<div><slot /></div>'
  }
}))

import ArchAcred from '@/modules/acreditaciones/components/ArchAcred.vue'

describe('ArchAcred', () => {
  beforeEach(() => {
    useFetchMock.mockReset()
    useFetchMock.mockReturnValue({
      data: ref([{ CADENA: '285014023000000000000000010000000150000...', NOMBREARCHIVO: 'ACRED202608.TXT' }]),
      error: ref(null),
      isPending: ref(false)
    })
  })

  it('consulta el endpoint usando filterStringLey y envía headers de tenant', () => {
    shallowMount(ArchAcred)

    expect(useFetchMock).toHaveBeenCalledTimes(1)
    expect(useFetchMock.mock.calls[0][0]).toEqual(expect.any(Function))

    const urlGetter = useFetchMock.mock.calls[0][0]
    expect(urlGetter()).toBe(
      'https://api.test/api/view/archivoAcred?TipoLiquidacionId=1&GrupoAdicionalId=0&Ley=1&Periodo=01/08/2026'
    )

    const optionsGetter = useFetchMock.mock.calls[0][1]
    expect(optionsGetter()).toEqual({
      headers: { 'x-project-key': 'concepcion' }
    })
  })
})
