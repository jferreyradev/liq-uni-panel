<script setup>
import { ref, computed } from "vue";
import Confirmacion from "./Confirmacion.vue";
import { leerDatos, ejecutarSP } from "./llamadaAPI";
import botonTooltip from "./botonTooltip.vue";
import { getFechaDMY, getTipoDescripcion } from "@/utils/formatos";
import CargaFamiliarVista from "./CargaFamiliarVista.vue";
import { utils, writeFileXLSX } from "xlsx";
import { agregaTitulosExcel } from "@/utils/reportes.js";
import CargaFamiliarCargos from "./CargaFamiliarCargos.vue";

const props = defineProps(["setPersonaEdicion", "personaEditar"]);
const personaEditar = props.personaEditar;

// cerrar editar registros de Hoja
function handleCerrarEdicion() {
  props.setPersonaEdicion(null, 0);
}

const listaHeaders = [
  { title: "", key: "" },
  { title: "DNI", key: "DOCUMENTO" },
  { title: "Ape. y Nom.", key: "APELLIDOYNOMBRE" },
  { title: "Relacion", key: "TIPORELACIONDESCRIPCION" },
  { title: "Fec. Nac.", key: "FECHANACIMIENTO" },
  { title: "Escolaridad", key: "TIPOESCOLARIDADDESCRIPCION" },
  { title: "Grado", key: "GRADO" },
  { title: "Discapacitado", key: "DISCAPACITADO" },
];

// lectura de registros
let isPending = ref(false);
const data = ref(null);
const error = null;

const lecturaListaRegs = ref(true);

const personaId = computed(
  () => props.personaEditar?.PERSONAID || props.personaEditar?.ID || props.personaEditar?.Id || 0,
);

async function leerListaRegs() {
  const pId = personaId.value;
  if (!pId) return;
  isPending.value = true;
  try {
    const { datos, operacionOk } = await leerDatos(
      "en/cargaFamiliar?PersonaId=" + pId + "&_t=" + Date.now(),
    );
    data.value = Array.isArray(datos) ? datos : datos ? [datos] : [];
    lecturaListaRegs.value = operacionOk;
  } catch (err) {
    console.error("Error en leerListaRegs:", err);
    lecturaListaRegs.value = false;
  }
  isPending.value = false;
}

// lectura de cargo asociado
const cargoAsociado = ref({
  cargoId: 0,
  descripcion: "",
});

async function leerCargoAsoc() {
  const pId = personaId.value;
  if (!pId) return;
  let resultado = {
    cargoId: 0,
    descripcion: "No se pudieron establecer obtener datos del cargo",
  };
  try {
    const { datos, operacionOk } = await leerDatos(
      "en/cargo?PersonaId=" + pId + "&Salario=1&_t=" + Date.now(),
    );
    if (operacionOk === true) {
      const cargoAsoc = Array.isArray(datos) && datos.length > 0 ? datos[0] : null;
      if (!cargoAsoc) {
        resultado.descripcion = "No hay cargo asociado aún para el salario";
      } else {
        resultado.cargoId = cargoAsoc.ID || cargoAsoc.Id || 0;
        resultado.descripcion =
          "Rep.: " +
          (cargoAsoc.REPARTICIONID || "") +
          " - Orden: " +
          (cargoAsoc.ORDEN || "") +
          " - Tipo: " +
          getTipoDescripcion(
            cargoAsoc.TIPOEMPLEOID,
            cargoAsoc.TIPOEMPLEODESCRIPCION,
          );
      }
    }
  } catch (err) {
    console.error("Error en leerCargoAsoc:", err);
  }
  cargoAsociado.value = resultado;
}

leerListaRegs();
leerCargoAsoc();

// alerta de grabación o error
const mostrarAlert = ref(false);
const alertMensaje = ref(null);
const alertTipo = ref(null);

// manejadores de altas, bajas y modificaciones

const itemMostrar = ref(null);

