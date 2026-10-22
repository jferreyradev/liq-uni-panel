<script setup>
import { ref } from "vue";
import { TooltipButton } from "@/shared/components";
import { getFechaDMY, getVto, getTipoDescripcion } from "@/utils/formatos";
import CargosListFilter from "./CargosListFilter.vue";
import CargosVista from "./CargosVista.vue";
import CargosConceptosList from "./CargosConceptosList.vue";
import { useDataTable } from "@/composables/useDataTable";
import { useSpGrabar } from "@/composables/useSpGrabar";
import { useAgentesFilterStore } from "@/stores/agentesFilterStore";
import { buildQuery, parseQueryString } from "@/utils/query";
import { estadosCargo, getName } from "@/utils/tipos";
import { usePII } from "@/composables/usePII";

const filterStore = useAgentesFilterStore();

/** Datos personales: se enmascaran segun el rol del usuario. */
const { documento } = usePII();

const hojasHeaders = [
  { title: "", key: "ACCIONES" },
  { title: "DNI", key: "PERSONADOCUMENTO" },
  { title: "Apellido", key: "PERSONAAPELLIDO" },
  { title: "Nombre", key: "PERSONANOMBRE" },
  { title: "Rep.", key: "REPARTICIONID" },
  { title: "Orden", key: "ORDEN" },
  { title: "Afiliado", key: "AFILIADO" },
  { title: "T.E.", key: "TIPOEMPLEOID" },
  { title: "Vto. Escalafón", key: "VTOESCALAFON" },
  { title: "Antigüedad", key: "ANTIGUEDAD" },
  { title: "Sit. Rev.", key: "SITUACIONREVISTA" },
  { title: "Categoría", key: "CATEGORIA" },
  { title: "Fec. Baja", key: "FECHABAJA" },
  { title: "Estado Cargo", key: "ESTADOCARGOID" },
  { title: "Tipo O.S.", key: "TIPOOBRASOCIALID" },
  { title: "TipoLiquidación", key: "TIPOLIQUIDACIONID" },
  { title: "Salario", key: "SALARIO" },
];

// alerta de grabación o error
const mostrarAlert = ref(false);
const alertMensaje = ref(null);
const alertTipo = ref(null);

const itemMostrar = ref({
  HojaId: 0,
  Id: 0,
});

const muestraRegistro = ref(false);
const muestraListaConceptos = ref(false);
const cargoSoloLectura = ref(true);

const {
  data,
  isPending,
  error,
  lecturaOk,
  load,
} = useDataTable({
  buildUrl: (filtro) => {
    const params = {
      ...parseQueryString(filtro),
      sort: JSON.stringify({ ReparticionId: "asc", Orden: "asc" }),
    };
    return `view/cargo?${buildQuery(params)}`;
  },
});

function handleModif(itemid) {
  mostrarAlert.value = false;
  let item = null;
  if (itemid != null && itemid !== 0 && Array.isArray(data.value)) {
    item = data.value.find((e) => e?.ID == itemid || e?.Id == itemid);
  }
  cargoSoloLectura.value = false;
  abrirModal(item);
}

function handleVerCargo(itemid) {
  mostrarAlert.value = false;
  let item = null;
  if (itemid != null && itemid !== 0 && Array.isArray(data.value)) {
    item = data.value.find((e) => e?.ID == itemid || e?.Id == itemid);
  }
  cargoSoloLectura.value = true;
  abrirModal(item);
}

function handleListaConceptos(itemid) {
  mostrarAlert.value = false;
  let item = null;
  if (itemid != null && itemid !== 0 && Array.isArray(data.value)) {
    item = data.value.find((e) => e?.ID == itemid || e?.Id == itemid);
  }
  itemMostrar.value = item;
  muestraListaConceptos.value = true;
}

function abrirModal(item) {
  itemMostrar.value = item;
  muestraRegistro.value = true;
}

function cierraForm() {
  muestraRegistro.value = false;
}
function cierraListaConceptos() {
  muestraListaConceptos.value = false;
}

