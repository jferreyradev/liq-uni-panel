import { ref, getCurrentInstance, onBeforeUnmount } from "vue";
import { ejecutarSP } from "@/shared/services/apiService";
import {
  SP_OK,
  resolveSpErrorCode,
  extractSpMessage,
} from "@/utils/spRespuesta";

/**
 * Escritura contra un Stored Procedure, con la interpretación del resultado
 * centralizada (antes cada componente repetía la cadena de fallback de
 * "valorError ?? out.vError ?? datos.out.vError").
 *
 * @param {Object} options
 * @param {string} [options.urlUpd] SP de modificación
 * @param {string} [options.urlIns] SP de alta (si no se define, el alta se rechaza)
 * @param {string} [options.mensajeSinInsercion] mensaje devuelto al intentar dar de alta
 * @param {() => Promise<any>|any} [options.refresh] recarga posterior al éxito
 * @param {(item: Object, id: number) => void} [options.onSuccess]
 */
export function useSpGrabar({
  urlUpd = "",
  urlIns = null,
  mensajeSinInsercion = "Por el momento no se pueden agregar registros por este medio",
  refresh = null,
  onSuccess = null,
} = {}) {
  const isSaving = ref(false);
  const error = ref(null);

  let controller = null;
  let montado = true;

  const tieneInstancia = Boolean(getCurrentInstance());
  if (tieneInstancia) {
    onBeforeUnmount(() => {
      montado = false;
      if (controller) controller.abort();
    });
  }

  /**
   * Ejecuta el SP de alta/modificación.
   *
   * @param {Object} item payload
   * @param {number} [id] 0 = alta, distinto de 0 = modificación
   * @param {{url?: string}} [opciones] permite forzar una url (ej: eliminación)
   * @returns {Promise<string|null>} null si fue exitoso, el mensaje de error si falló
   */
  async function grabar(item, id = 0, opciones = {}) {
    const url = opciones.url || (id === 0 ? urlIns : urlUpd);

    if (!url) {
      error.value = mensajeSinInsercion;
      return mensajeSinInsercion;
    }

    isSaving.value = true;
    error.value = null;

    if (controller) controller.abort();
    controller = new AbortController();

    try {
      const res = await ejecutarSP(url, item, "POST", {
        signal: controller.signal,
      });

      if (!montado) return null;

      const codigo = resolveSpErrorCode(res);

      if (res.operacionOk && codigo === SP_OK) {
        if (typeof refresh === "function") {
          await refresh();
        }
        if (typeof onSuccess === "function") {
          onSuccess(item, id);
        }
        return null;
      }

      const mensaje = extractSpMessage(res, "No se pudo completar la operación");
      error.value = mensaje;
      return mensaje;
    } catch (err) {
      if (err?.name === "AbortError") return null;

      const mensaje = err?.message || "Error inesperado al grabar los datos";
      error.value = mensaje;
      return mensaje;
    } finally {
      if (montado) isSaving.value = false;
    }
  }

  return { grabar, isSaving, error };
}
