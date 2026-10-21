import { describe, it, expect, vi } from 'vitest'
import { buildQuery, buildSearchValue } from '../query.js'

/**
 * El formato del parametro "search" depende de `src/config/busqueda.js`.
 *
 * Este archivo verifica el modo COMPUESTO (un solo parametro con los campos
 * separados). El modo vigente (REPETIDO) esta cubierto en `query.spec.js`.
 *
 * El backend todavia no confirmo que soporte el formato compuesto: por eso
 * el modo vive en la configuracion y no hardcodeado aca.
 */
vi.mock('@/config/busqueda', async () => {
  const real = await vi.importActual('@/config/busqueda')
  return {
    ...real,
    MODO_BUSQUEDA: real.MODOS_BUSQUEDA.COMPUESTO
  }
})

describe('buildQuery con el modo COMPUESTO de busqueda', () => {
  it('emite un solo parametro "search" con los campos separados', () => {
    const query = buildQuery({
      search: [buildSearchValue('Apellido', 'Perez'), buildSearchValue('Nombre', 'Jose')]
    })

    expect(query).toBe('search=Apellido:Perez,Nombre:Jose')
    expect(query.split('&')).toHaveLength(1)
  })

  it('codifica los valores de cada campo sin codificar el separador', () => {
    const query = buildQuery({
      search: [buildSearchValue('Apellido', 'Núñez'), buildSearchValue('Nombre', 'Jose')]
    })

    expect(query).toBe('search=Apellido:N%C3%BA%C3%B1ez,Nombre:Jose')
  })

  it('un solo campo se emite igual que en el modo repetido', () => {
    expect(buildQuery({ search: 'Apellido:Perez' })).toBe('search=Apellido:Perez')
  })

  it('no deja que un valor inyecte parametros extra', () => {
    const query = buildQuery({
      search: ['Apellido:Perez&EstadoCargoId=99', 'Nombre:Jose']
    })

    expect(query).toBe('search=Apellido:Perez%26EstadoCargoId%3D99,Nombre:Jose')
    expect(query.split('&')).toHaveLength(1)
  })

  it('ignora los valores vacios antes de componer', () => {
    const query = buildQuery({ search: ['Apellido:Perez', '', null, undefined] })

    expect(query).toBe('search=Apellido:Perez')
  })
})
