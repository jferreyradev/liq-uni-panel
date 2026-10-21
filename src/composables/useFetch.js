import { watchEffect, ref, getCurrentScope, onScopeDispose } from 'vue'
import { leerDatos } from '@/shared/services/apiService'

/**
 * Normaliza el cuerpo de la respuesta a la forma que espera la UI.
 *
 * Un listado vacío (404, cuerpo vacío o cuerpo no-JSON) se representa como []
 * para que la grilla se muestre vacía en lugar de romperse.
 */
function normalizarDatos(datos) {
  if (datos === null || datos === undefined) return []
  return datos
}

/**
 * Detecta el contrato de error que devuelve el backend dentro de un 200:
 * { error: "mensaje" }. Se conserva por compatibilidad con el comportamiento
 * previo de este composable.
 */
function mensajeDeErrorEnPayload(datos) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return null
  if (!datos.error) return null
  return String(datos.error)
}

/**
 * Descarga un listado desde la API.
 *
 * Se mantiene la API pública original ({ data, error, isPending }) para no
 * tocar los consumidores, pero ahora:
 *  - la petición pasa por el cliente HTTP único (@/shared/services/apiService),
 *  - se aborta la petición anterior cuando cambia el filtro (evita la carrera
 *    de respuestas: antes arriving una respuesta vieja pisaba a la nueva),
 *  - las respuestas obsoletas se descartan,
 *  - hay timeout por defecto (antes una petición colgada dejaba la UI en
 *    "loading..." para siempre),
 *  - los errores del servidor se muestran en lugar de silenciarse como lista
 *    vacía.
 */
export function useFetch(getUrl, getOptions = () => ({})) {
  const data = ref(null)
  const error = ref(null)
  const isPending = ref(true)

  let controller = null
  let secuencia = 0
  let vigente = true

  async function cargar() {
    const actual = ++secuencia

    if (controller) controller.abort()
    controller = new AbortController()

    isPending.value = true
    data.value = null
    error.value = null

    try {
      // getUrl() y getOptions() se ejecutan de forma síncrona: por eso el
      // watchEffect sigue detectando los cambios de los filtros.
      const url = getUrl()
      const userOptions = getOptions() || {}

      const res = await leerDatos(url, {
        signal: controller.signal,
        timeout: userOptions.timeout,
        method: userOptions.method,
        body: userOptions.body,
        headers: userOptions.headers,
      })

      if (actual !== secuencia || !vigente) return

      if (!res.operacionOk) {
        error.value = new Error(res.errmsg || 'No se puede obtener los datos solicitados.')
        data.value = null
        return
      }

      const mensaje = mensajeDeErrorEnPayload(res.datos)
      if (mensaje) {
        error.value = new Error(mensaje)
        data.value = null
        return
      }

      data.value = normalizarDatos(res.datos)
    } catch (err) {
      if (err?.name === 'AbortError') return
      if (actual !== secuencia || !vigente) return

      error.value = err
      data.value = null
    } finally {
      if (actual === secuencia) isPending.value = false
    }
  }

  watchEffect(() => {
    cargar()
  })

  if (getCurrentScope()) {
    onScopeDispose(() => {
      vigente = false
      if (controller) controller.abort()
    })
  }

  return {
    data,
    error,
    isPending,
  }
}
