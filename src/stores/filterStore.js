import { defineStore } from 'pinia'
import { useEndPoints } from '@/composables/useEndPoints'
import { leerDatos } from '@/shared/services/apiService'

const liqMap = new Map([
  ['1', 'Mensual'],
  ['5', 'Adicional'],
  ['2', 'SAC'],
  ['21', 'Liq Final'],
  ['10', 'Ayuda Escolar']
])

const meses = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
]

export const useFilterStore = defineStore('filter', {
  state: () => {
    const today = new Date()
    return {
      tipoliq: 1,
      nroadi: 0,
      year: today.getFullYear(),
      month: String(today.getMonth() + 1).padStart(2, '0'),
      ley: 0,
      serverConfig: {},
      serverConfigLoading: false,
      serverConfigError: null
    }
  },
  getters: {
    periodoDMY: (state) => {
      const m = String(Number(state.month) || (new Date().getMonth() + 1)).padStart(2, '0')
      const y = state.year || new Date().getFullYear()
      return `01/${m}/${y}`
    },
    filterString: (state) => {
      const m = String(Number(state.month) || (new Date().getMonth() + 1)).padStart(2, '0')
      const y = state.year || new Date().getFullYear()
      return `TipoLiquidacionId=${state.tipoliq}&GrupoAdicionalId=${state.nroadi}&Periodo=01/${m}/${y}`
    },
    filterStringLey: (state) => {
      const m = String(Number(state.month) || (new Date().getMonth() + 1)).padStart(2, '0')
      const y = state.year || new Date().getFullYear()
      return `TipoLiquidacionId=${state.tipoliq}&GrupoAdicionalId=${state.nroadi}&Ley=${state.ley}&Periodo=01/${m}/${y}`
    },
    filterPeriodoString: (state) => {
      const m = String(Number(state.month) || (new Date().getMonth() + 1)).padStart(2, '0')
      const y = state.year || new Date().getFullYear()
      return `Periodo=01/${m}/${y}`
    },
    periodoString: (state) => {
      const mIdx = (Number(state.month) || 1) - 1
      const mName = meses[mIdx] || ''
      return `${mName} - ${state.year}`
    },
    liqString: (state) =>
      `${liqMap.get(state.tipoliq.toString())}-${state.nroadi}  ${meses[state.month - 1]}-${state.year}`,
    getURLAPI: () => {
      const { apiBase } = useEndPoints()
      return `${apiBase.value}`
    },
    liqCompactString: (state) =>
      `${state.year}${meses[state.month - 1]?.substring(0, 3) || ''}${liqMap.get(state.tipoliq.toString())?.substring(0, 1) || ''}${state.nroadi}`,
    server: (state) => `${state.serverConfig?.AMBIENTE || state.serverConfig?.Ambiente || ''}`,
    serverAmbiente: (state) => state.serverConfig?.AMBIENTE || state.serverConfig?.Ambiente || '',
    serverDescripcion: (state) => state.serverConfig?.DESCRIPCION || state.serverConfig?.Descripcion || '',
    serverCela: (state) => state.serverConfig?.CELA || state.serverConfig?.Cela || '',
    serverIdConf: (state) => state.serverConfig?.IDCONF || state.serverConfig?.IdConf || '',
    serverIdRep: (state) => state.serverConfig?.IDREP || state.serverConfig?.IdRep || '',
    hasServerConfig: (state) =>
      Boolean(
        state.serverConfig &&
          (state.serverConfig.AMBIENTE ||
            state.serverConfig.DESCRIPCION ||
            state.serverConfig.Ambiente ||
            state.serverConfig.Descripcion)
      )
  },
  actions: {
    async init() {
      await this.setConfig()
      await this.setPer()
    },
    async setPer() {
      try {
        const res = await leerDatos('view/periodo', { query: { Activo: 1 } })
        if (!res.operacionOk) {
          throw new Error(res.errmsg || `Error ${res.estado} al obtener período`)
        }
        const data = res.datos
        if (data?.[0]?.PERIODO) {
          const parts = data[0].PERIODO.split('-')
          this.year = Number(parts[0]) || parts[0]
          this.month = String(parts[1] || '').padStart(2, '0')
        }
      } catch (err) {
        console.error('[filterStore setPer]', err)
      }
    },
    async setConfig() {
      this.serverConfigLoading = true
      this.serverConfigError = null
      try {
        const res = await leerDatos('view/configServer')
        if (!res.operacionOk) {
          throw new Error(res.errmsg || `Error ${res.estado} al obtener configuración`)
        }
        const data = res.datos
        if (data?.[0]) {
          this.serverConfig = data[0]
        } else {
          this.serverConfig = {}
        }
      } catch (err) {
        this.serverConfigError = err.message
        console.error('[filterStore setConfig]', err)
      } finally {
        this.serverConfigLoading = false
      }
    }
  }
})
