<script setup>
import { ref } from "vue";
import { rules } from "@/utils/reglasValidacion";
import { buildQuery, buildSearchValue } from "@/utils/query";
import { useAgentesFilterStore } from "@/stores/agentesFilterStore";

const props = defineProps({
  filtrar: { type: Function, required: true },
});

const filterStore = useAgentesFilterStore();

const form = ref(null);
const DNI = ref(null);
const Apellido = ref(null);
const Nombre = ref(null);
const formOK = ref(null);

const campos = filterStore.personas.campos;
DNI.value = campos.DNI ?? null;
Apellido.value = campos.Apellido ?? null;
Nombre.value = campos.Nombre ?? null;

/**
 * Arma el query string del filtro.
 *
 * Nota: los parámetros "search" se emiten uno por campo (search=Apellido:...&search=Nombre:...).
 * Se mantiene el formato original porque es el contrato que espera el backend;
 * si el mismo listado recibe dos "search", hay que confirmar con el backend
 * cuál se aplica.
 */
function buildFiltro() {
  const params = {};

  if (DNI.value !== null && DNI.value !== undefined) {
    const dni = String(DNI.value).trim();
    if (dni.length > 0) params.Documento = dni;
  }

  const search = [];
  if (Apellido.value !== null && Apellido.value !== undefined) {
    const valor = buildSearchValue("Apellido", Apellido.value);
    if (valor) search.push(valor);
  }
  if (Nombre.value !== null && Nombre.value !== undefined) {
    const valor = buildSearchValue("Nombre", Nombre.value);
    if (valor) search.push(valor);
  }
  if (search.length > 0) params.search = search;

  return buildQuery(params);
}

async function filtar() {
  if (!form.value) return;

  // Vuetify 3 devuelve { valid, errors } o un booleano según la versión
  const resultado = await form.value.validate();
  const isValid =
    typeof resultado === "object" && resultado !== null
      ? resultado.valid
      : resultado;

  if (!isValid || formOK.value === false) {
    return;
  }

  const filtro = buildFiltro();

  filterStore.setPersonasFiltros(filtro, {
    DNI: DNI.value,
    Apellido: Apellido.value,
    Nombre: Nombre.value,
  });

  props.filtrar(filtro);
}
</script>

<template>
  <v-container>
    <v-form ref="form" v-model="formOK">
      <v-row>
        <v-col cols="2">
          <v-text-field
            v-model="DNI"
            hide-details="auto"
            label="DNI"
            :rules="rules.number"
          ></v-text-field>
        </v-col>
        <v-col cols="3">
          <v-text-field
            v-model="Apellido"
            hide-details="auto"
            label="Apellido"
          ></v-text-field>
        </v-col>
        <v-col cols="3">
          <v-text-field
            v-model="Nombre"
            hide-details="auto"
            label="Nombre"
          ></v-text-field>
        </v-col>
        <v-col cols="2">
          <v-btn
            color="primary"
            elevation="3"
            outlined
            value="filtrar"
            @click="filtar()"
            >Buscar</v-btn
          >
        </v-col>
      </v-row>
    </v-form>
  </v-container>
</template>
