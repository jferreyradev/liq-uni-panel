import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { buildQuery } from "@/utils/query";
import { tipoLiq, estadosCargo, getName } from "@/utils/tipos";

/**
 * Estado de los filtros del módulo de agentes.
 *
 * Reemplaza el "mini-store" improvisado que se armaba dentro de cada vista
 * (un objeto con closures sobre variables `let`, mutado además desde los
 * componentes hijos). Al vivir en Pinia:
 *  - el estado es reactivo,
 *  - sobrevive a la navegación entre rutas,
 *  - tiene una única fuente de verdad para listados y filtros.
 */

function camposPersonasIniciales() {
  return { DNI: null, Apellido: null, Nombre: null };
}

function camposCargosIniciales() {
  return {
    DNI: null,
    Apellido: null,
    IdRep: null,
    Orden: null,
    liqSelected: { value: 1, name: getName(tipoLiq, 1) },
    estCargoSelected: { value: 1, name: getName(estadosCargo, 1) },
  };
}

export const useAgentesFilterStore = defineStore("agentesFiltros", () => {
  const personas = ref({
    filtroString: null,
    campos: camposPersonasIniciales(),
  });

  const cargos = ref({
    filtroString: null,
    campos: camposCargosIniciales(),
  });

  /**
   * Filtro por defecto del listado de cargos: liquidación mensual + cargo activo.
   */
  const cargosFiltroInicial = computed(() =>
    buildQuery({
      TipoLiquidacionId: cargos.value.campos.liqSelected?.value ?? 1,
      EstadoCargoId: cargos.value.campos.estCargoSelected?.value ?? 1,
    }),
  );

  const personasFiltro = computed(() => personas.value.filtroString);
  const cargosFiltro = computed(
    () => cargos.value.filtroString || cargosFiltroInicial.value,
  );

  function setPersonasFiltros(filtroString, campos) {
    personas.value.filtroString = filtroString;
    personas.value.campos = { ...camposPersonasIniciales(), ...(campos || {}) };
  }

  function setCargosFiltros(filtroString, campos) {
    cargos.value.filtroString = filtroString;
    cargos.value.campos = { ...camposCargosIniciales(), ...(campos || {}) };
  }

  function resetPersonas() {
    personas.value = {
      filtroString: null,
      campos: camposPersonasIniciales(),
    };
  }

  function resetCargos() {
    cargos.value = {
      filtroString: null,
      campos: camposCargosIniciales(),
    };
  }

  return {
    personas,
    cargos,
    personasFiltro,
    cargosFiltro,
    cargosFiltroInicial,
    setPersonasFiltros,
    setCargosFiltros,
    resetPersonas,
    resetCargos,
  };
});