function handleModif(itemid) {
  mostrarAlert.value = false;
  let item = null;
  if (itemid != null && itemid !== 0 && Array.isArray(data.value)) {
    item = data.value.find((e) => (e?.ID == itemid || e?.Id == itemid));
  }
  abrirModal(item);
}

//  confirmaciones
const itemEliminar = ref(0);
let muestraConfirmacion = ref(false);
const itemDesasociar = ref(0);
let muestraConfAsociar = ref(false);

function cierraConfirmacion() {
  muestraConfirmacion.value = false;
}
function cierraConfAsociar() {
  muestraConfAsociar.value = false;
}

function handleEliminar(itemid) {
  mostrarAlert.value = false;
  itemEliminar.value = itemid;
  muestraConfirmacion.value = true;
}

function handleDesasociar(itemid) {
  mostrarAlert.value = false;
  itemDesasociar.value = itemid;
  muestraConfAsociar.value = true;
}

// apertura y cierre del formulario modal
let muestraRegistro = ref(false);
let muestraListaCargos = ref(false);

function abrirModal(item) {
  itemMostrar.value = item;
  muestraRegistro.value = true;
}

function cierraForm() {
  muestraRegistro.value = false;
}

function abrirModalCargos() {
  muestraListaCargos.value = true;
}

function cierraFormCargos() {
  muestraListaCargos.value = false;
}

// funciones de agregado, modificación y eliminación
async function grabarSP(item, id) {
  let mensajeError = "No se pudieron grabar los datos";
  let url = "";
  if (id == 0) {
    url = "sp/CargaFamIns";
  } else {
    url = "sp/CargaFamUpd";
  }

  try {
    const { operacionOk, valorError, errorMsg, datos, out } = await ejecutarSP(url, item);
    const errCode = valorError !== undefined && valorError !== -1
      ? valorError
      : (out?.vError ?? out?.ValorError ?? datos?.out?.vError ?? datos?.out?.ValorError ?? (operacionOk ? 0 : -1));

    if (operacionOk && errCode == 0) {
      await Promise.allSettled([leerListaRegs(), leerCargoAsoc()]);
      alertMensaje.value = id == 0 ? "Familiar agregado correctamente" : "Familiar modificado correctamente";
      alertTipo.value = "success";
      mostrarAlert.value = true;
      return null;
    }
    mensajeError = errorMsg || out?.vErrorMsg || out?.vErrorMsj || datos?.out?.vErrorMsg || "No se pudieron grabar los datos";
  } catch (err) {
    console.error("Error en grabarSP:", err);
    mensajeError = err.message || "Error al intentar grabar los datos";
  }

  return mensajeError;
}

async function eliminar(id) {
  muestraConfirmacion.value = false;
  let item = {
    vIDCARFAM: id,
  };
  let url = "sp/CargaFamDel";
  console.log(item);
  try {
    const { operacionOk, valorError, errorMsg, datos, out } = await ejecutarSP(url, item);
    const errCode = valorError !== undefined && valorError !== -1
      ? valorError
      : (out?.vError ?? datos?.out?.vError ?? (operacionOk ? 0 : -1));

    if (operacionOk && errCode == 0) {
      await leerListaRegs();
      alertMensaje.value = "Se eliminó el registro";
      alertTipo.value = "success";
      mostrarAlert.value = true;
      return true;
    }
    alertMensaje.value = errorMsg || "No se pudo eliminar el registro";
  } catch (err) {
    console.error("Error en eliminar:", err);
    alertMensaje.value = err.message || "No se pudo eliminar el registro";
  }

  alertTipo.value = "error";
  mostrarAlert.value = true;
  return false;
}

