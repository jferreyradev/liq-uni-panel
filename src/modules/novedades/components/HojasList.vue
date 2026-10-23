<script setup>
import { ref } from "vue";
import HojaVista from "./HojaVista.vue";
import { getName, tipoCarga, estadosHoja } from "@/utils/tipos";
import { leerDatos, ejecutarSP } from "@/shared/services/apiService";
import { TooltipButton, ConfirmacionDialog } from "@/shared/components";
import { getVto, getFechaDMY } from "@/utils/formatos";
import HojasListFilter from "./HojasListFilter.vue";

const props = defineProps(["setHojaEdicion", "filtros"]);

const hojasHeaders = [
  { title: "", key: "ACCIONES" },
  { title: "Id.", key: "ID" },
  { title: "Tipo Hoja", key: "TIPOHOJADESCRIPCION" },
  { title: "Período", key: "PERIODOID" },
  { title: "Tipo Carga", key: "TIPOCARGAID" },
  { title: "Tipo Liq", key: "TIPOLIQUIDACIONDESCRIPCION" },
  { title: "Grupo", key: "GRUPOADICIONAL" },
  { title: "Fec. Creac.", key: "FECHACREACION" },
  { title: "Estado", key: "ESTADOHOJAID" },
];

// alerta de grabación o error
const mostrarAlert = ref(false);
const alertMensaje = ref(null);
const alertTipo = ref(null);

// manejadores de altas, bajas y modificaciones
const itemMostrar = ref({
  Nro: 0,
  Tipo: "Sin Tipo",
});

function handleModif(itemid) {
  mostrarAlert.value = false;
  let item = null;
  if (itemid !== null && itemid !== 0 && Array.isArray(data.value)) {
    item = data.value.find((e) => (e?.ID == itemid || e?.Id == itemid));
  }
  abrirModal(item);
}

const itemEliminar = ref(0);
const accionHoja = ref(0);
let muestraConfirmacion = ref(false);

function handleAnular(itemid) {
  mostrarAlert.value = false;
  itemEliminar.value = itemid;
  accionHoja.value = 6;
  muestraConfirmacion.value = true;
}
function handleCerrarHoja(itemid) {
  mostrarAlert.value = false;
  itemEliminar.value = itemid;
  accionHoja.value = 4;
  muestraConfirmacion.value = true;
}

function cierraConfirmacion() {
  muestraConfirmacion.value = false;
}

// apertura y cierre del formulario modal
let muestraRegistro = ref(false);

function abrirModal(item) {
  itemMostrar.value = item;
  muestraRegistro.value = true;
}

function cierraForm() {
  muestraRegistro.value = false;
}

// llamadas a API de grabación y eliminación

async function grabarSP(item, id) {
  let url = id == 0 ? "sp/HojaIns" : "sp/HojaUpd";

  try {
    const { operacionOk, valorError, valorSalida, out, datos } = await ejecutarSP(url, item);
    const errCode = valorError !== undefined && valorError !== -1
      ? valorError
      : (out?.vError ?? datos?.out?.vError ?? (operacionOk ? 0 : -1));

    if (operacionOk && errCode == 0) {
      Promise.resolve(leerHojas(props.filtros.getFiltroString())).catch((e) => {
        console.warn("Error refrescando lista Hojas:", e);
      });
      alertMensaje.value = "Se grabó la hoja Nº " + (valorSalida || "");
      alertTipo.value = "success";
      mostrarAlert.value = true;
      return true;
    }
  } catch (err) {
    console.error("Error en grabarSP Hojas:", err);
  }

  return false;
}

async function CambiarEstadoHojaSP(id) {
  let item = {
    vIDHOJANOV: id,
    vIDESTADOHOJA: accionHoja.value,
  };
  let url = "sp/HojaUpdEstado";

  const { valorError, errorMsg } = await ejecutarSP(url, item);
  if (valorError == 0) {
    await leerHojas(props.filtros.getFiltroString());
    alertMensaje.value = "Se actualizó el estado de la hoja Nº" + id;
    alertTipo.value = "success";
    mostrarAlert.value = true;
  } else if (valorError <= 100) {
    alertMensaje.value = errorMsg;
    alertTipo.value = "error";
    mostrarAlert.value = true;
  } else {
    console.log(errorMsg);
    alertMensaje.value = "No se pudieron grabar los datos";
    alertTipo.value = "error";
    mostrarAlert.value = true;
  }
  cierraConfirmacion();
}

// lectura de registros
let isPending = ref(false);
const data = ref(null);
const error = null;

const lecturaHojas = ref(true);

