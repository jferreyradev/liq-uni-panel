// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAgentesFilterStore } from '../agentesFilterStore'

describe('useAgentesFilterStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('arranca sin filtro aplicado para personas', () => {
    const store = useAgentesFilterStore()

    expect(store.personas.filtroString).toBeNull()
    expect(store.personas.campos).toEqual({
      DNI: null,
      Apellido: null,
      Nombre: null
    })
  })

  it('arranca con el filtro por defecto de cargos (mensual + activo)', () => {
    const store = useAgentesFilterStore()

    expect(store.cargosFiltroInicial).toBe('TipoLiquidacionId=1&EstadoCargoId=1')
    expect(store.cargosFiltro).toBe('TipoLiquidacionId=1&EstadoCargoId=1')
    expect(store.cargos.campos.liqSelected).toEqual({ value: 1, name: 'Mensual' })
    expect(store.cargos.campos.estCargoSelected).toEqual({ value: 1, name: 'Activo' })
  })

  it('guarda el filtro de personas y lo expone como estado reactivo', () => {
    const store = useAgentesFilterStore()

    store.setPersonasFiltros('Documento=123', { DNI: '123', Apellido: 'Perez' })

    expect(store.personas.filtroString).toBe('Documento=123')
    expect(store.personasFiltro).toBe('Documento=123')
    expect(store.personas.campos.DNI).toBe('123')
    // los campos no informados conservan el valor por defecto
    expect(store.personas.campos.Nombre).toBeNull()
  })

  it('guarda el filtro de cargos', () => {
    const store = useAgentesFilterStore()

    store.setCargosFiltros('PersonaDocumento=9', {
      DNI: '9',
      liqSelected: { value: 5, name: 'Adicional' },
      estCargoSelected: { value: 1, name: 'Activo' }
    })

    expect(store.cargos.filtroString).toBe('PersonaDocumento=9')
    expect(store.cargosFiltro).toBe('PersonaDocumento=9')
    expect(store.cargos.campos.liqSelected.name).toBe('Adicional')
  })

  it('restaura el estado inicial al resetear', () => {
    const store = useAgentesFilterStore()

    store.setCargosFiltros('PersonaDocumento=9', { DNI: '9' })
    store.resetCargos()

    expect(store.cargos.filtroString).toBeNull()
    expect(store.cargosFiltro).toBe('TipoLiquidacionId=1&EstadoCargoId=1')
    expect(store.cargos.campos.DNI).toBeNull()
  })

  it('mantiene el estado entre navegación de rutas (store global)', () => {
    const store = useAgentesFilterStore()

    store.setPersonasFiltros('search=Apellido:Perez', { Apellido: 'Perez' })

    // otra vista que consume el mismo store
    const otraVista = useAgentesFilterStore()

    expect(otraVista.personasFiltro).toBe('search=Apellido:Perez')
  })
})
