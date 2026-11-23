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
import { estadosCargo, tiposEmpleo, tiposOS, tipoLiq, getName } from "@/utils/tipos";
import { usePII } from "@/composables/usePII";

const filterStore = useAgentesFilterStore();

/** Datos personales: se enmascaran segun el rol del usuario. */
const { documento } = usePII();

const cargoSeleccionado = ref(null);
const sortBy = ref([]);

function seleccionarCargo(item) {
  cargoSeleccionado.value = item;
}

const hojasHeaders = [
  { title: "Acciones", key: "ACCIONES", align: "center", width: "160px", sortable: false },
  {
    title: "Rep.",
    key: "ReparticionId",
    value: (item) => Number(item.ReparticionId ?? item.REPARTICIONID) || 0,
    align: "center",
    width: "70px",
  },
  {
    title: "Orden",
    key: "Orden",
    value: (item) => Number(item.Orden ?? item.ORDEN) || 0,
    align: "center",
    width: "70px",
  },
  {
    title: "DNI",
    key: "PersonaDocumento",
    value: (item) => Number(item.PersonaDocumento ?? item.PERSONADOCUMENTO ?? item.DOCUMENTO ?? item.Documento) || 0,
    align: "end",
    width: "105px",
  },
  {
    title: "Apellido",
    key: "PersonaApellido",
    value: (item) => String(item.PersonaApellido ?? item.PERSONAAPELLIDO ?? item.APELLIDO ?? item.Apellido ?? "").toLowerCase(),
    align: "start",
  },
  {
    title: "Nombre",
    key: "PersonaNombre",
    value: (item) => String(item.PersonaNombre ?? item.PERSONANOMBRE ?? item.NOMBRE ?? item.Nombre ?? "").toLowerCase(),
    align: "start",
  },
  {
    title: "Categoría",
    key: "Categoria",
    value: (item) => Number(item.Categoria ?? item.CATEGORIA) || 0,
    align: "center",
    width: "85px",
  },
  {
    title: "Antigüedad",
    key: "Antiguedad",
    value: (item) => Number(item.Antiguedad ?? item.ANTIGUEDAD) || 0,
    align: "center",
    width: "85px",
  },
  {
    title: "Vto. Escalafón",
    key: "VtoEscalafon",
    value: (item) => String(item.VtoEscalafon ?? item.VTOESCALAFON ?? ""),
    align: "center",
    width: "115px",
  },
  {
    title: "Tipo Empleo",
    key: "TipoEmpleoDescripcion",
    value: (item) => String(item.TipoEmpleoDescripcion ?? item.TIPOEMPLEODESCRIPCION ?? getName(tiposEmpleo, item.TipoEmpleoId ?? item.TIPOEMPLEOID) ?? "").toLowerCase(),
    align: "start",
    width: "135px",
  },
  {
    title: "Sit. Revista",
    key: "SituacionRevistaDescripcion",
    value: (item) => String(item.SituacionRevistaDescripcion ?? item.SITUACIONREVISTADESCRIPCION ?? "").toLowerCase(),
    align: "start",
    width: "125px",
  },
  {
    title: "Fecha Baja",
    key: "FechaBaja",
    value: (item) => String(item.FechaBaja ?? item.FECHABAJA ?? ""),
    align: "center",
    width: "105px",
  },
  {
    title: "Estado Cargo",
    key: "EstadoCargoDescripcion",
    value: (item) => String(item.EstadoCargoDescripcion ?? item.ESTADOCARGODESCRIPCION ?? getName(estadosCargo, item.EstadoCargoId ?? item.ESTADOCARGOID) ?? "").toLowerCase(),
    align: "center",
    width: "115px",
  },
  {
    title: "Tipo O.S.",
    key: "TipoObraSocialDescripcion",
    value: (item) => String(item.TipoObraSocialDescripcion ?? item.TIPOOBRASOCIALDESCRIPCION ?? getName(tiposOS, item.TipoObraSocialId ?? item.TIPOOBRASOCIALID) ?? "").toLowerCase(),
    align: "start",
    width: "125px",
  },
  {
    title: "Tipo Liquidación",
    key: "TipoLiquidacionDescripcion",
    value: (item) => String(item.TipoLiquidacionDescripcion ?? item.TIPOLIQUIDACIONDESCRIPCION ?? getName(tipoLiq, item.TipoLiquidacionId ?? item.TIPOLIQUIDACIONID) ?? "").toLowerCase(),
    align: "center",
    width: "130px",
  },
  {
    title: "Salario",
    key: "Salario",
    value: (item) => Number(item.Salario ?? item.SALARIO) || 0,
    align: "center",
    width: "80px",
  },
  {
    title: "Uni. Org.",
    key: "UniOrg",
    value: (item) => String(item.UniOrg ?? item.UNIORG ?? item.UniOrgId ?? item.UNIORGID ?? ""),
    align: "center",
    width: "95px",
  },
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
  urlUpd: "sp/cargos_spuCargo",
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
        v-model:sort-by="sortBy"
        class="text-caption"
        hover
        density="compact"
        :items="data"
        :headers="hojasHeaders"
      >
        <template #item="{ item }">
          <tr
            class="pa-0 ma-0 cursor-pointer"
            :class="{ 'bg-blue-lighten-5': (cargoSeleccionado?.ID === (item.ID || item.Id) || cargoSeleccionado?.Id === (item.ID || item.Id)) }"
            @click="seleccionarCargo(item)"
          >
            <!-- Acciones (al inicio) -->
            <td class="text-center pa-1 sticky">
              <div class="d-flex align-center justify-center ga-1">
                <v-btn
                  size="x-small"
                  color="primary"
                  variant="flat"
                  prepend-icon="mdi-format-list-checks"
                  class="font-weight-bold"
                  @click.stop="handleListaConceptos(item.ID || item.Id)"
                >
                  Conceptos Liq
                </v-btn>
                <TooltipButton
                  :icono="'mdi-pencil'"
                  :toolMsg="'Editar Cargo'"
                  :funcion="handleModif"
                  :itemid="item.ID || item.Id"
                ></TooltipButton>
                <TooltipButton
                  :icono="'mdi-dots-horizontal-circle'"
                  :toolMsg="'Ver detalle del Cargo'"
                  :funcion="handleVerCargo"
                  :itemid="item.ID || item.Id"
                ></TooltipButton>
              </div>
            </td>

            <!-- 1. ReparticionId -->
            <td class="text-center pa-1">{{ item.ReparticionId ?? item.REPARTICIONID }}</td>

            <!-- 2. Orden -->
            <td class="text-center pa-1 font-weight-medium">{{ item.Orden ?? item.ORDEN }}</td>

            <!-- 3. PersonaDocumento -->
            <td class="text-right pa-1 font-weight-medium">
              {{ documento(item.PersonaDocumento ?? item.PERSONADOCUMENTO ?? item.DOCUMENTO) }}
            </td>

            <!-- 4. PersonaApellido -->
            <td class="text-left pa-1 font-weight-medium">
              {{ item.PersonaApellido ?? item.PERSONAAPELLIDO ?? item.APELLIDO ?? '—' }}
            </td>

            <!-- 5. PersonaNombre -->
            <td class="text-left pa-1">
              {{ item.PersonaNombre ?? item.PERSONANOMBRE ?? item.NOMBRE ?? '—' }}
            </td>

            <!-- 6. Categoria -->
            <td class="text-center pa-1 font-weight-bold">
              {{ item.Categoria ?? item.CATEGORIA ?? '—' }}
            </td>

            <!-- 7. Antiguedad -->
            <td class="text-center pa-1 font-weight-medium">
              {{ item.Antiguedad ?? item.ANTIGUEDAD ?? 0 }}
            </td>

            <!-- 8. VtoEscalafon -->
            <td class="text-center pa-1">
              {{ getVto(item.VtoEscalafon ?? item.VTOESCALAFON) || '—' }}
            </td>

            <!-- 9. TipoEmpleoDescripcion -->
            <td class="text-left pa-1">
              <v-chip size="x-small" variant="tonal" color="blue-grey">
                {{ item.TipoEmpleoDescripcion ?? item.TIPOEMPLEODESCRIPCION ?? getName(tiposEmpleo, item.TipoEmpleoId ?? item.TIPOEMPLEOID) ?? '—' }}
              </v-chip>
            </td>

            <!-- 10. SituacionRevistaDescripcion -->
            <td class="text-left pa-1">
              {{ item.SituacionRevistaDescripcion ?? item.SITUACIONREVISTADESCRIPCION ?? '—' }}
            </td>

            <!-- 11. FechaBaja -->
            <td class="text-center pa-1">
              {{ getFechaDMY(item.FechaBaja ?? item.FECHABAJA) || '—' }}
            </td>

            <!-- 12. EstadoCargoDescripcion -->
            <td class="text-center pa-1">
              <v-chip
                :color="(item.EstadoCargoId ?? item.ESTADOCARGOID) === 1 ? 'success' : 'error'"
                size="x-small"
                class="font-weight-bold"
              >
                {{ item.EstadoCargoDescripcion ?? item.ESTADOCARGODESCRIPCION ?? getName(estadosCargo, item.EstadoCargoId ?? item.ESTADOCARGOID) ?? '—' }}
              </v-chip>
            </td>

            <!-- 13. TipoObraSocialDescripcion -->
            <td class="text-left pa-1">
              <v-chip size="x-small" variant="tonal" color="indigo">
                {{ item.TipoObraSocialDescripcion ?? item.TIPOOBRASOCIALDESCRIPCION ?? getName(tiposOS, item.TipoObraSocialId ?? item.TIPOOBRASOCIALID) ?? '—' }}
              </v-chip>
            </td>

            <!-- 14. TipoLiquidacionDescripcion -->
            <td class="text-center pa-1">
              <v-chip size="x-small" variant="tonal" color="primary">
                {{ item.TipoLiquidacionDescripcion ?? item.TIPOLIQUIDACIONDESCRIPCION ?? getName(tipoLiq, item.TipoLiquidacionId ?? item.TIPOLIQUIDACIONID) ?? '—' }}
              </v-chip>
            </td>

            <!-- 15. Salario -->
            <td class="text-center pa-1">
              <v-chip
                size="x-small"
                :color="(item.Salario ?? item.SALARIO) === 1 ? 'blue-grey' : 'grey-lighten-2'"
              >
                {{ (item.Salario ?? item.SALARIO) === 1 ? 'SÍ' : 'NO' }}
              </v-chip>
            </td>

            <!-- 16. UniOrg -->
            <td class="text-center pa-1">
              {{ item.UniOrg ?? item.UNIORG ?? item.UniOrgId ?? item.UNIORGID ?? '—' }}
            </td>
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
  background-color: inherit;
  min-width: 150px !important;
  z-index: 2 !important;
}
</style>
