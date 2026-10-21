import { computed } from "vue";
import { useUserStore } from "@/stores/userStore";
import { puedeVerPII, valorVisible } from "@/utils/permisos";

/**
 * Acceso a los datos personales segun el rol del usuario.
 *
 * Uso en una vista:
 *
 *   const { documento, cuil } = usePII();
 *   ...
 *   {{ documento(item.DOCUMENTO) }}
 *
 * La politica (que campos son sensibles, que roles los ven completos) esta
 * en `src/config/permisos.js`.
 */
export function usePII() {
  const userStore = useUserStore();

  /** Rol del usuario autenticado (null si no hay sesion). */
  const rol = computed(() => userStore.user?.ROL ?? null);

  /** El rol actual puede ver la PII sin enmascarar. */
  const vePII = computed(() => puedeVerPII(rol.value));

  /** Documento (DNI) a mostrar. */
  function documento(valor) {
    return valorVisible(valor, "DOCUMENTO", rol.value);
  }

  /** CUIL a mostrar. */
  function cuil(valor) {
    return valorVisible(valor, "CUIL", rol.value);
  }

  return { rol, vePII, documento, cuil };
}
