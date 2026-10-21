// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSpGrabar } from '../useSpGrabar.js'
import { ejecutarSP } from '@/shared/services/apiService'

vi.mock('@/shared/services/apiService', () => ({
  ejecutarSP: vi.fn()
}))

describe('useSpGrabar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devuelve null y refresca cuando la operación es exitosa', async () => {
    ejecutarSP.mockResolvedValue({
      operacionOk: true,
      valorError: 0,
      errorMsg: '',
      datos: { out: { vError: 0 } },
      out: { vError: 0 }
    })

    const refresh = vi.fn()
    const onSuccess = vi.fn()

    const { grabar } = useSpGrabar({
      urlUpd: 'sp/persUpd',
      urlIns: null,
      refresh,
      onSuccess
    })

    const resultado = await grabar({ DOCUMENTO: '1' }, 5)

    expect(resultado).toBeNull()
    expect(ejecutarSP).toHaveBeenCalledTimes(1)
    expect(ejecutarSP.mock.calls[0][0]).toBe('sp/persUpd')
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('usa el SP de alta cuando el id es 0', async () => {
    ejecutarSP.mockResolvedValue({
      operacionOk: true,
      valorError: 0,
      errorMsg: '',
      datos: null,
      out: null
    })

    const { grabar } = useSpGrabar({ urlUpd: 'sp/persUpd', urlIns: 'sp/persIns' })

    await grabar({ DOCUMENTO: '1' }, 0)

    expect(ejecutarSP.mock.calls[0][0]).toBe('sp/persIns')
  })

  it('rechaza el alta sin llamar al backend si no hay SP de inserción', async () => {
    const { grabar } = useSpGrabar({
      urlUpd: 'sp/persUpd',
      urlIns: null,
      mensajeSinInsercion: 'No se pueden agregar personas'
    })

    const resultado = await grabar({ DOCUMENTO: '1' }, 0)

    expect(resultado).toBe('No se pueden agregar personas')
    expect(ejecutarSP).not.toHaveBeenCalled()
  })

  it('devuelve el mensaje de error del SP cuando la operación falla', async () => {
    ejecutarSP.mockResolvedValue({
      operacionOk: true,
      valorError: 3,
      errorMsg: 'El DNI ya existe',
      datos: { out: { vError: 3 } },
      out: { vError: 3 }
    })

    const refresh = vi.fn()
    const { grabar } = useSpGrabar({ urlUpd: 'sp/persUpd', refresh })

    const resultado = await grabar({ DOCUMENTO: '1' }, 5)

    expect(resultado).toBe('El DNI ya existe')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('no reporta éxito cuando el backend devuelve un error no numérico', async () => {
    ejecutarSP.mockResolvedValue({
      operacionOk: true,
      valorError: -1,
      errorMsg: '',
      datos: { out: { error: 'Error interno' } },
      out: { error: 'Error interno' }
    })

    const { grabar } = useSpGrabar({ urlUpd: 'sp/persUpd' })

    const resultado = await grabar({ DOCUMENTO: '1' }, 5)

    expect(resultado).toBe('Error interno')
  })

  it('permite forzar la url (caso eliminación)', async () => {
    ejecutarSP.mockResolvedValue({
      operacionOk: true,
      valorError: 0,
      errorMsg: '',
      datos: null,
      out: null
    })

    const { grabar } = useSpGrabar({ urlUpd: 'sp/CargaFamDel' })

    await grabar({ vIDCARFAM: 9 }, 1, { url: 'sp/CargaFamDel' })

    expect(ejecutarSP.mock.calls[0][0]).toBe('sp/CargaFamDel')
  })

  it('captura la excepción de red y devuelve un mensaje legible', async () => {
    ejecutarSP.mockRejectedValue(new Error('Error en la Red'))

    const { grabar, error } = useSpGrabar({ urlUpd: 'sp/persUpd' })

    const resultado = await grabar({ DOCUMENTO: '1' }, 5)

    expect(resultado).toBe('Error en la Red')
    expect(error.value).toBe('Error en la Red')
  })
})
