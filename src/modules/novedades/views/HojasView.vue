<script setup>
import HojasList from "../components/HojasList.vue";
import NovHaberesList from "../components/NovHaberesList.vue";
import NovVariasList from "../components/NovVariasList.vue";
import NovAltasList from "../components/NovAltasList.vue";
import { ref } from "vue";

const hojaEdicion = ref(null);
const titulo = ref("Listado de hojas");
const tipoHoja = ref(-1);

function setHojaEdicion(hoja) {
  hojaEdicion.value = hoja;
  if (hoja !== null) {
    titulo.value = "Editar registros de Hoja: " + (hoja?.ID ?? hoja?.Id ?? "");
    tipoHoja.value = hoja?.TIPOHOJAID ?? -1;
  } else {
    titulo.value = "Listado de hojas";
    tipoHoja.value = -1;
  }
}

let filtroString = null;
let filtroCampos = null;
let filtros = {
  setFiltrosCampos: (pFiltroString, pFiltroCampos) => {
    filtroString = pFiltroString;
    filtroCampos = pFiltroCampos;
  },
  getFiltroString: () => filtroString,
  getFiltroCampos: () => filtroCampos,
};
</script>

<template>
  <v-container>
    <!-- Encabezado Principal de Hojas de Novedades -->
    <v-card class="elevation-1 border mb-4" rounded="lg">
      <v-card-title class="d-flex align-center py-3 px-4 bg-primary text-white">
        <v-icon icon="mdi-notebook-edit-outline" class="me-2"></v-icon>
        <span class="text-h6 font-weight-bold">{{ titulo }}</span>
      </v-card-title>
    </v-card>

    <v-row>
      <HojasList
        v-if="tipoHoja == -1"
        :setHojaEdicion="setHojaEdicion"
        :filtros="filtros"
      ></HojasList>
      <NovHaberesList
        v-else-if="tipoHoja == 1"
        :setHojaEdicion="setHojaEdicion"
        :hojaEditar="hojaEdicion"
      ></NovHaberesList>
      <NovVariasList
        v-else-if="tipoHoja == 4"
        :setHojaEdicion="setHojaEdicion"
        :hojaEditar="hojaEdicion"
      ></NovVariasList>
      <NovAltasList
        v-else-if="tipoHoja == 5"
        :setHojaEdicion="setHojaEdicion"
        :hojaEditar="hojaEdicion"
      ></NovAltasList>
    </v-row>
  </v-container>
</template>
