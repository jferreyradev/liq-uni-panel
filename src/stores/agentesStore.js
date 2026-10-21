import { defineStore } from "pinia";
import { ref, computed } from "vue";

/**
 * Estado de la persona seleccionada en el modulo de agentes.
 *
 * Antes este estado vivia como `ref` local en `AgentesView.vue`. Con eso, la
 * URL no describia la pantalla: recargar la pagina devolvia al usuario al
 * listado de personas y se perdia el contexto de la carga familiar que
 * estaba editando.
 *
 * Ahora la URL es la fuente de verdad (`/agentes/cargaf/:personaId`) y este
 * store solo guarda el detalle de la persona para no tener que volver a
 * pedirlo en cada navegacion.
 */

/**
 * Extrae el identificador de una persona.
 *
 * El backend no es uniforme: la lista de personas usa `PERSONAID`, pero
 * otros endpoints devuelven `ID` o `Id`. Se aceptan los tres para no atar el
 * modulo a una sola forma de la respuesta.
 *
 * @param {Object|null} persona
 * @returns {number|string|null}
 */
export function idDePersona(persona) {
  if (!persona || typeof persona !== "object") return null;

  const candidatos = [persona.PERSONAID, persona.ID, persona.Id];
  for (const candidato of candidatos) {
    if (candidato === null || candidato === undefined || candidato === "") continue;
    return candidato;
  }
  return null;
}

export const useAgentesStore = defineStore("agentes", () => {
  /** Persona seleccionada (null si no hay ninguna). */
  const personaSeleccionada = ref(null);

  /** Identificador de la persona seleccionada. */
  const personaId = computed(() => idDePersona(personaSeleccionada.value));

  /** Guarda la persona seleccionada. */
  function seleccionar(persona) {
    personaSeleccionada.value = persona ?? null;
  }

  /** Olvida la persona seleccionada (vuelve al listado). */
  function limpiar() {
    personaSeleccionada.value = null;
  }

  return { personaSeleccionada, personaId, seleccionar, limpiar };
});
