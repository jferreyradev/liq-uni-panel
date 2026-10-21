<script setup>
import { ref, computed } from "vue";
import PersonasList from "../components/PersonasList.vue";
import CargaFamiliarList from "../components/CargaFamiliarList.vue";

const personaEdicion = ref(null);
const tipoEdicion = ref(0);

const titulo = computed(() => {
  const persona = personaEdicion.value;
  if (tipoEdicion.value === 1 && persona) {
    return (
      "Editar Carga familiar de : " +
      persona.DOCUMENTO +
      " - " +
      persona.APELLIDO +
      ", " +
      persona.NOMBRE
    );
  }
  return "Listado de Personas";
});

/**
 * Cambia entre el listado de personas y el de cargas familiares.
 * @param {Object|null} persona persona editada (null para volver al listado)
 * @param {number} tipo 0 = listado de personas, 1 = cargas familiares
 */
function setPersonaEdicion(persona, tipo) {
  personaEdicion.value = persona;
  tipoEdicion.value = tipo;
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
