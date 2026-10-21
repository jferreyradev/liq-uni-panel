import { defineStore } from 'pinia'
import { leerDatos } from '@/shared/services/apiService'

export const usePersonasStore = defineStore('personasListas', {
  state: () => ({
    paisId: 1,
    provinciaId: 23,
    paises: null,
    provincias: null
  }),
  getters: {
    getPaises: (state) => state.paises,
    getProvincias: (state) => state.provincias
  },
  actions: {
    async init() {
      await this.leerPaises()
      await this.leerProvincias()
    },
    async leerPaises() {
      return { name: 'Argentina', value: 1 }
    },
    async leerProvincias() {
      try {
        const res = await leerDatos('en/provincias', {
          query: { PaisId: 1, sort: JSON.stringify({ Descripcion: 'asc' }) },
        })
        if (!res.operacionOk) {
          throw new Error(res.errmsg || `Error ${res.estado} al obtener provincias`)
        }
        const respuesta = res.datos
        if (Array.isArray(respuesta)) {
          this.provincias = respuesta.map((item) => ({
            name: item.DESCRIPCION,
            value: item.ID
          }))
        }
      } catch (err) {
        console.error('[personasStore leerProvincias]', err)
      }
    }
  }
})
