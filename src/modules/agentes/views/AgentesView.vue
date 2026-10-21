<script setup>
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import PersonasList from "../components/PersonasList.vue";
import CargaFamiliarList from "../components/CargaFamiliarList.vue";
import { useAgentesStore, idDePersona } from "@/stores/agentesStore";
import { leerDatos } from "@/shared/services/apiService";

const route = useRoute();
const router = useRouter();
const agentesStore = useAgentesStore();

/**
 * Identificador de la persona tomado de la URL.
 *
 * La ruta es la fuente de verdad: `/agentes` muestra el listado y
 * `/agentes/cargaf/:personaId` muestra la carga familiar de esa persona.
 */
const personaIdRuta = computed(() => {
  const id = route.params?.personaId;
  return id === undefined || id === null || id === "" ? null : id;
});

/** 0 = listado de personas, 1 = cargas familiares. */
const tipoEdicion = computed(() => (personaIdRuta.value ? 1 : 0));

/**
 * Detalle de la persona en edicion.
 *
 * Se usa la del store cuando coincide con la de la URL. Si se entro por link
 * directo (recarga o enlace compartido) no hay nada en el store, asi que se
 * arma una persona minima con el id: las cargas familiares se piden por id, y
 * el detalle completo se carga despues.
 */
const personaEdicion = computed(() => {
  const id = personaIdRuta.value;
  if (!id) return null;

  const cacheada = agentesStore.personaSeleccionada;
  if (cacheada && String(idDePersona(cacheada)) === String(id)) return cacheada;

  return { PERSONAID: id };
});

const titulo = computed(() => {
  if (tipoEdicion.value !== 1) return "Listado de Personas";

  const persona = personaEdicion.value;
  if (!persona) return "Carga familiar";

  const documento = persona.DOCUMENTO ?? persona.DNI ?? personaIdRuta.value ?? "";
  const nombre = [persona.APELLIDO, persona.NOMBRE].filter(Boolean).join(", ");

  return nombre
    ? "Editar Carga familiar de : " + documento + " - " + nombre
    : "Editar Carga familiar de : " + documento;
});

/**
 * Carga el detalle de la persona cuando se entra por link directo.
 *
 * Si la persona ya esta en el store (seselectiono desde el listado) no hace
 * falta volver a pedirla.
 */
watch(
  personaIdRuta,
  async (id) => {
    if (!id) {
      agentesStore.limpiar();
      return;
    }

    const cacheada = agentesStore.personaSeleccionada;
    if (cacheada && String(idDePersona(cacheada)) === String(id)) return;

    const persona = await buscarPersona(id);
    if (persona) agentesStore.seleccionar(persona);
  },
  { immediate: true },
);

/**
 * Busca una persona por id.
 * @param {number|string} id
 * @returns {Promise<Object|null>}
 */
async function buscarPersona(id) {
  const { datos, operacionOk } = await leerDatos("en/persona?Id=" + id);
  if (!operacionOk) return null;
  return Array.isArray(datos) ? datos[0] : datos;
}

/**
 * Cambia entre el listado de personas y el de cargas familiares.
 *
 * Antes cambiaba un `ref` local. Ahora navega: la pantalla queda descrita por
 * la URL y sobrevive a una recarga.
 *
 * @param {Object|null} persona persona editada (null para volver al listado)
 * @param {number} tipo 0 = listado de personas, 1 = cargas familiares
 */
function setPersonaEdicion(persona, tipo) {
  if (tipo === 1 && persona) {
    const id = idDePersona(persona);
    if (!id) return;

    agentesStore.seleccionar(persona);
    if (String(personaIdRuta.value) !== String(id)) {
      router.push({ name: "agentes-cargaf", params: { personaId: id } });
    }
    return;
  }

  agentesStore.limpiar();
  if (personaIdRuta.value) {
    router.push({ name: "agentes" });
  }
}
</script>

<template>
  <v-container>
    <v-row justify="space-around" class="bg-primary">
      <h3>{{ titulo }}</h3>
    </v-row>
    <v-row>
      <CargaFamiliarList
        v-if="tipoEdicion == 1"
        :personaEditar="personaEdicion"
        :setPersonaEdicion="setPersonaEdicion"
      ></CargaFamiliarList>
      <PersonasList
        v-if="tipoEdicion == 0"
        :setPersonaEdicion="setPersonaEdicion"
      ></PersonasList>
    </v-row>
  </v-container>
</template>
