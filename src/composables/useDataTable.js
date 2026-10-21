import { ref, getCurrentInstance, onBeforeUnmount } from "vue";
import { leerDatos } from "@/shared/services/apiService";

/**
 * Carga de listados con cancelación de la petición en vuelo y descarte de
 * respuestas obsoletas.
 *
 * Problema que resuelve: antes cada listado hacía su propio fetch al montar y
 * al filtrar. Si el usuario disparaba dos búsquedas seguidas, la respuesta que
 * llegaba última (no necesariamente la más reciente) dejaba la tabla con datos
 * de otro filtro. Además, la promesa seguía escribiendo en refs de un
 * componente ya desmontado.
 *
 * @param {Object} options
 * @param {string} [options.baseUrl] ruta base (ej: "en/cargo")
 * @param {(filtro: string|null) => string} [options.buildUrl] arma la url final
 * @param {(err: Error) => void} [options.onError]
 * @param {boolean} [options.autoLoad] carga al crear (default false)
 */
export function useDataTable({
  baseUrl = "",
  buildUrl = null,
  onError = null,
  autoLoad = false,
} = {}) {
  const data = ref(null);
  const isPending = ref(false);
  const error = ref(null);
  const lecturaOk = ref(true);
  const notFound = ref(false);

  let controller = null;
  let secuencia = 0;
  let ultimoParams = null;
  let montado = true;

  const tieneInstancia = Boolean(getCurrentInstance());
  if (tieneInstancia) {
    onBeforeUnmount(() => {
      montado = false;
      if (controller) controller.abort();
    });
  }

  function buildUrlFinal(filtro) {
    if (typeof buildUrl === "function") return buildUrl(filtro);
    if (!filtro) return baseUrl;
    return `${baseUrl}?${filtro}`;
  }

  /**
   * Carga el listado.
   * @param {*} [params] argumento que se pasa a buildUrl (query string, id, etc.)
   * @returns {Promise<boolean>} true si la respuesta se aplicó
   */
  async function load(params = null) {
    const seq = ++secuencia;
    ultimoParams = params;

    if (controller) controller.abort();
    controller = new AbortController();

    isPending.value = true;
    error.value = null;

    try {
      const url = buildUrlFinal(params);
      const res = await leerDatos(url, { signal: controller.signal });

      // Respuesta obsoleta: ya hay una petición más reciente en vuelo
      if (!montado || seq !== secuencia) return false;

      notFound.value = Boolean(res.notFound);
      lecturaOk.value = Boolean(res.operacionOk);

      if (Array.isArray(res.datos)) {
        data.value = res.datos;
      } else if (res.datos) {
        data.value = [res.datos];
      } else {
        data.value = null;
      }

      if (!res.operacionOk) {
        error.value = res.errmsg || "Error al intentar recibir los datos";
      }

      return true;
    } catch (err) {
      if (err?.name === "AbortError") return false;
      if (!montado || seq !== secuencia) return false;

      data.value = null;
      lecturaOk.value = false;
      error.value = err?.message || "Error al obtener los datos";

      if (typeof onError === "function") onError(err);

      return false;
    } finally {
      if (montado && seq === secuencia) {
        isPending.value = false;
      }
    }
  }

  /**
   * Recarga usando el último filtro aplicado.
   * @returns {Promise<boolean>}
   */
  function reload() {
    return load(ultimoParams);
  }

  if (autoLoad) {
    load(null);
  }

  return { data, isPending, error, lecturaOk, notFound, load, reload };
}
