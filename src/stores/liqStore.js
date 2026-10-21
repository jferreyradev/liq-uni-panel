import { defineStore } from 'pinia'
import { leerDatos } from '@/shared/services/apiService'

export const useLiqStore = defineStore('liq', {
  state: () => ({
    liqitems: []
  }),
  getters: {
    getLiqItems: (state) => state.liqitems
  },
  actions: {
    async setLiqItems(idliq) {
      try {
        const res = await leerDatos('view/liqItem', { query: { LiquidacionId: idliq } })
        if (!res.operacionOk) {
          throw new Error(res.errmsg || `HTTP ${res.estado}`)
        }
        this.liqitems = res.datos
      } catch (err) {
        console.error('[liqStore setLiqItems]', err)
      }
    }
  }
})
