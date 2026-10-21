// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import {
  CAMPOS_SENSIBLES,
  PERFILES,
  ROLES
} from '@/config/permisos'
import {
  enmascararValor,
  perfilDeRol,
  puedeVerPII,
  valorVisible
} from '@/utils/permisos'

describe('Permisos: proteccion de datos personales', () => {
  describe('perfilDeRol', () => {
    it('devuelve el perfil por defecto cuando el rol no esta restringido', () => {
      expect(perfilDeRol(1)).toBe(PERFILES.COMPLETO)
      expect(perfilDeRol(ROLES.ADMINISTRADOR)).toBe(PERFILES.COMPLETO)
    })

    it('devuelve perfil restringido cuando no hay sesion', () => {
      // Sin sesion no se sabe quien pregunta: no se muestran datos personales.
      expect(perfilDeRol(null)).toBe(PERFILES.RESTRINGIDO)
      expect(perfilDeRol(undefined)).toBe(PERFILES.RESTRINGIDO)
      expect(perfilDeRol('')).toBe(PERFILES.RESTRINGIDO)
    })
  })

  describe('puedeVerPII', () => {
    it('el administrador ve la PII', () => {
      expect(puedeVerPII(ROLES.ADMINISTRADOR)).toBe(true)
    })

    it('sin sesion no se ve la PII', () => {
      expect(puedeVerPII(null)).toBe(false)
    })
  })

  describe('enmascararValor', () => {
    it('deja visibles los ultimos caracteres del documento', () => {
      expect(enmascararValor('12345678', 'DOCUMENTO')).toBe('*****678')
    })

    it('deja visibles los ultimos caracteres del CUIL', () => {
      expect(enmascararValor('20301234567', 'CUIL')).toBe('*********67')
    })

    it('enmascara por completo un valor mas corto que los caracteres visibles', () => {
      expect(enmascararValor('12', 'DOCUMENTO')).toBe('**')
    })

    it('no inventa nada con valores vacios', () => {
      expect(enmascararValor(null, 'DOCUMENTO')).toBe(null)
      expect(enmascararValor(undefined, 'DOCUMENTO')).toBe(undefined)
      expect(enmascararValor('', 'DOCUMENTO')).toBe('')
    })

    it('deja el valor intacto si el campo no es sensible', () => {
      expect(enmascararValor('Perez', 'APELLIDO')).toBe('Perez')
    })
  })

  describe('valorVisible', () => {
    it('devuelve el valor sin enmascarar cuando el rol puede ver la PII', () => {
      expect(valorVisible('12345678', 'DOCUMENTO', ROLES.ADMINISTRADOR)).toBe('12345678')
    })

    it('enmascara cuando el rol no puede ver la PII', () => {
      expect(valorVisible('12345678', 'DOCUMENTO', null)).toBe('*****678')
    })
  })

  describe('configuracion', () => {
    it('declara los campos sensibles con su regla de enmascarado', () => {
      expect(CAMPOS_SENSIBLES.DOCUMENTO.visibles).toBe(3)
      expect(CAMPOS_SENSIBLES.CUIL.visibles).toBe(2)
    })
  })
})
