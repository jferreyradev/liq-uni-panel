<script setup>
import { ref, computed, watch } from "vue";
import { ConfirmacionDialog, TooltipButton } from "@/shared/components";
import { getFechaDMY, getTipoDescripcion } from "@/utils/formatos";
import CargaFamiliarVista from "./CargaFamiliarVista.vue";
import { utils, writeFileXLSX } from "xlsx";
import { agregaTitulosExcel } from "@/utils/reportes.js";
import CargaFamiliarCargos from "./CargaFamiliarCargos.vue";
import { useDataTable } from "@/composables/useDataTable";
import { useSpGrabar } from "@/composables/useSpGrabar";
import { usePII } from "@/composables/usePII";

const props = defineProps({
  setPersonaEdicion: { type: Function, required: true },
  personaEditar: { type: Object, default: null },
});

/** Datos personales: se enmascaran segun el rol del usuario. */
const { documento } = usePII();

/**
 * Persona en edicion.
 *
 * Antes se copiaba el prop a una constante (`const personaEditar = props.personaEditar`),
 * lo que congelaba el valor: al cambiar de persona sin remontar el
 * componente (navegacion entre rutas) la vista seguia mostrando y usando la
 * persona anterior.
 */
const personaEditar = computed(() => props.personaEditar);

// cerrar editar registros de Hoja
function handleCerrarEdicion() {
  props.setPersonaEdicion(null, 0);
}

const listaHeaders = [
  { title: "", key: "" },
  { title: "DNI", key: "DOCUMENTO" },
  { title: "Ape. y Nom.", key: "APELLIDOYOMBRE" },
  { title: "Relacion", key: "TIPORELACIONDESCRIPCION" },
  { title: "Fec. Nac.", key: "FECHANACIMIENTO" },
  { title: "Escolaridad", key: "TIPOESCOLARIDADDESCRIPCION" },
  { title: "Grado", key: "GRADO" },
  { title: "Discapacitado", key: "DISCAPACITADO" },
];

const personaId = computed(
  () =>
    props.personaEditar?.PERSONAID ||
    props.personaEditar?.ID ||
    props.personaEditar?.Id ||
    0,
);

// lectura de registros
const {
  data,
  isPending,
  lecturaOk,
  load: loadLista,
} = useDataTable({
  buildUrl: (pId) => `en/cargaFamiliar?PersonaId=${pId}&_t=${Date.now()}`,
});

// lectura de cargo asociado
const { data: cargoData, load: loadCargo } = useDataTable({
  buildUrl: (pId) => `en/cargo?PersonaId=${pId}&Salario=1&_t=${Date.now()}`,
});

const cargoAsociado = computed(() => {
  if (!personaId.value) {
    return { cargoId: 0, descripcion: "No hay cargo asociado aún para el salario" };
  }

  if (!cargoData.value) {
    return {
      cargoId: 0,
      descripcion: "No se pudieron establecer obtener datos del cargo",
    };
  }

  const cargo = cargoData.value[0];
  if (!cargo) {
    return { cargoId: 0, descripcion: "No hay cargo asociado aún para el salario" };
  }

  return {
    cargoId: cargo.ID || cargo.Id || 0,
    descripcion:
      "Rep.: " +
      (cargo.REPARTICIONID || "") +
      " - Orden: " +
      (cargo.ORDEN || "") +
      " - Tipo: " +
      getTipoDescripcion(cargo.TIPOEMPLEOID, cargo.TIPOEMPLEODESCRIPCION),
  };
});

// alerta de grabación o error
const mostrarAlert = ref(false);
const alertMensaje = ref(null);
const alertTipo = ref(null);

function mostrarMensaje(mensaje, tipo = "error") {
  alertMensaje.value = mensaje;
  alertTipo.value = tipo;
  mostrarAlert.value = true;
}

async function cargarDatos() {
  const pId = personaId.value;
  if (!pId) return;
  await Promise.allSettled([loadLista(pId), loadCargo(pId)]);
}

/**
 * Recarga los datos cuando cambia la persona en edicion.
 *
 * La pantalla se puede abrir con una persona y pasar a otra sin salir del
 * componente (por ejemplo, con la navegacion por rutas).
 */
watch(personaId, (nuevo, anterior) => {
  if (!nuevo) return;
  if (String(nuevo) === String(anterior)) return;
  cargarDatos();
});

/**
 * La grilla se dibuja siempre (aunque esté vacía); `data` es null cuando
 * la respuesta no trajo registros.
 */
const listaRegistros = computed(() => (Array.isArray(data.value) ? data.value : []));

// manejadores de altas, bajas y modificaciones
const itemMostrar = ref(null);

function handleModif(itemid) {
  mostrarAlert.value = false;
  let item = null;
  if (itemid != null && itemid !== 0 && Array.isArray(data.value)) {
    item = data.value.find((e) => e?.ID == itemid || e?.Id == itemid);
  }
  abrirModal(item);
}

//  confirmaciones
const itemEliminar = ref(0);
const muestraConfirmacion = ref(false);
const itemDesasociar = ref(0);
const muestraConfAsociar = ref(false);

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
const muestraRegistro = ref(false);
const muestraListaCargos = ref(false);

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
const { grabar: grabarSP } = useSpGrabar({
  urlIns: "sp/CargaFamIns",
  urlUpd: "sp/CargaFamUpd",
  refresh: () => cargarDatos(),
  onSuccess: (item, id) => {
    mostrarMensaje(
      id === 0
        ? "Familiar agregado correctamente"
        : "Familiar modificado correctamente",
      "success",
    );
  },
});

