import { defineStore } from 'pinia'
import { useEndPoints } from '@/composables/useEndPoints'

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
  state: () => ({
    tipoliq: 1,
    nroadi: 0,
    year: 0,
    month: 0,
    ley: 0,
    serverConfig: {},
    serverConfigLoading: false,
    serverConfigError: null
  }),
  getters: {
    filterString: (state) =>
      `TipoLiquidacionId=${state.tipoliq}&GrupoAdicionalId=${state.nroadi}&Periodo=01/${state.month}/${state.year}`,
    filterStringLey: (state) =>
      `TipoLiquidacionId=${state.tipoliq}&GrupoAdicionalId=${state.nroadi}&Ley=${state.ley}&Periodo=01/${state.month}/${state.year}`,
    filterPeriodoString: (state) => `Periodo=01/${state.month}/${state.year}`,
    periodoString: (state) => `${meses[state.month - 1]} - ${state.year}`,
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
      const { apiBase, getBoletasHeaders } = useEndPoints()
      try {
        const res = await fetch(`${apiBase.value}/api/view/periodo?Activo=1`, {
          headers: getBoletasHeaders()
        })
        if (!res.ok) {
          throw new Error(`Error ${res.status} al obtener período`)
        }
        const data = await res.json()
        if (data?.[0]?.PERIODO) {
          this.year = data[0].PERIODO.split('-')[0]
          this.month = data[0].PERIODO.split('-')[1]
        }
      } catch (err) {
        console.error('[filterStore setPer]', err)
      }
    },
    async setConfig() {
      const { apiBase, getBoletasHeaders } = useEndPoints()
      this.serverConfigLoading = true
      this.serverConfigError = null
      try {
        const res = await fetch(`${apiBase.value}/api/view/configServer`, {
          headers: getBoletasHeaders()
        })
        if (!res.ok) {
          const errText = await res.text().catch(() => '')
          throw new Error(`Error ${res.status} al obtener configuración: ${errText || res.statusText}`)
        }
        const data = await res.json()
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
