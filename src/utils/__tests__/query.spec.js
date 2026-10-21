import { describe, it, expect } from 'vitest'
import {
  buildQuery,
  parseQueryString,
  buildSearchValue,
  appendQueryParam
} from '../query.js'

describe('buildQuery', () => {
  it('arma un query string con los parámetros recibidos', () => {
    expect(buildQuery({ Documento: '12345', Orden: '3' })).toBe(
      'Documento=12345&Orden=3'
    )
  })

  it('omite valores nulos, indefinidos o vacíos', () => {
    expect(buildQuery({ a: null, b: undefined, c: '' })).toBe('')
  })

  it('devuelve cadena vacía ante entradas inválidas', () => {
    expect(buildQuery(null)).toBe('')
    expect(buildQuery('texto')).toBe('')
  })

  it('codifica los espacios del valor de búsqueda', () => {
    expect(buildQuery({ search: 'Apellido:Juan Perez' })).toBe(
      'search=Apellido:Juan%20Perez'
    )
  })

  it('codifica acentos y eñes', () => {
    expect(buildQuery({ search: 'Apellido:Núñez' })).toBe(
      'search=Apellido:N%C3%BA%C3%B1ez'
    )
  })

  it('impide que un valor inyecte parámetros extra en la URL', () => {
    const query = buildQuery({ search: 'Apellido:Perez&EstadoCargoId=99' })

    expect(query).toBe('search=Apellido:Perez%26EstadoCargoId%3D99')
    expect(query.split('&')).toHaveLength(1)
  })

  it('emite un parámetro por cada valor de un array', () => {
    expect(buildQuery({ search: ['Apellido:Perez', 'Nombre:Jose'] })).toBe(
      'search=Apellido:Perez&search=Nombre:Jose'
    )
  })

  it('preserva el formato JSON del parámetro sort', () => {
    const sort = JSON.stringify({ ReparticionId: 'asc', Orden: 'asc' })

    expect(buildQuery({ sort })).toBe(
      'sort=%7B%22ReparticionId%22:%22asc%22,%22Orden%22:%22asc%22%7D'
    )
  })
})

describe('parseQueryString', () => {
  it('convierte un query string en objeto', () => {
    expect(parseQueryString('TipoLiquidacionId=1&EstadoCargoId=2')).toEqual({
      TipoLiquidacionId: '1',
      EstadoCargoId: '2'
    })
  })

  it('decodifica los valores codificados', () => {
    expect(parseQueryString('search=Apellido:Juan%20Perez')).toEqual({
      search: 'Apellido:Juan Perez'
    })
  })

  it('agrupa en un array las claves repetidas', () => {
    expect(parseQueryString('search=Apellido:P&search=Nombre:J')).toEqual({
      search: ['Apellido:P', 'Nombre:J']
    })
  })

  it('tolera el "?" inicial y devuelve vacío ante entradas vacías', () => {
    expect(parseQueryString('?a=1')).toEqual({ a: '1' })
    expect(parseQueryString('')).toEqual({})
  })
})

describe('buildSearchValue', () => {
  it('arma el par campo:valor', () => {
    expect(buildSearchValue('Apellido', 'Perez')).toBe('Apellido:Perez')
  })

  it('devuelve null si el campo o el valor están vacíos', () => {
    expect(buildSearchValue('', 'Perez')).toBeNull()
    expect(buildSearchValue('Apellido', '   ')).toBeNull()
    expect(buildSearchValue('Apellido', null)).toBeNull()
  })
})

describe('appendQueryParam', () => {
  it('agrega el parámetro con "&"', () => {
    expect(appendQueryParam('a=1', 'b=2')).toBe('a=1&b=2')
  })

  it('devuelve el query original si no hay parámetro', () => {
    expect(appendQueryParam('a=1', '')).toBe('a=1')
  })

  it('devuelve solo el parámetro si no hay query', () => {
    expect(appendQueryParam('', 'b=2')).toBe('b=2')
  })
})
