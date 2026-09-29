import { defineStore } from 'pinia'
import { useEndPoints } from '@/composables/useEndPoints'

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
      const { apiBase, getBoletasHeaders } = useEndPoints()
      const url = `${apiBase.value}/api/en/provincias?PaisId=1&sort={"Descripcion":"asc"}`
      try {
        const respuesta = await fetch(url, {
          headers: getBoletasHeaders()
        }).then((res) => res.json())
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