async function leerHojas(filtro = null) {
  let url = "view/hojaNov";
  if (filtro !== null) url = url + "?" + filtro;
  url = url + '&sort={"Id":"asc"}';
  isPending.value = true;
  const { datos, operacionOk } = await leerDatos(url);
  data.value = datos;
  lecturaHojas.value = operacionOk;
  isPending.value = false;
}

// editar registros de Hoja
function handleEditarRegistros(itemid) {
  let item = Array.isArray(data.value) ? data.value.find((e) => (e?.ID == itemid || e?.Id == itemid)) : null;
  props.setHojaEdicion(item);
}

if (props.filtros.getFiltroString() != null)
  leerHojas(props.filtros.getFiltroString());
</script>

<template>
  <v-container>
    <v-container>
      <HojasListFilter
        :filtrar="leerHojas"
        :filtros="props.filtros"
      ></HojasListFilter>

      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        elevation="3"
        @click="handleModif(null)"
        >Nueva Hoja</v-btn
      >
    </v-container>
    <div v-if="isPending">loading...</div>
    <div v-else-if="!lecturaHojas">Error al intentar recibir los datos</div>
    <div v-else-if="data">
      <v-alert
        v-model="mostrarAlert"
        border="start"
        close-label="Close Alert"
        :color="alertTipo"
        :icon="'$' + alertTipo"
        closable
      >
        {{ alertMensaje }}
      </v-alert>

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
                v-if="item.ESTADOHOJAID != 4 && item.ESTADOHOJAID != 6"
                :icono="'mdi-pencil'"
                :toolMsg="'Editar'"
                :funcion="handleModif"
                :itemid="item.ID"
              ></TooltipButton>
              <TooltipButton
                v-if="item.ESTADOHOJAID != 4 && item.ESTADOHOJAID != 6"
                :icono="'mdi-delete'"
                :toolMsg="'Eliminar'"
                :funcion="handleAnular"
                :itemid="item.ID"
              ></TooltipButton>
              <TooltipButton
                :icono="'mdi-list-box-outline'"
                :toolMsg="'Editar Registros'"
                :funcion="handleEditarRegistros"
                :itemid="item.ID"
              ></TooltipButton>
              <TooltipButton
                v-if="item.ESTADOHOJAID != 4 && item.ESTADOHOJAID != 6"
                :icono="'mdi-check-bold'"
                :toolMsg="'Cerrar'"
                :funcion="handleCerrarHoja"
                :itemid="item.ID"
              ></TooltipButton>
            </td>

            <td class="text-right m-0 p-0">{{ item.ID }}</td>
            <td class="text-left m-0 p-0">{{ item.TIPOHOJADESCRIPCION }}</td>
            <td class="text-center m-0 p-0">{{ getVto(item.PERIODOID) }}</td>
            <td class="text-center m-0 p-0">
              {{ getName(tipoCarga, item.TIPOCARGAID) }}
            </td>
            <td class="text-left m-0 p-0">
              {{ item.TIPOLIQUIDACIONDESCRIPCION }}
            </td>
            <td class="text-center m-0 p-0">{{ item.GRUPOADICIONAL }}</td>
            <td class="text-center m-0 p-0">
              {{ getFechaDMY(item.FECHACREACION) }}
            </td>
            <td class="text-center m-0 p-0">
              {{ getName(estadosHoja, item.ESTADOHOJAID) }}
            </td>
          </tr>
        </template>
      </v-data-table>
    </div>
    <div v-else>Sin datos para mostrar</div>
    <div v-if="error">No se puede obtener los datos solicitados.</div>
  </v-container>

  <v-dialog v-model="muestraRegistro" max-width="80%" persistent="">
    <hoja-vista
      v-if="muestraRegistro"
      :Hoja="itemMostrar"
      :cerrar="cierraForm"
      :funcion="grabarSP"
    ></hoja-vista>
  </v-dialog>

  <v-dialog v-model="muestraConfirmacion" max-width="80%" persistent="">
    <ConfirmacionDialog
      v-if="accionHoja == 6"
      :titulo="'Anular Hoja'"
      :mensaje="'Seguro que desea anular la hoja?'"
      :cerrar="cierraConfirmacion"
      :aceptar="CambiarEstadoHojaSP"
      :parametro="itemEliminar"
    ></ConfirmacionDialog>
    <ConfirmacionDialog
      v-if="accionHoja == 4"
      :titulo="'Cerrar Hoja'"
      :mensaje="'Seguro que desea cerrar la hoja?'"
      :cerrar="cierraConfirmacion"
      :aceptar="CambiarEstadoHojaSP"
      :parametro="itemEliminar"
    ></ConfirmacionDialog>
  </v-dialog>
</template>

<style>
.sticky {
  position: sticky !important;
  left: 0 !important;
  min-width: 130px !important;
  z-index: 10 !important;
}
</style>