// funciones de agregado, modificación y eliminación
async function grabarSPCargos(item) {
  let mensajeError = "No se pudieron grabar los datos";
  let url = "sp/AsignaSalario";

  try {
    const { operacionOk, valorError, errorMsg, datos, out } = await ejecutarSP(url, item);
    const errCode = valorError !== undefined && valorError !== -1
      ? valorError
      : (out?.vError ?? datos?.out?.vError ?? (operacionOk ? 0 : -1));

    if (operacionOk && errCode == 0) {
      await leerCargoAsoc();
      alertMensaje.value = "Se actualizó la asignación de cargo";
      alertTipo.value = "success";
      mostrarAlert.value = true;
      return null;
    }
    mensajeError = errorMsg || out?.vErrorMsg || datos?.out?.vErrorMsg || "No se pudieron grabar los datos";
  } catch (err) {
    console.error("Error en grabarSPCargos:", err);
    mensajeError = err.message || "No se pudieron grabar los datos";
  }

  return mensajeError;
}

async function desasociarCargo(idCargo) {
  muestraConfAsociar.value = false;
  let registroGrabar = {
    vIDCARGO: idCargo,
    vASIGNA: 0,
  };

  let resultado = await grabarSPCargos(registroGrabar);

  if (resultado !== null) {
    alertMensaje.value = "No se pudo actualizar la asignación de cargo ";
    alertTipo.value = "error";
    mostrarAlert.value = true;
  }
}

// -------------------------------------------------
// funciones de exportación a archivo excel

function handleDownload() {
  console.log("download");
  exportFile();
}

function exportFile() {
  const map1 = data.value.map((x) => {
    return [
      x.DOCUMENTO,
      x.APELLIDOYNOMBRE,
      x.TIPORELACIONDESCRIPCION,
      getFechaDMY(x.FECHANACIMIENTO),
      x.TIPOESCOLARIDADDESCRIPCION,
      x.GRADO,
      x.DISCAPACITADO,
    ];
  });

  const titulosTabla = [
    "DNI",
    "Apellido y Nombre",
    "Relación",
    "Fec. Nac.",
    "Tipo Escolaridad",
    "Grado",
    "Disc.",
  ];
  const filtros = "";
  const doc = personaEditar?.DOCUMENTO || personaEditar?.DNI || "";
  const apeNom = (personaEditar?.APELLIDO && personaEditar?.NOMBRE)
    ? `${personaEditar.APELLIDO}, ${personaEditar.NOMBRE}`
    : (personaEditar?.APELLIDOYNOMBRE || "");
  const persId = personaEditar?.PERSONAID || personaEditar?.ID || "";

  const tituloReporte =
    "Cargas de Familia: " +
    doc +
    (apeNom ? " - " + apeNom : "");
  agregaTitulosExcel(map1, tituloReporte, filtros, titulosTabla);
  const ws = utils.aoa_to_sheet(map1);

  ws["!cols"] = [
    { wch: 10 },
    { wch: 20 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 20 },
    { wch: 20 },
  ];
  /* create workbook and append worksheet */
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");

  /* export to XLSX */
  writeFileXLSX(wb, "CargaFamilia_" + `${persId}.xlsx`, {
    compression: true,
  });
}

// --- fin de funciones de exportacion
</script>

<style>
.sticky {
  position: sticky !important;
  left: 0 !important;
  min-width: 100px !important;
  z-index: 10 !important;
}
</style>

