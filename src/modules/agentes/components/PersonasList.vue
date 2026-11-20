<script setup>
import { ref } from "vue";
import { leerDatos, ejecutarSP } from "@/shared/services/apiService";
import { TooltipButton } from "@/shared/components";
import { getFechaDMY } from "@/utils/formatos";
import PersonasListFilter from "./PersonasListFilter.vue";
import PersonasVista from "./PersonasVista.vue";
import { useDataTable } from "@/composables/useDataTable";
import { useSpGrabar } from "@/composables/useSpGrabar";
import { useAgentesFilterStore } from "@/stores/agentesFilterStore";
import { useFilterStore } from "@/stores/filterStore";
import { usePII } from "@/composables/usePII";

const props = defineProps({
  setPersonaEdicion: { type: Function, required: true },
});

const filterStore = useAgentesFilterStore();
const mainFilterStore = useFilterStore();
const { documento, cuil } = usePII();

const hojasHeaders = [
  { title: "", key: "ACCIONES" },
  { title: "DNI", key: "DOCUMENTO" },
  { title: "Apellido", key: "APELLIDO" },
  { title: "Nombre", key: "NOMBRE" },
  { title: "CUIL", key: "PERSONACUIL" },
  { title: "Fec. Ingreso", key: "FECHAINGRESO" },
  { title: "Cobra Ley", key: "COBRALEY", align: "center" },
];

const itemMostrar = ref({
  HojaId: 0,
  Id: 0,
});
const muestraRegistro = ref(false);

// Cambio de condición Cobra Ley (POST /api/sp/estableceNoLey)
const muestraDialogoLey = ref(false);
const personaSeleccionadaLey = ref(null);
const tipoLeySeleccionado = ref("0");
const periodoLey = ref("");
const guardandoLey = ref(false);

function cobraLey(item) {
  if (!item) return true;

  // 1. Si viene NOCOBRALEY (1 = no cobra ley, 0 = cobra ley)
  const valNoCobra =
    item.NOCOBRALEY ??
    item.nocobraley ??
    item["no cobra ley"] ??
    item.NoCobraLey ??
    item.NO_COBRA_LEY;
  if (valNoCobra !== undefined && valNoCobra !== null && valNoCobra !== "") {
    return Number(valNoCobra) !== 1;
  }

  // 2. Si viene COBRALEY (1 = cobra ley / SÍ, 0 = no cobra ley / NO)
  const valCobra =
    item.COBRALEY ??
    item.cobraley ??
    item.CobraLey ??
    item.COBRA_LEY ??
    item.cobra_ley;
  if (valCobra !== undefined && valCobra !== null && valCobra !== "") {
    return Number(valCobra) === 1;
  }

  return true;
}

function noCobraLey(item) {
  return !cobraLey(item);
}

