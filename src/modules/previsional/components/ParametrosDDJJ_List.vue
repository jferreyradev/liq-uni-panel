<script setup>
import { ref } from "vue";
import { ConfirmacionDialog, TooltipButton } from "@/shared/components";
import { leerDatos, ejecutarSP } from "@/shared/services/apiService";

import { getVto, financial } from "@/utils/formatos";
import ParametrosDDJJ_Vista from "./ParametrosDDJJ_Vista.vue";
import { utils, writeFileXLSX } from "xlsx";
import { agregaTitulosExcel } from "@/utils/reportes.js";

const props = defineProps(["cerrar"]);
const cerrar = props.cerrar;

const listaHeaders = [
  { title: "", key: "" },
  { title: "ID", key: "ID" },
  { title: "Periodo", key: "PERIODO" },
  { title: "Hasta", key: "PERIODOHASTA" },
  { title: "Ap. Jub. Min", key: "JUBMIN" },
  { title: "Ap. Jub. Max.", key: "JUBMAX" },
  { title: "% Ap. Jub.", key: "PORCREP" },
  { title: "Cont. Jub. Max.", key: "CONTJUBMAX" },
  { title: "% Cont. Jub.", key: "CONTJUBPORC" },
  { title: "Ap. OS Min.", key: "APOSMIN" },
  { title: "Ap. OS Max.", key: "APOSMAX" },
  { title: "Cont. OS Min.", key: "CONTOSMIN" },
  { title: "Cont. OS Max.", key: "CONTOSMAX" },
];

// lectura de registros
let isPending = ref(false);
const data = ref(null);
const error = null;

const lecturaListaRegs = ref(true);

async function leerListaRegs() {
  isPending.value = true;
  const { datos, operacionOk } = await leerDatos(
    'view/ddjjParam?sort={"Periodo":"desc"}',
  );
  data.value = datos;
  lecturaListaRegs.value = operacionOk;
  isPending.value = false;
}

leerListaRegs();

// alerta de grabación o error
const mostrarAlert = ref(false);
const alertMensaje = ref(null);
const alertTipo = ref(null);

// manejadores de altas, bajas y modificaciones
const itemMostrar = ref({
  Id: null,
});

function handleModif(itemid) {
  mostrarAlert.value = false;
  let item = null;
  if (itemid != null && itemid !== 0 && Array.isArray(data.value)) {
    item = data.value.find((e) => (e?.ID == itemid || e?.Id == itemid));
  }
  abrirModal(item);
}

const itemEliminar = ref(0);
let muestraConfirmacion = ref(false);