<template>
  <v-container>
    <v-container>
      <v-row>
        <v-col cols="2"><div>Cargo Asociado:</div></v-col>
        <v-col cols="5"
          ><div>{{ cargoAsociado.descripcion }}</div></v-col
        >
        <v-col cols="5">
          <v-btn color="blue" @click="abrirModalCargos" :disabled="!data"
            >Asociar cargo</v-btn
          >
          <v-btn
            v-if="cargoAsociado.cargoId !== 0"
            color="teal"
            @click="handleDesasociar(cargoAsociado.cargoId)"
            :disabled="!data"
            >Desvincular de cargo</v-btn
          >
        </v-col>
      </v-row>
      <v-row>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          elevation="3"
          @click="handleModif(null)"
          >Agregar</v-btn
        >
        <v-btn color="primary" @click="handleDownload" :disabled="!data"
          >Descargar</v-btn
        >
        <v-btn
          color="primary"
          prepend-icon="mdi-close"
          elevation="3"
          @click="handleCerrarEdicion()"
          >Volver</v-btn
        >
      </v-row>
    </v-container>

    <v-alert
      v-if="mostrarAlert"
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

    <div v-if="isPending && (!data || data.length === 0)">loading...</div>
    <div v-else-if="!lecturaListaRegs">Sin datos para mostrar</div>
    <div v-else-if="data">
      <v-data-table
        class="text-caption"
        hover
        density="compact"
        :items="data"
        :headers="listaHeaders"
        :loading="isPending"
      >
        <template v-slot:item="{ item }">
          <tr class="pa-0 ma-0">
            <td class="text-center m-0 p-0 sticky">
              <botonTooltip
                :icono="'mdi-pencil'"
                :toolMsg="'Editar'"
                :funcion="handleModif"
                :itemid="item.ID"
              ></botonTooltip>
              <botonTooltip
                :icono="'mdi-delete'"
                :toolMsg="'Eliminar'"
                :funcion="handleEliminar"
                :itemid="item.ID"
              ></botonTooltip>
            </td>
            <td class="text-right m-0 p-0">{{ item.DOCUMENTO }}</td>
            <td class="text-left m-0 p-0">{{ item.APELLIDOYNOMBRE }}</td>
            <td class="text-left m-0 p-0">
              {{ item.TIPORELACIONDESCRIPCION }}
            </td>
            <td class="text-center m-0 p-0">
              {{
                item.TIPORELACIONID == 2
                  ? getFechaDMY(item.FECHANACIMIENTO)
                  : ""
              }}
            </td>
            <td class="text-left m-0 p-0">
              {{
                item.TIPORELACIONID == 2 ? item.TIPOESCOLARIDADDESCRIPCION : ""
              }}
            </td>
            <td class="text-center m-0 p-0">
              {{ item.TIPORELACIONID == 2 ? item.GRADO : "" }}
            </td>
            <td class="text-center m-0 p-0">
              {{
                item.TIPORELACIONID == 2
                  ? item.DISCAPACITADO === 1
                    ? "SI"
                    : "NO"
                  : ""
              }}
            </td>
          </tr>
        </template>
      </v-data-table>
    </div>
    <div v-else-if="error">No se puede obtener los datos solicitados.</div>
  </v-container>

  <v-dialog v-model="muestraRegistro" max-width="80%" persistent="">
    <CargaFamiliarVista
      v-if="muestraRegistro"
      :Registro="itemMostrar"
      :cerrar="cierraForm"
      :funcion="grabarSP"
      :personaId="personaEditar?.PERSONAID || personaEditar?.ID || 0"
    ></CargaFamiliarVista>
  </v-dialog>

  <v-dialog v-model="muestraConfirmacion" max-width="80%" persistent="">
    <confirmacion
      :titulo="'Eliminar registro'"
      :mensaje="'Seguro que desea eliminar el registro?'"
      :cerrar="cierraConfirmacion"
      :aceptar="eliminar"
      :parametro="itemEliminar"
    ></confirmacion>
  </v-dialog>

  <v-dialog v-model="muestraConfAsociar" max-width="80%" persistent="">
    <confirmacion
      :titulo="'Desasociar cargo'"
      :mensaje="'Seguro que desea desasociar el cargo de salario?'"
      :cerrar="cierraConfAsociar"
      :aceptar="desasociarCargo"
      :parametro="itemDesasociar"
    ></confirmacion>
  </v-dialog>

  <v-dialog v-model="muestraListaCargos" max-width="80%" persistent="">
    <CargaFamiliarCargos
      v-if="muestraListaCargos"
      :cerrar="cierraFormCargos"
      :funcion="grabarSPCargos"
      :personaId="personaEditar?.PERSONAID || personaEditar?.ID || 0"
    ></CargaFamiliarCargos>
  </v-dialog>
</template>
