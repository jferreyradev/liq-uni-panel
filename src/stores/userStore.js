import { defineStore } from 'pinia'
import { useEndPoints } from '@/composables/useEndPoints'
import { useLogStore } from '@/stores/logStore'
import { request, resolveServiceUrl, appendQuery } from '@/shared/services/httpClient'

/**
 * Ejecuta una petición contra el cliente HTTP único y deja el detalle en el
 * logStore con la categoría semántica del módulo (AUTH, CONFIG, ...).
 *
 * No tira ante errores HTTP: devuelve la respuesta normalizada para que cada
 * acción conserve su propia semántica de estado (this.error, this.result,
 * this.lastError). Solo se propaga un AbortError, que es una cancelación.
 *
 * @param {Object} opciones
 * @returns {Promise<Object>} respuesta normalizada + { url, statusText, error }
 */
async function pedir({
  service = 'base',
  path = '',
  url = '',
  method = 'GET',
  body,
  headers,
  query,
  category = 'HTTP'
}) {
  const { env, getBoletasHeaders } = useEndPoints()
  const logStore = useLogStore()
  const target = url || resolveServiceUrl(service, path)
  const urlCompleta = query ? appendQuery(target, query) : target
  const start = Date.now()

  const res = await request({ service, path, url, method, body, headers, query })
  const durationMs = Date.now() - start
  const statusText = res.response?.statusText || ''

  logStore.addLog({
    type: res.operacionOk ? 'success' : 'error',
    category,
    method,
    url: urlCompleta,
    headers: getBoletasHeaders(headers),
    status: res.estado,
    statusText,
    durationMs,
    requestBody: body || null,
    error: res.operacionOk ? null : res.rawText || res.errmsg,
    env: env.value
  })

  return {
    ...res,
    url: urlCompleta,
    statusText,
    error: res.operacionOk
      ? null
      : new Error(`HTTP ${res.estado}: ${res.rawText || statusText || res.errmsg}`)
  }
}

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
      this.loading = true
      try {
        const res = await pedir({ service: 'boletas', path: 'config', category: 'CONFIG' })
        if (!res.operacionOk) throw res.error
        this.config = res.datos?.[0]
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async getUsers() {
      this.loading = true
      try {
        const res = await pedir({ service: 'boletas', path: 'users', category: 'USERS' })
        if (!res.operacionOk) throw res.error
        this.users = res.datos
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async setEstado(idus, estado) {
      const bodyIn = { IdUsuario: idus, Estado: estado }

      this.loading = true
      this.error = null
      try {
        const res = await pedir({
          service: 'boletas',
          path: 'estadoUsuario',
          method: 'POST',
          body: bodyIn,
          category: 'USER_STATE'
        })
        if (res.operacionOk) {
          this.result = 'ok'
        } else {
          this.result = ''
          this.error = new Error(`Error del servidor: ${res.estado}`)
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
      this.loading = true
      this.error = null
      this.lastError = null
      this.success = false
      this.user = null
      this.auth = false

      let res = null
      try {
        res = await pedir({ service: 'boletas', path: `user/${dni}`, category: 'AUTH' })

        if (!res.operacionOk) {
          this.lastError = {
            status: res.estado,
            statusText: res.statusText,
            message: res.rawText || res.statusText,
            url: res.url
          }
          throw res.error
        }

        this.user = res.datos?.[0]
        this.success = true
      } catch (error) {
        this.error = error.message
        if (!this.lastError) {
          this.lastError = {
            status: 0,
            statusText: 'Error de Red / Conexión',
            message: error.message,
            url: res?.url || ''
          }
        }
      } finally {
        this.loading = false
      }
    },

    async fetchUserName(userName) {
      this.loading = true
      this.error = null
      this.lastError = null
      this.success = false
      this.user = null
      this.auth = false

      try {
        const res = await pedir({
          service: 'base',
          path: 'view/users',
          query: { UserName: userName },
          category: 'AUTH'
        })

        if (!res.operacionOk) {
          this.lastError = {
            status: res.estado,
            statusText: res.statusText,
            message: res.rawText || res.statusText,
            url: res.url
          }
          this.error = this.lastError.message
          return
        }

        this.user = res.datos?.[0] || null
        this.success = true
      } catch (error) {
        this.lastError = {
          status: 0,
          statusText: 'Error de Red / Conexión',
          message: error.message,
          url: ''
        }
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async fetchUserEmail(email) {
      this.loading = true
      this.error = null
      this.success = false
      this.user = null
      this.auth = false

      try {
        const res = await pedir({
          service: 'base',
          path: 'view/users',
          query: { email },
          category: 'AUTH'
        })

        if (!res.operacionOk) throw res.error

        this.user = res.datos?.[0]
        this.success = true
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async fetchRol() {
      // La URL se arma antes del try: si no hay usuario cargado, el error
      // debe propagarse igual que antes (no se captura como error de estado).
      const query = {
        IdRol: this.user.ROL,
        sort: JSON.stringify({ IdMenu: 'asc' })
      }

      this.loading = true
      this.error = null
      this.success = false

      try {
        const res = await pedir({
          service: 'base',
          path: 'view/frontMenuRol',
          query,
          category: 'AUTH'
        })

        if (!res.operacionOk) throw res.error

        const rawData = res.datos
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
      this.loading = true
      this.error = null
      this.success = false
      this.pers = null
      this.allowSign = false

      try {
        const res = await pedir({ service: 'boletas', path: `persona/${dni}`, category: 'PERSONAS' })

        if (!res.operacionOk) {
          throw new Error('Error fetching persona')
        }

        this.pers = res.datos?.[0]
        this.success = true
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async fetchPersCargo(dni) {
      this.loading = true
      this.error = null
      this.success = false
      this.pers = null
      this.allowSign = false

      try {
        const res = await pedir({
          service: 'boletas',
          path: `personacargo/${dni}`,
          category: 'PERSONAS'
        })

        if (!res.operacionOk) {
          throw new Error('Error fetching persona cargo')
        }

        this.pers = res.datos?.[0]
        this.success = true
      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    },

    async register(bodyIn) {
      this.loading = true
      this.error = null
      this.result = ''
      bodyIn.Clave = btoa(bodyIn.Clave)

      try {
        const res = await pedir({
          service: 'boletas',
          path: 'user',
          method: 'POST',
          body: bodyIn,
          category: 'REGISTER'
        })

        if (res.operacionOk) {
          this.result = 'ok'
        } else {
          this.result = ''
          this.error = new Error(`Error del servidor: ${res.estado}`)
        }
      } catch (err) {
        this.error = err
      } finally {
        this.loading = false
      }
    },

    async changePassword(newPass) {
      const bodyIn = {
        IdUsuario: this.user?.ID ?? this.user?.id ?? 0,
        Clave: btoa(newPass)
      }

      this.loading = true
      this.error = null
      this.result = ''

      try {
        const res = await pedir({
          service: 'boletas',
          path: 'claveUsuario',
          method: 'POST',
          body: bodyIn,
          category: 'PASSWORD'
        })

        if (res.operacionOk) {
          this.result = 'ok'
        } else {
          this.result = ''
          this.error = new Error(`Error del servidor: ${res.estado}`)
        }
      } catch (err) {
        this.error = err
        this.result = ''
      } finally {
        this.loading = false
      }
    },

    async changeUserPassword(idus, newPass) {
      const bodyIn = {
        IdUsuario: idus,
        Clave: btoa(newPass)
      }

      this.loading = true
      this.error = null
      this.result = ''

      try {
        const res = await pedir({
          service: 'boletas',
          path: 'claveUsuario',
          method: 'POST',
          body: bodyIn,
          category: 'PASSWORD'
        })

        if (res.operacionOk) {
          this.result = 'ok'
        } else {
          this.result = ''
          this.error = new Error(`Error del servidor: ${res.estado}`)
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