function handleEliminar(itemid) {
  mostrarAlert.value = false;
  itemEliminar.value = itemid;
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

// funciones de agregado, modificación y eliminación
async function grabarSP(item, id) {
  let url = id == 0 ? "sp/ddjjIns" : "sp/ddjjUpd";

  try {
    const { operacionOk, valorError, valorSalida, errorMsg, datos, out } =
      await ejecutarSP(url, item);
    const errCode =
      valorError !== undefined && valorError !== -1
        ? valorError
        : (out?.vError ?? datos?.out?.vError ?? (operacionOk ? 0 : -1));

    if (operacionOk && errCode == 0) {
      Promise.resolve(leerListaRegs()).catch((e) => {
        console.warn("Error refrescando lista DDJJ:", e);
      });
      alertMensaje.value =
        "Se grabó el rango de parámetros con Id=" + (valorSalida || "");
      alertTipo.value = "success";
      mostrarAlert.value = true;
      return true;
    }
    console.log("error de grabacion: " + (errorMsg || out?.vErrorMsg || ""));
  } catch (err) {
    console.error("Error en grabarSP DDJJ:", err);
  }

  return false;
}

async function eliminar(id) {
  muestraConfirmacion.value = false;
  let item = {
    vID: id,
  };
  let url = "sp/ddjjDel";

  try {
    const { operacionOk, valorError, datos, out } = await ejecutarSP(url, item);
    const errCode =
      valorError !== undefined && valorError !== -1
        ? valorError
        : (out?.vError ?? datos?.out?.vError ?? (operacionOk ? 0 : -1));

    if (operacionOk && errCode == 0) {
      Promise.resolve(leerListaRegs()).catch((e) => {
        console.warn("Error refrescando lista DDJJ:", e);
      });
      alertMensaje.value = "Se eliminó el rango con ID: " + id;
      alertTipo.value = "success";
      mostrarAlert.value = true;
      return true;
    }
  } catch (err) {
    console.error("Error en eliminar DDJJ:", err);
  }

  alertMensaje.value = "No se pudo eliminar el rango";
  alertTipo.value = "error";
  mostrarAlert.value = true;
  return false;
}

function handleDownload() {
  exportFile();
}

function exportFile() {
  if (!Array.isArray(data.value)) return;
  const map1 = data.value.map((x) => {
    return [
      x?.ID || "",
      getVto(x?.PERIODO),
      getVto(x?.PERIODOHASTA),
      x?.JUBMIN || 0,
      x?.JUBMAX || 0,
      x?.PORCREP || 0,
      x?.CONTJUBMAX || 0,
      x?.CONTJUBPORC || 0,
      x?.APOSMIN || 0,
      x?.APOSMAX || 0,
      x?.CONTOSMIN || 0,
      x?.CONTOSMAX || 0,
    ];
  });

  const titulosTabla = [
    "Id",
    "Período",
    "Per. Hasta",
    "Ap. Jub. Min.",
    "Ap. Jub. Max.",
    "Ap. Jub. %",
    "Contr. Máx.",
    "Contr. Porc.",
    "Ap. OS Mín.",
    "Ap. OS Máx.",
    "Contr. OS Mín.",
    "Contr. OS Máx.",
  ];
  const filtros = "";
  const tituloReporte = "Parámetros para las Declaraciones Juradas 931 ";
  agregaTitulosExcel(map1, tituloReporte, filtros, titulosTabla);
  const ws = utils.aoa_to_sheet(map1);

  ws["!cols"] = [
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
  ];
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");

  writeFileXLSX(wb, "ParametrosDDJJ.xlsx", {
    compression: true,
  });
}
</script>

<template>
  <v-container>
    <v-row>
      <p>
        <b>Parámetros de DDJJ 931</b>
      </p>
    </v-row>
  </v-container>
  <v-container>
    <v-container>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        elevation="3"
        @click="handleModif(null)"
        >Nuevo rango</v-btn
      >
      <v-btn color="primary" :disabled="!data" @click="handleDownload"
        >Descargar</v-btn
      >
      <v-btn
        color="primary"
        prepend-icon="mdi-close"
        elevation="3"
        @click="cerrar()"
        >Cerrar Parámetros</v-btn
      >
    </v-container>
    <div v-if="isPending">loading...</div>
    <div v-else-if="!lecturaListaRegs">Sin datos para mostrar</div>
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
        :headers="listaHeaders"
      >
        <template #item="{ item }">
          <tr class="pa-0 ma-0">
            <td class="text-center m-0 p-0 sticky">
              <TooltipButton
                :icono="'mdi-pencil'"
                :toolMsg="'Editar'"
                :funcion="handleModif"
                :itemid="item.ID"
              ></TooltipButton>
              <TooltipButton
                :icono="'mdi-delete'"
                :toolMsg="'Eliminar'"
                :funcion="handleEliminar"
                :itemid="item.ID"
              ></TooltipButton>
            </td>
            <td class="text-right m-0 p-0">{{ item.ID }}</td>
            <td class="text-right m-0 p-0">{{ getVto(item.PERIODO) }}</td>
            <td class="text-right m-0 p-0">{{ getVto(item.PERIODOHASTA) }}</td>
            <td class="text-right m-0 p-0">{{ financial(item.JUBMIN) }}</td>
            <td class="text-right m-0 p-0">{{ financial(item.JUBMAX) }}</td>
            <td class="text-right m-0 p-0">{{ financial(item.PORCREP) }}</td>
            <td class="text-right m-0 p-0">{{ financial(item.CONTJUBMAX) }}</td>
            <td class="text-right m-0 p-0">
              {{ financial(item.CONTJUBPORC) }}
            </td>
            <td class="text-right m-0 p-0">{{ financial(item.APOSMIN) }}</td>
            <td class="text-center m-0 p-0">{{ financial(item.APOSMAX) }}</td>
            <td class="text-center m-0 p-0">{{ financial(item.CONTOSMIN) }}</td>
            <td class="text-right m-0 p-0">{{ financial(item.CONTOSMAX) }}</td>
          </tr>
        </template>
      </v-data-table>
    </div>
    <div v-else-if="error">No se puede obtener los datos solicitados.</div>
  </v-container>

  <v-dialog v-model="muestraRegistro" max-width="80%" persistent="">
    <ParametrosDDJJ_Vista
      v-if="muestraRegistro"
      :Registro="itemMostrar"
      :cerrar="cierraForm"
      :funcion="grabarSP"
    ></ParametrosDDJJ_Vista>
  </v-dialog>

  <v-dialog v-model="muestraConfirmacion" max-width="80%" persistent="">
    <ConfirmacionDialog
      :titulo="'Eliminar registro'"
      :mensaje="'Seguro que desea eliminar el registro?'"
      :cerrar="cierraConfirmacion"
      :aceptar="eliminar"
      :parametro="itemEliminar"
    ></ConfirmacionDialog>
  </v-dialog>
</template>

<style>
.sticky {
  position: sticky !important;
  left: 0 !important;
  min-width: 100px !important;
  z-index: 10 !important;
}
</style>
