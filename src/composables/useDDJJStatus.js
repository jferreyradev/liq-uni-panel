import { ref, watch } from 'vue'
import { leerDatos } from '@/shared/services/apiService'
import { getPeriodoFromMMYYYY } from '@/utils/formatos'

/**
 * Convierte un string de período ('MM/YYYY', 'DD/MM/YYYY' o 'YYYY-MM')
 * al identificador numérico YYYYMM (ej: '11/2026' -> 202611).
 *
 * @param {string} periodoStr
 * @returns {number|null}
 */
export function calcularPeriodoId(periodoStr) {
  if (!periodoStr || typeof periodoStr !== 'string') return null
  const clean = periodoStr.trim()

  if (clean.includes('-')) {
    const parts = clean.split('-')
    if (parts.length >= 2) {
      const yearVal = parseInt(parts[0], 10)
      const monthVal = parseInt(parts[1], 10)
      if (yearVal && monthVal && monthVal >= 1 && monthVal <= 12) {
        return yearVal * 100 + monthVal
      }
    }
  }

  const parts = clean.split('/')
  if (parts.length < 2) return null
  const monthVal = parts.length === 3 ? parseInt(parts[1], 10) : parseInt(parts[0], 10)
  const yearVal = parts.length === 3 ? parseInt(parts[2], 10) : parseInt(parts[1], 10)
  if (!monthVal || !yearVal || monthVal < 1 || monthVal > 12) return null
  return yearVal * 100 + monthVal
}

/**
 * Composable para consultar el estado de la Declaración Jurada (DDJJ)
 * de un período dado antes de permitir operaciones dependientes (como IPSST).
 *
 * @param {import('vue').Ref<string>|Function} [periodoRef]
 */
export function useDDJJStatus(periodoRef) {
  const isChecking = ref(false)
  const ddjjExiste = ref(false)
  const ddjjResumen = ref(null)
  const liquidaciones = ref([])
  const error = ref(null)

  async function checkDDJJ(periodoStr) {
    const pId = calcularPeriodoId(periodoStr)
    if (!pId) {
      ddjjExiste.value = false
      ddjjResumen.value = null
      liquidaciones.value = []
      error.value = null
      return
    }

    isChecking.value = true
    error.value = null

    try {
      // 1. Consultar resumen de la DDJJ
      const resDJ = await leerDatos(`djPrevResumenDJ?Id=${pId}`)
      const hasResumen = resDJ.operacionOk && Array.isArray(resDJ.datos) && resDJ.datos.length > 0

      // 2. Consultar liquidaciones asociadas al período de DDJJ
      const periodoDJ = getPeriodoFromMMYYYY(periodoStr)
      const resLiqs = await leerDatos(`view/djPrevLiqsPeriodoDJ?PeriodoDJ=${periodoDJ}`)
      const hasLiqs = resLiqs.operacionOk && Array.isArray(resLiqs.datos) && resLiqs.datos.length > 0

      if (hasResumen || hasLiqs) {
        ddjjExiste.value = true
        ddjjResumen.value = hasResumen ? resDJ.datos[0] : null
        liquidaciones.value = hasLiqs ? resLiqs.datos : []
      } else {
        ddjjExiste.value = false
        ddjjResumen.value = null
        liquidaciones.value = []
      }
    } catch (err) {
      error.value = err.message || 'Error al consultar estado de DDJJ'
      ddjjExiste.value = false
    } finally {
      isChecking.value = false
    }
  }

  if (periodoRef) {
    watch(
      () => (typeof periodoRef === 'function' ? periodoRef() : periodoRef.value),
      (newVal) => {
        checkDDJJ(newVal)
      },
      { immediate: true }
    )
  }

  return {
    isChecking,
    ddjjExiste,
    ddjjResumen,
    liquidaciones,
    error,
    checkDDJJ,
  }
}
