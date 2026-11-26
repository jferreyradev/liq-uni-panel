<script setup>
import { ref } from "vue";
import { leerDatos } from "@/shared/services/apiService";
import { useSpGrabar } from "@/composables/useSpGrabar";
import { TooltipButton, ConfirmacionDialog } from "@/shared/components";
import { getVto, getFechaDMY, financial } from "@/utils/formatos";
import { utils, writeFileXLSX } from "xlsx";
import { agregaTitulosExcel } from "@/utils/reportes.js";
import NovHaberesVista from "./NovHaberesVista.vue";

const props = defineProps(["setHojaEdicion", "hojaEditar"]);

const hojaEditar = props.hojaEditar;

// cerrar editar registros de Hoja
function handleCerrarEdicion() {
  props.setHojaEdicion(null);
}

const listaHeaders = [
  { title: "Acciones", key: "ACCIONES" },
  { title: "Nro Rep.", key: "NROREPARTICION" },
  { title: "Boleta", key: "NROBOLETA" },
  { title: "Afiliado", key: "NROAFILIADO" },
  { title: "Cód.", key: "CODIGO" },
  { title: "Subcód.", key: "SUBCODIGO" },
  { title: "Clase", key: "CLASE" },
  { title: "Días", key: "DIAS" },
  { title: "Vencimiento", key: "VENCIMIENTO" },
  { title: "Importe", key: "IMPORTE" },
  { title: "Documento", key: "DOCUMENTO" },
  { title: "Apellido", key: "APELLIDO" },
  { title: "Nombre", key: "NOMBRE" },
  { title: "Tipo Empleo", key: "TIPOEMPLEOID" },
  { title: "Sit. Rev.", key: "SITUACIONREVISTAID" },
  { title: "Tipo OS", key: "TIPOOBRASOCIALID" },
  { title: "PPP", key: "PPP" },
  { title: "Fec. Grab.", key: "FECHAGRABACION" },
];

// lectura de registros
let isPending = ref(false);
const data = ref(null);
const error = null;

const lecturaListaRegs = ref(true);

