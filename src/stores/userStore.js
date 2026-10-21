import { defineStore } from 'pinia'
import { useEndPoints } from '@/composables/useEndPoints'
import { useLogStore } from '@/stores/logStore'

export const useUserStore = defineStore('userStore', {
  state: () => ({
    user: null, // Estado inicial del usuario
    pers: null,
    loading: false,
    result: '',
    error: null,
    lastError: null, // Detalle técnico del último error ({ status, statusText, url, message, body })
    success: false,
    auth: false,
    allowSign: false,
    rol: null,
    users: [],
    config: null
  }),
  getters: {
    isRegistred: (state) => !!state.user,
    isAuthenticated: (state) => !!state.auth,
    isAuth: (state) => !!state.auth,
    isAdmin: (state) => !!state.user && state.user.ROL === 5,
    isValid: (state) => !!state.pers,
    userName: (state) => state.user?.name || '',
    checkPassword(state) {
      return (pass) => (atob(state.user?.PASSWORD) || '') === pass
    }
  },
  actions: {
    async getConfig() {
      const { apiBoletas, getBoletasHeaders, env } = useEndPoints()
      const logStore = useLogStore()
      const url = `${apiBoletas.value}/config`
      const headers = getBoletasHeaders()
      const start = Date.now()

      this.loading = true
      try {
        const res = await fetch(url, { headers })
        const durationMs = Date.now() - start
        if (!res.ok) {
          const errorText = await res.text().catch(() => '')
          logStore.addLog({
            type: 'error',
            category: 'CONFIG',
            method: 'GET',
            url,
            headers,
            status: res.status,
            statusText: res.statusText,
            durationMs,
            error: errorText,
            env: env.value
          })
          throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`)
        }
        const data = await res.json()
        logStore.addLog({
          type: 'success',
          category: 'CONFIG',
          method: 'GET',
          url,
          headers,
          status: res.status,
          statusText: res.statusText,
          durationMs,
          env: env.value
        })
        this.config = data[0]
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async getUsers() {
      const { apiBoletas, getBoletasHeaders, env } = useEndPoints()
      const logStore = useLogStore()
      const url = `${apiBoletas.value}/users`
      const headers = getBoletasHeaders()
      const start = Date.now()

      this.loading = true
      try {
        const res = await fetch(url, { headers })
        const durationMs = Date.now() - start
        if (!res.ok) {
          const errorText = await res.text().catch(() => '')
          logStore.addLog({
            type: 'error',
            category: 'USERS',
            method: 'GET',
            url,
            headers,
            status: res.status,
            statusText: res.statusText,
            durationMs,
            error: errorText,
            env: env.value
          })
          throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`)
        }
        const data = await res.json()
        logStore.addLog({
          type: 'success',
          category: 'USERS',
          method: 'GET',
          url,
          headers,
          status: res.status,
          statusText: res.statusText,
          durationMs,
          env: env.value
        })
        this.users = data
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async setEstado(idus, estado) {
      const { apiBoletas, getBoletasHeaders, env } = useEndPoints()
      const logStore = useLogStore()
      const url = `${apiBoletas.value}/estadoUsuario`
      const headers = { 'Content-Type': 'application/json', ...getBoletasHeaders() }
      const bodyIn = { IdUsuario: idus, Estado: estado }
      const start = Date.now()

      this.loading = true
      this.error = null
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyIn)
        })
        const durationMs = Date.now() - start
        if (res.ok) {
          logStore.addLog({
            type: 'success',
            category: 'USER_STATE',
            method: 'POST',
            url,
            headers,
            requestBody: bodyIn,
            status: res.status,
            statusText: res.statusText,
            durationMs,
            env: env.value
          })
          this.result = 'ok'
        } else {
          const errorText = await res.text().catch(() => '')
          logStore.addLog({
            type: 'error',
            category: 'USER_STATE',
            method: 'POST',
            url,
            headers,
            requestBody: bodyIn,
            status: res.status,
            statusText: res.statusText,
            durationMs,
            error: errorText,
            env: env.value
          })
          this.result = ''
          this.error = new Error(`Error del servidor: ${res.status}`)
        }
      } catch (err) {
        this.error = err
      } finally {
        this.loading = false
      }
    },

    async login(dni, pass) {
      await this.fetchUser(dni)
      if (this.user) {
        if (atob(this.user?.PASSWORD) === pass) this.auth = true
      }
    },

    async loginUserName(userName, pass) {
      this.auth = false
      this.lastError = null
      await this.fetchUserName(userName)
      if (this.user) {
        if (atob(this.user?.PASSWORD) === pass) {
          this.auth = true
        } else {
          this.auth = false
        }
      }
    },

    async verifyRegister(dni, orden) {
      await this.fetchUser(dni)
      if (!this.user) {
        await this.fetchPersCargo(dni)
        if (this.pers?.ORDEN == orden) this.allowSign = true
      }
    },

    async getData(dni) {
      this.fetchUser(dni)
    },

    async fetchUser(dni) {
      const { apiBoletas, getBoletasHeaders, env } = useEndPoints()
      const logStore = useLogStore()
      const url = `${apiBoletas.value}/user/${dni}`
      const headers = getBoletasHeaders()
      const start = Date.now()

      this.loading = true
      this.error = null
      this.lastError = null
      this.success = false
      this.user = null
      this.auth = false

      try {
        const response = await fetch(url, { headers })
        const durationMs = Date.now() - start

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '')
          logStore.addLog({
            type: 'error',
            category: 'AUTH',
            method: 'GET',
            url,
            headers,
            status: response.status,
            statusText: response.statusText,
            durationMs,
            error: errorBody,
            env: env.value
          })
          this.lastError = {
            status: response.status,
            statusText: response.statusText,
            message: errorBody || response.statusText,
            url
          }
          throw new Error(`HTTP ${response.status}: ${errorBody || response.statusText}`)
        }

        const data = await response.json()
        logStore.addLog({
          type: 'success',
          category: 'AUTH',
          method: 'GET',
          url,
          headers,
          status: response.status,
          statusText: response.statusText,
          durationMs,
          env: env.value
        })
        this.user = data[0]
        this.success = true
      } catch (error) {
        this.error = error.message
        if (!this.lastError) {
          this.lastError = {
            status: 0,
            statusText: 'Error de Red / Conexión',
            message: error.message,
            url
          }
        }
      } finally {
        this.loading = false
      }
    },

    async fetchUserName(userName) {
      const { apiBase, getBoletasHeaders, env } = useEndPoints()
      const logStore = useLogStore()
      const url = `${apiBase.value}/api/view/users?UserName=${userName}`
      const headers = getBoletasHeaders()
      const start = Date.now()

      this.loading = true
      this.error = null
      this.lastError = null
      this.success = false
      this.user = null
      this.auth = false

      try {
        const response = await fetch(url, { headers })
        const durationMs = Date.now() - start

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '')
          logStore.addLog({
            type: 'error',
            category: 'AUTH',
            method: 'GET',
            url,
            headers,
            status: response.status,
            statusText: response.statusText,
            durationMs,
            error: errorBody,
            env: env.value
          })

          this.lastError = {
            status: response.status,
            statusText: response.statusText,
            message: errorBody || response.statusText,
            url
          }
          this.error = this.lastError.message
          return
        }

        const data = await response.json()
        logStore.addLog({
          type: 'success',
          category: 'AUTH',
          method: 'GET',
          url,
          headers,
          status: response.status,
          statusText: response.statusText,
          durationMs,
          env: env.value
        })

        this.user = data?.[0] || null
        this.success = true
      } catch (error) {
        const durationMs = Date.now() - start
        logStore.addLog({
          type: 'error',
          category: 'AUTH',
          method: 'GET',
          url,
          headers,
          status: 0,
          statusText: 'Error de Conexión',
          durationMs,
          error: error.message,
          env: env.value
        })

        this.lastError = {
          status: 0,
          statusText: 'Error de Red / Conexión',
          message: error.message,
          url
        }
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async fetchUserEmail(email) {
      const { apiBase, getBoletasHeaders, env } = useEndPoints()
      const logStore = useLogStore()
      const url = `${apiBase.value}/api/view/users?email=${email}`
      const headers = getBoletasHeaders()
      const start = Date.now()

      this.loading = true
      this.error = null
      this.success = false
      this.user = null
      this.auth = false

      try {
        const response = await fetch(url, { headers })
        const durationMs = Date.now() - start

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '')
          logStore.addLog({
            type: 'error',
            category: 'AUTH',
            method: 'GET',
            url,
            headers,
            status: response.status,
            statusText: response.statusText,
            durationMs,
            error: errorBody,
            env: env.value
          })
          throw new Error(`HTTP ${response.status}: ${errorBody || response.statusText}`)
        }

        const data = await response.json()
        logStore.addLog({
          type: 'success',
          category: 'AUTH',
          method: 'GET',
          url,
          headers,
          status: response.status,
          statusText: response.statusText,
          durationMs,
          env: env.value
        })
        this.user = data[0]
        this.success = true
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async fetchRol() {
      const { apiBase, getBoletasHeaders, env } = useEndPoints()
      const logStore = useLogStore()
      const url = `${apiBase.value}/api/view/frontMenuRol?IdRol=${this.user.ROL}&sort={"IdMenu":"asc"}`
      const headers = getBoletasHeaders()
      const start = Date.now()

      this.loading = true
      this.error = null
      this.success = false

      try {
        const response = await fetch(url, { headers })
        const durationMs = Date.now() - start

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '')
          logStore.addLog({
            type: 'error',
            category: 'AUTH',
            method: 'GET',
            url,
            headers,
            status: response.status,
            statusText: response.statusText,
            durationMs,
            error: errorBody,
            env: env.value
          })
          throw new Error(`HTTP ${response.status}: ${errorBody || response.statusText}`)
        }

        const rawData = await response.json()
        const data = Array.isArray(rawData) ? [...rawData] : []

        const hasArchivos = data.some(
          (m) =>
            m.PATH === '/archivos' ||
            m.IDMENU === 7 ||
            (m.DESCRIPCION &&
              (m.DESCRIPCION.toLowerCase().includes('archivo') ||
                m.DESCRIPCION.toLowerCase().includes('exportaci')))
        )
        if (!hasArchivos) {
          data.push({
            IDROL: this.user?.ROL || 5,
            IDMENU: 7,
            DESCRIPCION: 'Obra Social IPSST',
            PATH: '/ipsst'
          })
        }

        const seenPaths = new Set()
        const uniqueData = []
        for (const item of data) {
          const pathKey = (item.PATH || '').toLowerCase().trim()
          if (!pathKey || !seenPaths.has(pathKey)) {
            if (pathKey) seenPaths.add(pathKey)
            uniqueData.push(item)
          }
        }

        logStore.addLog({
          type: 'success',
          category: 'AUTH',
          method: 'GET',
          url,
          headers,
          status: response.status,
          statusText: response.statusText,
          durationMs,
          env: env.value
        })
        this.rol = uniqueData
        this.success = true
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    setPers(pers) {
      this.pers = pers
      this.success = true
    },
    setUser(user) {
      this.user = user
      this.success = true
    },
    clearUser() {
      this.user = null
      this.success = true
    },
    clearPers() {
      this.pers = null
      this.success = true
    },

    async fetchPers(dni) {
      const { apiBoletas, getBoletasHeaders, env } = useEndPoints()
      const logStore = useLogStore()
      const url = `${apiBoletas.value}/persona/${dni}`
      const headers = getBoletasHeaders()
      const start = Date.now()

      this.loading = true
      this.error = null
      this.success = false
      this.pers = null
      this.allowSign = false

      try {
        const response = await fetch(url, { headers })
        const durationMs = Date.now() - start

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '')
          logStore.addLog({
            type: 'error',
            category: 'PERSONAS',
            method: 'GET',
            url,
            headers,
            status: response.status,
            statusText: response.statusText,
            durationMs,
            error: errorBody,
            env: env.value
          })
          throw new Error('Error fetching persona')
        }

        const data = await response.json()
        logStore.addLog({
          type: 'success',
          category: 'PERSONAS',
          method: 'GET',
          url,
          headers,
          status: response.status,
          statusText: response.statusText,
          durationMs,
          env: env.value
        })
        this.pers = data[0]
        this.success = true
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async fetchPersCargo(dni) {
      const { apiBoletas, getBoletasHeaders, env } = useEndPoints()
      const logStore = useLogStore()
      const url = `${apiBoletas.value}/personacargo/${dni}`
      const headers = getBoletasHeaders()
      const start = Date.now()

      this.loading = true
      this.error = null
      this.success = false
      this.pers = null
      this.allowSign = false

      try {
        const response = await fetch(url, { headers })
        const durationMs = Date.now() - start

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '')
          logStore.addLog({
            type: 'error',
            category: 'PERSONAS',
            method: 'GET',
            url,
            headers,
            status: response.status,
            statusText: response.statusText,
            durationMs,
            error: errorBody,
            env: env.value
          })
          throw new Error('Error fetching persona cargo')
        }

        const data = await response.json()
        logStore.addLog({
          type: 'success',
          category: 'PERSONAS',
          method: 'GET',
          url,
          headers,
          status: response.status,
          statusText: response.statusText,
          durationMs,
          env: env.value
        })
        this.pers = data[0]
        this.success = true
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async register(bodyIn) {
      const { apiBoletas, getBoletasHeaders, env } = useEndPoints()
      const logStore = useLogStore()
      const url = `${apiBoletas.value}/user`
      const headers = { 'Content-Type': 'application/json', ...getBoletasHeaders() }
      const start = Date.now()

      this.loading = true
      this.error = null
      this.result = ''
      bodyIn.Clave = btoa(bodyIn.Clave)

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyIn)
        })
        const durationMs = Date.now() - start

        if (res.ok) {
          logStore.addLog({
            type: 'success',
            category: 'REGISTER',
            method: 'POST',
            url,
            headers,
            status: res.status,
            statusText: res.statusText,
            durationMs,
            env: env.value
          })
          this.result = 'ok'
        } else {
          const errorText = await res.text().catch(() => '')
          logStore.addLog({
            type: 'error',
            category: 'REGISTER',
            method: 'POST',
            url,
            headers,
            status: res.status,
            statusText: res.statusText,
            durationMs,
            error: errorText,
            env: env.value
          })
          this.result = ''
          this.error = new Error(`Error del servidor: ${res.status}`)
        }
      } catch (err) {
        this.error = err
      } finally {
        this.loading = false
      }
    },

    async changePassword(newPass) {
      const { apiBoletas, getBoletasHeaders, env } = useEndPoints()
      const logStore = useLogStore()
      const url = `${apiBoletas.value}/claveUsuario`
      const headers = { 'Content-Type': 'application/json', ...getBoletasHeaders() }
      const bodyIn = {
        IdUsuario: this.user?.ID ?? this.user?.id ?? 0,
        Clave: btoa(newPass)
      }
      const start = Date.now()

      this.loading = true
      this.error = null
      this.result = ''

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyIn)
        })
        const durationMs = Date.now() - start

        if (res.ok) {
          logStore.addLog({
            type: 'success',
            category: 'PASSWORD',
            method: 'POST',
            url,
            headers,
            status: res.status,
            statusText: res.statusText,
            durationMs,
            env: env.value
          })
          this.result = 'ok'
        } else {
          const errorText = await res.text().catch(() => '')
          logStore.addLog({
            type: 'error',
            category: 'PASSWORD',
            method: 'POST',
            url,
            headers,
            status: res.status,
            statusText: res.statusText,
            durationMs,
            error: errorText,
            env: env.value
          })
          this.result = ''
          this.error = new Error(`Error del servidor: ${res.status}`)
        }
      } catch (err) {
        this.error = err
        this.result = ''
      } finally {
        this.loading = false
      }
    },

    async changeUserPassword(idus, newPass) {
      const { apiBoletas, getBoletasHeaders, env } = useEndPoints()
      const logStore = useLogStore()
      const url = `${apiBoletas.value}/claveUsuario`
      const headers = { 'Content-Type': 'application/json', ...getBoletasHeaders() }
      const bodyIn = {
        IdUsuario: idus,
        Clave: btoa(newPass)
      }
      const start = Date.now()

      this.loading = true
      this.error = null
      this.result = ''

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyIn)
        })
        const durationMs = Date.now() - start

        if (res.ok) {
          logStore.addLog({
            type: 'success',
            category: 'PASSWORD',
            method: 'POST',
            url,
            headers,
            status: res.status,
            statusText: res.statusText,
            durationMs,
            env: env.value
          })
          this.result = 'ok'
        } else {
          const errorText = await res.text().catch(() => '')
          logStore.addLog({
            type: 'error',
            category: 'PASSWORD',
            method: 'POST',
            url,
            headers,
            status: res.status,
            statusText: res.statusText,
            durationMs,
            error: errorText,
            env: env.value
          })
          this.result = ''
          this.error = new Error(`Error del servidor: ${res.status}`)
        }
      } catch (err) {
        this.error = err
        this.result = ''
      } finally {
        this.loading = false
      }
    }
  }
})