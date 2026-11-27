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

export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutos de inactividad

/**
 * Obtiene el almacenamiento para credenciales y tokens.
 * Prioriza sessionStorage (destruido al cerrar pestaña/navegador).
 * Admite fallback seguro para entornos de prueba.
 */
function getAuthStorage() {
  if (typeof sessionStorage !== 'undefined') {
    try {
      return sessionStorage
    } catch {
      // ignore
    }
  }
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      return window.sessionStorage
    } catch {
      // ignore
    }
  }
  if (typeof localStorage !== 'undefined') {
    try {
      return localStorage
    } catch {
      // ignore
    }
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage
    } catch {
      // ignore
    }
  }
  return null
}

/**
 * Limpia claves legadas de localStorage para evitar sesiones persistentes indefinidas.
 */
function cleanLegacyLocalStorage() {
  try {
    const authStore = getAuthStorage()
    if (typeof localStorage !== 'undefined' && localStorage !== authStore) {
      localStorage.removeItem('liq_user')
      localStorage.removeItem('liq_token')
      localStorage.removeItem('liq_rol')
      localStorage.removeItem('liq_last_activity')
    }
    if (typeof window !== 'undefined' && window.localStorage && window.localStorage !== authStore) {
      window.localStorage.removeItem('liq_user')
      window.localStorage.removeItem('liq_token')
      window.localStorage.removeItem('liq_rol')
      window.localStorage.removeItem('liq_last_activity')
    }
  } catch {
    // ignore
  }
}

function getLastActivity() {
  try {
    const storage = getAuthStorage()
    if (storage) {
      const val = storage.getItem('liq_last_activity')
      return val ? parseInt(val, 10) : null
    }
  } catch {
    // ignore
  }
  return null
}

function isSessionExpired() {
  const last = getLastActivity()
  if (!last) return false
  return Date.now() - last > INACTIVITY_TIMEOUT_MS
}

function clearStoredAuth() {
  cleanLegacyLocalStorage()
  try {
    const storage = getAuthStorage()
    if (storage) {
      storage.removeItem('liq_user')
      storage.removeItem('liq_token')
      storage.removeItem('liq_rol')
      storage.removeItem('liq_last_activity')
    }
  } catch {
    // ignore
  }
}

function getStoredUser() {
  cleanLegacyLocalStorage()
  if (isSessionExpired()) {
    clearStoredAuth()
    return null
  }
  try {
    const storage = getAuthStorage()
    if (storage) {
      const u = storage.getItem('liq_user')
      if (u) return JSON.parse(u)
    }
  } catch {
    // ignore
  }
  return null
}

function getStoredRol() {
  if (isSessionExpired()) {
    return []
  }
  try {
    const storage = getAuthStorage()
    if (storage) {
      const r = storage.getItem('liq_rol')
      if (r) return JSON.parse(r)
    }
  } catch {
    // ignore
  }
  return []
}

function getStoredToken() {
  if (isSessionExpired()) {
    return ''
  }
  try {
    const storage = getAuthStorage()
    if (storage) {
      return storage.getItem('liq_token') || ''
    }
  } catch {
    // ignore
  }
  return ''
}