async function leerListaRegs() {
  isPending.value = true;
  const idHoja = hojaEditar?.ID ?? hojaEditar?.Id ?? hojaEditar?.id ?? 0;
  // Se consulta el recurso 'novhaberes' para obtener la totalidad de los registros
  // de la hoja, dado que la vista de BD 'view/novhaberes' filtra agentes según situación de revista.
  let { datos, operacionOk } = await leerDatos("novhaberes?HojaId=" + idHoja);
  if (!operacionOk || !datos || datos.length === 0) {
    const fallback = await leerDatos("view/novhaberes?HojaId=" + idHoja);
    if (fallback.operacionOk && fallback.datos && fallback.datos.length > 0) {
      datos = fallback.datos;
      operacionOk = fallback.operacionOk;
    }
  }
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
  HojaId: 0,
  Id: 0,
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
const { grabar: grabarSP } = useSpGrabar({
  urlIns: "sp/NovHaberesIns",
  urlUpd: "sp/NovHaberesUpd",
  refresh: () => leerListaRegs(),
});

const { grabar: eliminarSP } = useSpGrabar({
  urlUpd: "sp/NovHaberesDel",
  refresh: () => leerListaRegs(),
});

async function grabar(item) {
  const itemId = item?.Id ?? item?.ID ?? 0;
  const mensaje = await grabarSP(item, itemId);

  if (mensaje) {
    alertMensaje.value = mensaje;
    alertTipo.value = "error";
    mostrarAlert.value = true;
    return false;
  }

  alertMensaje.value = "Los datos se grabaron satisfactoriamente";
  alertTipo.value = "success";
  mostrarAlert.value = true;
  return true;
}

async function eliminar(id) {
  muestraConfirmacion.value = false;
  const mensaje = await eliminarSP({ vIDNOVHAB: id }, 1);

  if (mensaje) {
    alertMensaje.value = mensaje;
    alertTipo.value = "error";
    mostrarAlert.value = true;
    return false;
  }

  alertMensaje.value = "Se eliminó el registro";
  alertTipo.value = "success";
  mostrarAlert.value = true;
  return true;
}

function handleDownload() {
  exportFile();
}

function exportFile() {
  if (!data.value || !Array.isArray(data.value)) return;
  const map1 = data.value.map((x) => [
    x.NROREPARTICION,
    x.NROBOLETA,
    x.NROAFILIADO,
    x.CODIGO,
    x.SUBCODIGO,
    x.CLASE,
    x.DIAS,
    getVto(x.VENCIMIENTO),
    financial(x.IMPORTE),
    x.DOCUMENTO,
    x.APELLIDO,
    x.NOMBRE,
    x.TIPOEMPLEOID,
    x.SITUACIONREVISTAID,
    x.TIPOOBRASOCIALID,
    x.PPP,
    getFechaDMY(x.FECHAGRABACION),
  ]);

  const titulosTabla = [
    "Nro Rep.",
    "Boleta",
    "Afiliado",
    "Código",
    "Subcódigo",
    "Clase",
    "Días",
    "Vencimiento",
    "Importe",
    "Documento",
    "Apellido",
    "Nombre",
    "Tipo Empleo",
    "Sit. Rev.",
    "Tipo OS",
    "PPP",
    "Fecha Grab.",
  ];
  const filtros = "";
  const idHoja = hojaEditar?.ID ?? hojaEditar?.Id ?? "";
  const tituloReporte = "Detalle de Hoja Nº: " + idHoja;
  agregaTitulosExcel(map1, tituloReporte, filtros, titulosTabla);
  const ws = utils.aoa_to_sheet(map1);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");
  writeFileXLSX(wb, "DetalleHojaHaberes_" + `${idHoja}.xlsx`, {
    compression: true,
  });
}

// -------------------------------------------------
</script>

<template>
  <v-container>
    <v-row>
      <p>
        <b>Hoja Nro:</b> {{ hojaEditar?.ID ?? hojaEditar?.Id }} -
        <b>Tipo:</b> {{ hojaEditar?.TIPOHOJADESCRIPCION }}
        <span v-if="data"> - <b>Total registros:</b> {{ data.length }}</span>
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
        >Nuevo registro</v-btn
      >
      <v-btn
        color="primary"
        @click="handleDownload"
        :disabled="!data || !data.length"
        >Descargar</v-btn
      >
      <v-btn
        color="primary"
        prepend-icon="mdi-close"
        elevation="3"
        @click="handleCerrarEdicion()"
        >Volver</v-btn
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
        item-value="ID"
        :items="data"
        :headers="listaHeaders"
        fixed-header
      >
        <template #item="{ item }">
          <tr class="pa-0 ma-0">
            <td class="text-center m-0 p-0">
              <TooltipButton
                :icono="'mdi-pencil'"
                :toolMsg="'Editar'"
                :funcion="handleModif"
                :itemid="item.ID ?? item.Id"
              ></TooltipButton>
              <TooltipButton
                :icono="'mdi-delete'"
                :toolMsg="'Eliminar'"
                :funcion="handleEliminar"
                :itemid="item.ID ?? item.Id"
              ></TooltipButton>
            </td>
            <td class="text-right m-0 p-0">{{ item.NROREPARTICION }}</td>
            <td class="text-right m-0 p-0">{{ item.NROBOLETA }}</td>
            <td class="text-right m-0 p-0">{{ item.NROAFILIADO }}</td>
            <td class="text-right m-0 p-0">{{ item.CODIGO }}</td>
            <td class="text-right m-0 p-0">{{ item.SUBCODIGO }}</td>
            <td class="text-right m-0 p-0">{{ item.CLASE }}</td>
            <td class="text-right m-0 p-0">{{ item.DIAS }}</td>
            <td class="text-center m-0 p-0">{{ getVto(item.VENCIMIENTO) }}</td>
            <td class="text-center m-0 p-0">{{ financial(item.IMPORTE) }}</td>
            <td class="text-right m-0 p-0">{{ item.DOCUMENTO }}</td>
            <td class="text-left">{{ item.APELLIDO }}</td>
            <td class="text-left">{{ item.NOMBRE }}</td>
            <td class="text-center m-0 p-0">{{ item.TIPOEMPLEOID }}</td>
            <td class="text-center m-0 p-0">{{ item.SITUACIONREVISTAID }}</td>
            <td class="text-center m-0 p-0">{{ item.TIPOOBRASOCIALID }}</td>
            <td class="text-center m-0 p-0">{{ item.PPP }}</td>
            <td class="text-center m-0 p-0">
              {{ getFechaDMY(item.FECHAGRABACION) }}
            </td>
          </tr>
        </template>
      </v-data-table>
    </div>
    <div v-else-if="error">No se puede obtener los datos solicitados.</div>
  </v-container>

  <v-dialog v-model="muestraRegistro" max-width="80%" persistent="">
    <NovHaberesVista
      v-if="muestraRegistro"
      :Registro="itemMostrar"
      :cerrar="cierraForm"
      :funcion="grabar"
      :hojaId="hojaEditar?.ID ?? hojaEditar?.Id ?? 0"
    ></NovHaberesVista>
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