const { grabar: eliminarSP } = useSpGrabar({
  urlUpd: "sp/CargaFamDel",
  refresh: () => cargarDatos(),
  onSuccess: () => {
    mostrarMensaje("Se eliminó el registro", "success");
  },
});

const { grabar: grabarSPCargos } = useSpGrabar({
  urlIns: "sp/AsignaSalario",
  urlUpd: "sp/AsignaSalario",
  refresh: () => loadCargo(personaId.value),
  onSuccess: () => {
    mostrarMensaje("Se actualizó la asignación de cargo", "success");
  },
});

async function eliminar(id) {
  muestraConfirmacion.value = false;
  const mensaje = await eliminarSP({ vIDCARFAM: id }, 1);

  if (mensaje) {
    mostrarMensaje(mensaje, "error");
    return false;
  }

  return true;
}

async function desasociarCargo(idCargo) {
  muestraConfAsociar.value = false;
  const mensaje = await grabarSPCargos(
    {
      vIDCARGO: idCargo,
      vASIGNA: 0,
    },
    1,
  );

  if (mensaje !== null) {
    mostrarMensaje("No se pudo actualizar la asignación de cargo ", "error");
  }
}

// -------------------------------------------------
// funciones de exportación a archivo excel

function handleDownload() {
  exportFile();
}

function exportFile() {
  const map1 = listaRegistros.value.map((x) => {
    return [
      x.DOCUMENTO,
      x.APELLIDOYOMBRE,
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
  const doc = personaEditar.value?.DOCUMENTO || personaEditar.value?.DNI || "";
  const apeNom =
    personaEditar.value?.APELLIDO && personaEditar.value?.NOMBRE
      ? `${personaEditar.value.APELLIDO}, ${personaEditar.value.NOMBRE}`
      : personaEditar.value?.APELLIDOYOMBRE || "";
  const persId = personaEditar.value?.PERSONAID || personaEditar.value?.ID || "";

  const tituloReporte =
    "Cargas de Familia: " + doc + (apeNom ? " - " + apeNom : "");
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

cargarDatos();
</script>

<template>
  <v-container>
    <v-container>
      <v-row>
        <v-col cols="2"><div>Cargo Asociado:</div></v-col>
        <v-col cols="5"
          ><div>{{ cargoAsociado.descripcion }}</div></v-col
        >
        <v-col cols="5">
          <v-btn color="blue" :disabled="!data" @click="abrirModalCargos"
            >Asociar cargo</v-btn
          >
          <v-btn
            v-if="cargoAsociado.cargoId !== 0"
            color="teal"
            :disabled="!data"
            @click="handleDesasociar(cargoAsociado.cargoId)"
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
        <v-btn color="primary" :disabled="!data" @click="handleDownload"
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
    <div v-else-if="!lecturaOk">Sin datos para mostrar</div>
    <div v-else>
      <v-data-table
        class="text-caption"
        hover
        density="compact"
        :items="listaRegistros"
        :headers="listaHeaders"
        :loading="isPending"
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
            <td class="text-right m-0 p-0">{{ documento(item.DOCUMENTO) }}</td>
            <td class="text-left m-0 p-0">{{ item.APELLIDOYOMBRE }}</td>
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
  </v-container>

  <v-dialog v-model="muestraRegistro" max-width="80%" :persistent="true">
    <CargaFamiliarVista
      v-if="muestraRegistro"
      :Registro="itemMostrar"
      :cerrar="cierraForm"
      :funcion="grabarSP"
      :personaId="personaEditar?.PERSONAID || personaEditar?.ID || 0"
    ></CargaFamiliarVista>
  </v-dialog>

  <v-dialog v-model="muestraConfirmacion" max-width="80%" :persistent="true">
    <ConfirmacionDialog
      :titulo="'Eliminar registro'"
      :mensaje="'Seguro que desea eliminar el registro?'"
      :cerrar="cierraConfirmacion"
      :aceptar="eliminar"
      :parametro="itemEliminar"
    ></ConfirmacionDialog>
  </v-dialog>

  <v-dialog v-model="muestraConfAsociar" max-width="80%" :persistent="true">
    <ConfirmacionDialog
      :titulo="'Desasociar cargo'"
      :mensaje="'Seguro que desea desasociar el cargo de salario?'"
      :cerrar="cierraConfAsociar"
      :aceptar="desasociarCargo"
      :parametro="itemDesasociar"
    ></ConfirmacionDialog>
  </v-dialog>

  <v-dialog v-model="muestraListaCargos" max-width="80%" :persistent="true">
    <CargaFamiliarCargos
      v-if="muestraListaCargos"
      :cerrar="cierraFormCargos"
      :funcion="grabarSPCargos"
      :personaId="personaEditar?.PERSONAID || personaEditar?.ID || 0"
    ></CargaFamiliarCargos>
  </v-dialog>
</template>

<style scoped>
.sticky {
  position: sticky !important;
  left: 0 !important;
  min-width: 100px !important;
  z-index: 10 !important;
}
</style>