export const useUserStore = defineStore('userStore', {
  state: () => {
    const user = getStoredUser()
    const rol = getStoredRol()
    const token = getStoredToken()
    return {
      user,
      token,
      pers: null,
      loading: false,
      result: '',
      error: null,
      lastError: null, // Detalle técnico del último error ({ status, statusText, url, message, body })
      success: !!user,
      auth: !!user,
      allowSign: false,
      rol,
      users: [],
      config: null
    }
  },
  getters: {
    isRegistred: (state) => !!state.user,
    isAuthenticated: (state) => !!state.auth,
    isAuth: (state) => !!state.auth,
    isAdmin: (state) => !!state.user && (state.user.ROL === 5 || state.user.ROL === 6),
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
      this.loading = true
      this.error = null

      try {
        // En Oracle las contraseñas históricamente se almacenan en Base64.
        // Probamos primero enviando Base64 (btoa(pass)) y si no coincide, texto plano.
        let encodedPass = ''
        try {
          encodedPass = btoa(pass)
        } catch {
          encodedPass = pass
        }

        const { activeEnvironment, apiKeyOverride } = useEndPoints()
        const envApiKey = activeEnvironment?.value?.apiKey || ''
        const currentApiKey =
          envApiKey ||
          apiKeyOverride?.value ||
          (typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('liq_api_key') : '') ||
          import.meta.env?.VITE_API_KEY ||
          ''
        const keyPayload = currentApiKey ? { apiKey: currentApiKey } : {}

        // Intento 1: POST /api/auth/login con Base64
        let res = await pedir({
          service: 'base',
          path: 'auth/login',
          method: 'POST',
          body: { usr: userName, pws: encodedPass, ...keyPayload },
          category: 'AUTH'
        })

        // Intento 2: Si devolvió error de credenciales, intentar con texto plano
        if (!res.operacionOk && encodedPass !== pass) {
          res = await pedir({
            service: 'base',
            path: 'auth/login',
            method: 'POST',
            body: { usr: userName, pws: pass, ...keyPayload },
            category: 'AUTH'
          })
        }

        if (res.operacionOk && res.datos?.token) {
          const token = res.datos.token
          this.token = token
          const { setAuthToken } = useEndPoints()
          setAuthToken(token)

          const u = res.datos.user || {}
          this.user = {
            ID: u.id,
            USERNAME: u.usr || u.userName || userName,
            name: u.usr || u.userName || userName,
            EMAIL: u.email,
            ROL: u.role || u.rol || 6,
            role: u.role || u.rol || 6,
            DNI: u.dni
          }
          this.auth = true
          this.success = true
          const storage = getAuthStorage()
          if (storage) {
            storage.setItem('liq_user', JSON.stringify(this.user))
            storage.setItem('liq_token', token)
            storage.setItem('liq_last_activity', String(Date.now()))
          }
          cleanLegacyLocalStorage()
          return
        }

        // Si el endpoint de login devolvió 401 Credenciales inválidas, no es error técnico
        if (!res.operacionOk && res.estado === 401) {
          this.auth = false
          return
        }

        // Opción 2 (Fallback): Consulta a view/users (para entornos legacy o si /auth/login no está implementado)
        await this.fetchUserName(userName)
        if (this.user) {
          if (atob(this.user?.PASSWORD) === pass || this.user?.PASSWORD === pass) {
            this.auth = true
            this.success = true
            const fallbackToken = `session-${Date.now()}`
            this.token = fallbackToken
            const { setAuthToken } = useEndPoints()
            setAuthToken(fallbackToken)
            const storage = getAuthStorage()
            if (storage) {
              storage.setItem('liq_user', JSON.stringify(this.user))
              storage.setItem('liq_token', fallbackToken)
              storage.setItem('liq_last_activity', String(Date.now()))
            }
            cleanLegacyLocalStorage()
          } else {
            this.auth = false
          }
        }
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    recordActivity() {
      try {
        const storage = getAuthStorage()
        if (storage) {
          storage.setItem('liq_last_activity', String(Date.now()))
        }
      } catch {
        // ignore
      }
    },

    checkSessionExpired() {
      return isSessionExpired()
    },

    logout() {
      this.user = null
      this.auth = false
      this.token = ''
      this.rol = null
      clearStoredAuth()
      const { clearAuthToken } = useEndPoints()
      clearAuthToken()
    },

    $reset() {
      this.user = null
      this.auth = false
      this.token = ''
      this.pers = null
      this.loading = false
      this.result = ''
      this.error = null
      this.lastError = null
      this.success = false
      this.allowSign = false
      this.rol = null
      this.users = []
      this.config = null
      clearStoredAuth()
      const { clearAuthToken } = useEndPoints()
      clearAuthToken()
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
            IDROL: this.user?.ROL || 6,
            IDMENU: 7,
            DESCRIPCION: 'Obra Social IPSST',
            PATH: '/ipsst'
          })
        }

        // Modernizar /procesos a /operaciones y /conceptos-cargo a /conceptos
        data.forEach((m) => {
          const p = (m.PATH || '').toLowerCase().trim()
          const d = (m.DESCRIPCION || '').toLowerCase().trim()
          if (p === '/procesos' || p === '/proceso' || p === '/operacion' || d === 'procesos' || d === 'operación') {
            m.PATH = '/operaciones'
            m.DESCRIPCION = 'Operaciones'
          } else if (p === '/conceptos-cargo' || p === '/cargos') {
            m.PATH = '/conceptos'
            m.DESCRIPCION = 'Cargos y conceptos a liq.'
          }
        })

        const hasOperaciones = data.some(
          (m) =>
            (m.PATH || '').toLowerCase().trim() === '/operaciones' ||
            (m.DESCRIPCION || '').toLowerCase().trim() === 'operaciones'
        )
        if (!hasOperaciones) {
          data.push({
            IDROL: this.user?.ROL || 6,
            IDMENU: 8,
            DESCRIPCION: 'Operaciones',
            PATH: '/operaciones'
          })
        }

        const hasConceptos = data.some(
          (m) => {
            const p = (m.PATH || '').toLowerCase().trim()
            const d = (m.DESCRIPCION || '').toLowerCase().trim()
            return p === '/conceptos' || p === '/conceptos-cargo' || d.includes('concepto')
          }
        )
        if (!hasConceptos) {
          data.push({
            IDROL: this.user?.ROL || 6,
            IDMENU: 9,
            DESCRIPCION: 'Cargos y conceptos a liq.',
            PATH: '/conceptos'
          })
        }

        const seenPaths = new Set()
        const seenDescriptions = new Set()
        const uniqueData = []
        for (const item of data) {
          const pathKey = (item.PATH || '').toLowerCase().trim()
          const descKey = (item.DESCRIPCION || '').toLowerCase().trim()
          if ((!pathKey || !seenPaths.has(pathKey)) && (!descKey || !seenDescriptions.has(descKey))) {
            if (pathKey) seenPaths.add(pathKey)
            if (descKey) seenDescriptions.add(descKey)
            uniqueData.push(item)
          }
        }

        this.rol = uniqueData
        const storage = getAuthStorage()
        if (storage && uniqueData.length > 0) {
          storage.setItem('liq_rol', JSON.stringify(uniqueData))
        }
        cleanLegacyLocalStorage()
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