const { grabar: grabarSP } = useSpGrabar({
  urlUpd: "sp/CargoUpd",
  urlIns: null,
  mensajeSinInsercion:
    "Por el momento no se pueden agregar cargos por este medio",
  refresh: () => load(filterStore.cargosFiltro),
  onSuccess: () => {
    alertMensaje.value = "Se grabó el cargo";
    alertTipo.value = "success";
    mostrarAlert.value = true;
  },
});

load(filterStore.cargosFiltro);
</script>

<template>
  <v-container>
    <h1>Nómina de Cargos</h1>
  </v-container>
  <v-container>
    <v-row>
      <CargosListFilter :filtrar="load"></CargosListFilter>
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
                :icono="'mdi-pencil'"
                :toolMsg="'Editar Cargo'"
                :funcion="handleModif"
                :itemid="item.ID"
              ></TooltipButton>
              <TooltipButton
                :icono="'mdi-dots-horizontal-circle'"
                :toolMsg="'Ver detalle del Cargo'"
                :funcion="handleVerCargo"
                :itemid="item.ID"
              ></TooltipButton>
              <TooltipButton
                :icono="'mdi-list-box-outline'"
                :toolMsg="'Ver Conceptos asociados'"
                :funcion="handleListaConceptos"
                :itemid="item.ID"
              ></TooltipButton>
            </td>

            <td class="text-right m-0 p-0">{{ documento(item.PERSONADOCUMENTO) }}</td>
            <td class="text-left m-0 p-0">{{ item.PERSONAAPELLIDO }}</td>
            <td class="text-left m-0 p-0">{{ item.PERSONANOMBRE }}</td>
            <td class="text-left m-0 p-0">
              {{ item.REPARTICIONID }}
            </td>
            <td class="text-center m-0 p-0">{{ item.ORDEN }}</td>
            <td class="text-center m-0 p-0">{{ item.AFILIADO }}</td>
            <td class="text-left m-0 p-0">
              {{ item.TIPOEMPLEOID }}
            </td>
            <td class="text-center m-0 p-0">{{ getVto(item.VTOESCALAFON) }}</td>
            <td class="text-right m-0 p-0">{{ item.ANTIGUEDAD }}</td>
            <td class="text-left m-0 p-0">
              {{
                getTipoDescripcion(
                  item.SITUACIONREVISTAID,
                  item.SITUACIONREVISTADESCRIPCION,
                )
              }}
            </td>
            <td class="text-center m-0 p-0">{{ item.CATEGORIA }}</td>
            <td class="text-right m-0 p-0">
              {{ getFechaDMY(item.FECHABAJA) }}
            </td>
            <td class="text-center m-0 p-0">
              {{
                getTipoDescripcion(
                  item.ESTADOCARGOID,
                  getName(estadosCargo, item.ESTADOCARGOID),
                )
              }}
            </td>
            <td class="text-left m-0 p-0">
              {{
                getTipoDescripcion(
                  item.TIPOOBRASOCIALID,
                  item.TIPOOBRASOCIALDESCRIPCION,
                )
              }}
            </td>
            <td class="text-left m-0 p-0">
              {{
                getTipoDescripcion(
                  item.TIPOLIQUIDACIONID,
                  item.TIPOLIQUIDACIONDESCRIPCION,
                )
              }}
            </td>
            <td class="text-right m-0 p-0">{{ item.SALARIO }}</td>
          </tr>
        </template>
      </v-data-table>
    </div>
    <div v-else>Sin datos para mostrar</div>
  </v-container>
  <v-dialog v-model="muestraRegistro" max-width="80%" :persistent="true">
    <CargosVista
      v-if="muestraRegistro"
      :Registro="itemMostrar"
      :cerrar="cierraForm"
      :funcion="grabarSP"
      :hojaId="itemMostrar?.ID ?? itemMostrar?.Id ?? 0"
      :soloLectura="cargoSoloLectura"
    ></CargosVista>
  </v-dialog>
  <v-dialog v-model="muestraListaConceptos" max-width="80%" :persistent="true">
    <CargosConceptosList
      v-if="muestraListaConceptos"
      :cerrar="cierraListaConceptos"
      :cargoId="itemMostrar?.ID ?? itemMostrar?.Id ?? 0"
    ></CargosConceptosList>
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
