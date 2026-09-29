import { defineStore } from 'pinia'
import { useEndPoints } from '@/composables/useEndPoints'

export const useLiqStore = defineStore('liq', {
  state: () => ({
    liqitems: []
  }),
  getters: {
    getLiqItems: (state) => state.liqitems
  },
  actions: {
    async setLiqItems(idliq) {
      const { apiBase, getBoletasHeaders } = useEndPoints()
      try {
        const res = await fetch(`${apiBase.value}/api/view/liqItem?LiquidacionId=${idliq}`, {
          headers: getBoletasHeaders()
        })
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const data = await res.json()
        this.liqitems = data
      } catch (err) {
        console.error('[liqStore setLiqItems]', err)
      }
    }
  }
})