async function obtenerPeriodoActivo() {
  try {
    const { datos, operacionOk } = await leerDatos("view/periodo", { query: { Activo: 1 } });
    if (operacionOk && Array.isArray(datos) && datos.length > 0 && datos[0].PERIODO) {
      const p = datos[0].PERIODO;
      const parts = p.substring(0, 10).split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
  } catch {
    // fallback
  }
  return "01/01/2026";
}

async function abrirCambioLey(item) {
  if (!item) return;
  personaSeleccionadaLey.value = item;
  // Si cobra ley, la acción es excluirlo (Tipo 1, período).
  // Si NO cobra ley (NOCOBRALEY=1), la acción es volver a cobrar (Tipo 0, DNI solo).
  tipoLeySeleccionado.value = cobraLey(item) ? "1" : "0";

  if (mainFilterStore.periodoDMY) {
    periodoLey.value = mainFilterStore.periodoDMY;
  } else {
    periodoLey.value = await obtenerPeriodoActivo();
  }

  muestraDialogoLey.value = true;
}

async function confirmarCambioLey() {
  if (!personaSeleccionadaLey.value) return;
  guardandoLey.value = true;

  const rawDni =
    personaSeleccionadaLey.value.DOCUMENTO ??
    personaSeleccionadaLey.value.Documento ??
    personaSeleccionadaLey.value.Dni ??
    personaSeleccionadaLey.value.DNI ??
    "";
  const dni = String(rawDni).trim().replace(/\./g, "");

  const esExclusion = String(tipoLeySeleccionado.value) === "1";
  const urlSp = esExclusion ? "sp/estableceNoLey" : "sp/eliminaNoLey";
  const payload = esExclusion
    ? {
        Dni: dni,
        Tipo: 1,
        Periodo: String(periodoLey.value).trim(),
      }
    : {
        Dni: dni,
      };

  try {
    const { operacionOk, valorError, errorMsg, out } = await ejecutarSP(urlSp, payload);
    const mensajeErrorOut = out?.VmsgError || out?.vErrorMsg || errorMsg || "";
    const tieneErrorOracle = Boolean(out?.VmsgError && String(out.VmsgError).trim().length > 0);
    const esFallo = !operacionOk || (valorError !== undefined && valorError > 0) || tieneErrorOracle;

    if (operacionOk && !esFallo) {
      alertMensaje.value = esExclusion
        ? `Se excluyó al agente DNI ${dni} del cobro de ley.`
        : `Se restableció el cobro de ley para el agente DNI ${dni}.`;
      alertTipo.value = "success";
      mostrarAlert.value = true;
      muestraDialogoLey.value = false;
      if (personaSeleccionadaLey.value) {
        personaSeleccionadaLey.value.NOCOBRALEY = esExclusion ? 1 : 0;
        personaSeleccionadaLey.value.COBRALEY = esExclusion ? 0 : 1;
      }
      await load(filterStore.personasFiltro);
    } else {
      alertMensaje.value = mensajeErrorOut || "No se pudo actualizar la condición de ley.";
      alertTipo.value = "error";
      mostrarAlert.value = true;
      if (typeof mensajeErrorOut === "string" && mensajeErrorOut.toLowerCase().includes("ya está excluída")) {
        if (personaSeleccionadaLey.value) {
          personaSeleccionadaLey.value.NOCOBRALEY = 1;
          personaSeleccionadaLey.value.COBRALEY = 0;
        }
        muestraDialogoLey.value = false;
      }
    }
  } catch (err) {
    alertMensaje.value = err.message || "Error al conectar con el servidor.";
    alertTipo.value = "error";
    mostrarAlert.value = true;
  } finally {
    guardandoLey.value = false;
  }
}

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
  const { datos, operacionOk } = await leerDatos("persona?Id=" + id);
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

            <td class="text-right m-0 p-0">{{ documento(item.DOCUMENTO) }}</td>
            <td class="text-left m-0 p-0">{{ item.APELLIDO }}</td>
            <td class="text-left m-0 p-0">{{ item.NOMBRE }}</td>
            <td class="text-right m-0 p-0">{{ cuil(item.PERSONACUIL) }}</td>
            <td class="text-left m-0 p-0">
              {{ getFechaDMY(item.FECHAINGRESO) }}
            </td>
            <td class="text-center m-0 p-0">
              <v-chip
                size="x-small"
                :color="cobraLey(item) ? 'teal' : 'grey'"
                class="font-weight-bold cursor-pointer"
                @click="abrirCambioLey(item)"
              >
                {{ cobraLey(item) ? "SÍ COBRA" : "NO COBRA" }}
              </v-chip>
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

  <!-- Modal para cambiar condición Cobra Ley (POST /api/sp/estableceNoLey) -->
  <v-dialog v-model="muestraDialogoLey" max-width="500px" persistent>
    <v-card rounded="lg" class="elevation-3">
      <v-card-title class="d-flex align-center justify-space-between py-3 px-4 bg-primary text-white">
        <div class="d-flex align-center">
          <v-icon icon="mdi-scale-balance" class="me-2" />
          <span class="text-subtitle-1 font-weight-bold">Establecer Condición Cobra Ley</span>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          density="compact"
          color="white"
          :disabled="guardandoLey"
          @click="muestraDialogoLey = false"
        ></v-btn>
      </v-card-title>

      <v-card-text class="pa-4">
        <p class="text-body-1 mb-3">
          {{
            tipoLeySeleccionado === '1'
              ? `¿Está seguro de que desea excluir de cobrar ley al agente ${personaSeleccionadaLey?.APELLIDO || ''}, ${personaSeleccionadaLey?.NOMBRE || ''} (DNI ${documento(personaSeleccionadaLey?.DOCUMENTO)})?`
              : `¿Está seguro de que el agente ${personaSeleccionadaLey?.APELLIDO || ''}, ${personaSeleccionadaLey?.NOMBRE || ''} (DNI ${documento(personaSeleccionadaLey?.DOCUMENTO)}) vuelva a cobrar ley?`
          }}
        </p>
        <div class="text-caption text-grey-darken-1">
          Condición actual: <strong>{{ cobraLey(personaSeleccionadaLey) ? "SÍ COBRA LEY (0)" : "EXCLUIDO / NO COBRA LEY (1)" }}</strong>
        </div>
      </v-card-text>

      <v-card-actions class="px-4 py-3 bg-grey-lighten-4 border-t d-flex justify-end ga-2">
        <v-btn
          variant="outlined"
          color="grey-darken-1"
          :disabled="guardandoLey"
          @click="muestraDialogoLey = false"
        >
          Cancelar
        </v-btn>
        <v-btn
          :color="tipoLeySeleccionado === '1' ? 'warning' : 'teal'"
          variant="flat"
          prepend-icon="mdi-check"
          :loading="guardandoLey"
          @click="confirmarCambioLey"
        >
          {{ tipoLeySeleccionado === '1' ? 'Confirmar Exclusión' : 'Confirmar Reincorporación' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.sticky {
  position: sticky !important;
  left: 0 !important;
  min-width: 140px !important;
  z-index: 10 !important;
}
.cursor-pointer {
  cursor: pointer;
}
</style>
