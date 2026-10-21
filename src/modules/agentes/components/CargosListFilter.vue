<script setup>
import { ref } from "vue";
import { rules } from "@/utils/reglasValidacion";
import { tipoLiq, estadosCargo } from "@/utils/tipos";
import { buildQuery, buildSearchValue } from "@/utils/query";
import { useAgentesFilterStore } from "@/stores/agentesFilterStore";

const props = defineProps({
  filtrar: { type: Function, required: true },
});

const filterStore = useAgentesFilterStore();

const form = ref(null);
const DNI = ref(null);
const Apellido = ref(null);
const IdRep = ref(null);
const Orden = ref(null);
const formOK = ref(null);

const tipoLiqFilter = [
  {
    name: "Todas",
    value: -1,
  },
  ...tipoLiq,
];

const estadosCargoFilter = [
  {
    name: "Todos",
    value: -1,
  },
  ...estadosCargo,
];

const liqSelected = ref(tipoLiqFilter[1]);
const estCargoSelected = ref(estadosCargoFilter[1]);

const campos = filterStore.cargos.campos;
DNI.value = campos.DNI ?? null;
Apellido.value = campos.Apellido ?? null;
IdRep.value = campos.IdRep ?? null;
Orden.value = campos.Orden ?? null;
liqSelected.value =
  campos.liqSelected !== undefined && campos.liqSelected !== null
    ? typeof campos.liqSelected === "object"
      ? campos.liqSelected
      : tipoLiqFilter.find((item) => item.value === campos.liqSelected) ||
        tipoLiqFilter[1]
    : tipoLiqFilter[1];
estCargoSelected.value =
  campos.estCargoSelected !== undefined && campos.estCargoSelected !== null
    ? typeof campos.estCargoSelected === "object"
      ? campos.estCargoSelected
      : estadosCargoFilter.find((item) => item.value === campos.estCargoSelected) ||
        estadosCargoFilter[1]
    : estadosCargoFilter[1];

/**
 * Arma el query string del filtro de cargos.
 */
function buildFiltro() {
  const params = {};

  if (DNI.value !== null && DNI.value !== undefined) {
    const dni = String(DNI.value).trim();
    if (dni.length > 0) params.PersonaDocumento = dni;
  }

  if (Apellido.value !== null && Apellido.value !== undefined) {
    const valor = buildSearchValue("PersonaApellido", Apellido.value);
    if (valor) params.search = valor;
  }

  if (IdRep.value !== null && IdRep.value !== undefined) {
    const rep = String(IdRep.value).trim();
    if (rep.length > 0) params.ReparticionId = rep;
  }

  if (Orden.value !== null && Orden.value !== undefined) {
    const orden = String(Orden.value).trim();
    if (orden.length > 0) params.Orden = orden;
  }

  if (liqSelected.value && liqSelected.value.value !== -1) {
    params.TipoLiquidacionId = liqSelected.value.value;
  }

  if (estCargoSelected.value && estCargoSelected.value.value !== -1) {
    params.EstadoCargoId = estCargoSelected.value.value;
  }

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

  filterStore.setCargosFiltros(filtro, {
    DNI: DNI.value,
    Apellido: Apellido.value,
    IdRep: IdRep.value,
    Orden: Orden.value,
    liqSelected: liqSelected.value,
    estCargoSelected: estCargoSelected.value,
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
        <v-col cols="1">
          <v-text-field
            v-model="IdRep"
            hide-details="auto"
            label="Rep"
            :rules="rules.number"
          ></v-text-field>
        </v-col>
        <v-col cols="1">
          <v-text-field
            v-model="Orden"
            hide-details="auto"
            label="Orden"
            :rules="rules.number"
          ></v-text-field>
        </v-col>
        <v-col cols="2">
          <v-select
            label="Tipo Liq"
            :items="tipoLiqFilter"
            item-title="name"
            item-value="value"
            v-model="liqSelected"
            return-object
          >
          </v-select>
        </v-col>
        <v-col cols="2">
          <v-select
            label="Est. Cargo"
            :items="estadosCargoFilter"
            item-title="name"
            item-value="value"
            v-model="estCargoSelected"
            return-object
          >
          </v-select>
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
