<script setup>
import { ref } from "vue";
import { leerDatos } from "@/shared/services/apiService";
import { TooltipButton } from "@/shared/components";
import { getFechaDMY } from "@/utils/formatos";
import PersonasListFilter from "./PersonasListFilter.vue";
import PersonasVista from "./PersonasVista.vue";
import { useDataTable } from "@/composables/useDataTable";
import { useSpGrabar } from "@/composables/useSpGrabar";
import { useAgentesFilterStore } from "@/stores/agentesFilterStore";

const props = defineProps({
  setPersonaEdicion: { type: Function, required: true },
});

const filterStore = useAgentesFilterStore();

const hojasHeaders = [
  { title: "", key: "ACCIONES" },
  { title: "DNI", key: "DOCUMENTO" },
  { title: "Apellido", key: "APELLIDO" },
  { title: "Nombre", key: "NOMBRE" },
  { title: "CUIL", key: "PERSONACUIL" },
  { title: "Fec. Ingreso", key: "FECHAINGRESO" },
  { title: "Cobra Ley", key: "COBRALEY" },
];

const itemMostrar = ref({
  HojaId: 0,
  Id: 0,
});
const muestraRegistro = ref(false);

function abrirModal(item) {
  itemMostrar.value = item;
  muestraRegistro.value = true;
}

function cierraForm() {
  muestraRegistro.value = false;
}

// alerta de grabación o error
const mostrarAlert = ref(false);
const alertMensaje = ref(null);
const alertTipo = ref(null);

const {
  data,
  isPending,
  error,
  lecturaOk,
  load,
} = useDataTable({
  buildUrl: (filtro) =>
    filtro ? `view/personaLista?${filtro}` : "view/personaLista",
});

async function buscarPersona(id) {
  const { datos, operacionOk } = await leerDatos("en/persona?Id=" + id);
  if (!operacionOk) return null;
  return Array.isArray(datos) ? datos[0] : datos;
}

async function editarPersona(id) {
  const persona = await buscarPersona(id);
  if (persona != null) {
    abrirModal(persona);
  }
}

function editarCargaFamiliar(itemid) {
  const item = Array.isArray(data.value)
    ? data.value.find(
        (e) =>
          e?.PERSONAID == itemid || e?.ID == itemid || e?.Id == itemid,
      )
    : null;
  props.setPersonaEdicion(item, 1);
}

const { grabar: grabarSP } = useSpGrabar({
  urlUpd: "sp/persUpd",
  urlIns: null,
  mensajeSinInsercion:
    "Por el momento no se pueden agregar personas por este medio",
  refresh: () => load(filterStore.personasFiltro),
  onSuccess: () => {
    alertMensaje.value = "Se grabó la persona";
    alertTipo.value = "success";
    mostrarAlert.value = true;
  },
});

load(filterStore.personasFiltro);
</script>

<template>
  <v-container>
    <h1>Agentes</h1>
  </v-container>
  <v-container>
    <v-row>
      <PersonasListFilter :filtrar="load"></PersonasListFilter>
    </v-row>

    <v-alert
      v-model="mostrarAlert"
      border="start"
      close-label="Close Alert"
      :color="alertTipo"
      :icon="'$' + alertTipo"
      closable
      class="my-3"
    >
      {{ alertMensaje }}
    </v-alert>

    <div v-if="isPending">loading...</div>
    <div v-else-if="!lecturaOk" class="text-error">
      {{ error || "No se puede obtener los datos solicitados." }}
    </div>
    <div v-else-if="data">
      <v-data-table
        class="text-caption"
        hover
        density="compact"
        :items="data"
        :headers="hojasHeaders"
      >
        <template #item="{ item }">
          <tr class="pa-0 ma-0">
            <td class="text-center m-0 p-0 sticky">
              <TooltipButton
                :icono="'mdi-list-box-outline'"
                :toolMsg="'Familiares'"
                :funcion="editarCargaFamiliar"
                :itemid="item.PERSONAID"
              ></TooltipButton>
              <TooltipButton
                :icono="'mdi-pencil'"
                :toolMsg="'Editar'"
                :funcion="editarPersona"
                :itemid="item.PERSONAID"
              ></TooltipButton>
            </td>

            <td class="text-right m-0 p-0">{{ item.DOCUMENTO }}</td>
            <td class="text-left m-0 p-0">{{ item.APELLIDO }}</td>
            <td class="text-left m-0 p-0">{{ item.NOMBRE }}</td>
            <td class="text-right m-0 p-0">{{ item.PERSONACUIL }}</td>
            <td class="text-left m-0 p-0">
              {{ getFechaDMY(item.FECHAINGRESO) }}
            </td>
            <td class="text-center m-0 p-0">
              {{ item.COBRALEY == 1 ? "SI" : "NO" }}
            </td>
          </tr>
        </template>
      </v-data-table>
    </div>
    <div v-else>Sin datos para mostrar</div>
  </v-container>
  <v-dialog v-model="muestraRegistro" max-width="80%" :persistent="true">
    <PersonasVista
      v-if="muestraRegistro"
      :Registro="itemMostrar"
      :cerrar="cierraForm"
      :funcion="grabarSP"
    ></PersonasVista>
  </v-dialog>
</template>

<style scoped>
.sticky {
  position: sticky !important;
  left: 0 !important;
  min-width: 130px !important;
  z-index: 10 !important;
}
</style>
