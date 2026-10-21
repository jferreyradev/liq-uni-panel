<script setup>
import { ref } from "vue";
import { getVto, financial } from "@/utils/formatos";
import { leerDatos, ejecutarSP } from "./llamadaAPI";
import { ConfirmacionDialog, TooltipButton } from "@/shared/components";
import CargosConceptosVista from "./CargosConceptosVista.vue";

const props = defineProps(["cerrar", "cargoId"]);
let cargoId = props.cargoId;

const listaHeaders = [
  { title: "", key: "" },
  { title: "Código", key: "CODIGO", align: "center" },
  { title: "Sub. Cód.", key: "SUBCODIGO", align: "center" },
  { title: "Param. 1", key: "PARAMETRO1", align: "center" },
  { title: "Param. 2", key: "PARAMETRO2", align: "center" },
  { title: "Vto.", key: "VENCIMIENTO", align: "center" },
  { title: "Importe", key: "IMPORTE", align: "center" },
  { title: "Período", key: "PERIODO", align: "center" },
  { title: "Grupo Adic.", key: "GRUPOADICIONALID", align: "center" },
  { title: "Es Ley", key: "PENLEY", align: "center" },
];

// lectura de registros
let isPending = ref(false);
const data = ref(null);
const lecturaListaRegs = ref(true);

async function leerListaRegs() {
  isPending.value = true;
  //const { datos, operacionOk } = await leerDatos('view/novAltas?HojaId=' + hojaEditar.ID)
  let url =
    "en/conceptoLiq?CargoId=" +
    cargoId +
    '&sort={"codigo":"asc","subcod":"asc", "vencimiento":"asc"}';
  const { datos, operacionOk } = await leerDatos(url);
  data.value = datos;
  lecturaListaRegs.value = operacionOk;
  isPending.value = false;
}

//---------------- formularios modales de abm

// alerta de grabación o error
const mostrarAlert = ref(false);
const alertMensaje = ref(null);
const alertTipo = ref(null);

// manejadores de altas, bajas y modificaciones

const itemMostrar = ref({
  cargoId: 0,
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
async function grabarSP(item, id) {
  let url = "";
  if (id == 0) {
    url = "sp/ConceptoLiqIns";
  } else {
    url = "sp/ConceptoLiqUpd";
  }
  //console.log(url, item)

  try {
    const { operacionOk, valorError, valorSalida, errorMsg, datos, out } = await ejecutarSP(url, item);
    const errCode = valorError !== undefined && valorError !== -1
      ? valorError
      : (out?.vError ?? datos?.out?.vError ?? (operacionOk ? 0 : -1));

    if (operacionOk && errCode == 0) {
      Promise.resolve(leerListaRegs()).catch((e) => {
        console.warn("Error al refrescar conceptos de cargo:", e);
      });
      alertMensaje.value = "Se grabó el concepto de liquidación";
      alertTipo.value = "success";
      mostrarAlert.value = true;
      return null;
    }
    return errorMsg || out?.vErrorMsg || "No se pudo grabar el concepto de liquidación";
  } catch (err) {
    console.error("Error en grabarSP Conceptos:", err);
    return err.message || "Error al grabar concepto";
  }
}

async function eliminar(id) {
  muestraConfirmacion.value = false;
  let item = {
    vIDCONCEPTOLIQ: id,
  };
  let url = "sp/ConceptoLiqDel";

  const { valorError } = await ejecutarSP(url, item);
  if (valorError == 0) {
    await leerListaRegs();
    alertMensaje.value = "Se eliminó el concepto de liquidación";
    alertTipo.value = "success";
    mostrarAlert.value = true;
    return true;
  }
  return false;
}

//--------------------------------------------

leerListaRegs();
</script>

<template>
  <v-card>
    <v-card-title>Conceptos de Liquidación del cargo</v-card-title>
    <v-card-subtitle>
      Visualiza los conceptos a liquidar en el cargo
    </v-card-subtitle>
    <v-card-text>
      <v-row>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          elevation="3"
          @click="handleModif(null)"
          >Agregar concepto</v-btn
        >
      </v-row>
      <v-container>
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
            <template v-slot:item="{ item }">
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
                <td class="text-right m-0 p-0">{{ item.CODIGO }}</td>
                <td class="text-right m-0 p-0">{{ item.SUBCODIGO }}</td>
                <td class="text-right m-0 p-0">{{ item.PARAMETRO1 }}</td>
                <td class="text-right m-0 p-0">{{ item.PARAMETRO2 }}</td>
                <td class="text-center m-0 p-0">
                  {{ getVto(item.VENCIMIENTO) }}
                </td>
                <td class="text-right m-0 p-0">
                  {{ financial(item.IMPORTE) }}
                </td>
                <td class="text-center m-0 p-0">{{ getVto(item.PERIODO) }}</td>
                <td class="text-center m-0 p-0">{{ item.GRUPOADICIONALID }}</td>
                <td class="text-center m-0 p-0">
                  {{ item.PENLEY === 1 ? "SI" : "NO" }}
                </td>
              </tr>
            </template>
          </v-data-table>
          <v-dialog v-model="muestraConfirmacion" max-width="80%" persistent="">
            <ConfirmacionDialog
              :titulo="'Eliminar registro'"
              :mensaje="'Seguro que desea eliminar el registro?'"
              :cerrar="cierraConfirmacion"
              :aceptar="eliminar"
              :parametro="itemEliminar"
            ></ConfirmacionDialog>
          </v-dialog>
          <v-dialog v-model="muestraRegistro" max-width="80%" persistent="">
            <CargosConceptosVista
              v-if="muestraRegistro"
              :Registro="itemMostrar"
              :cerrar="cierraForm"
              :funcion="grabarSP"
              :cargoId="cargoId"
            ></CargosConceptosVista>
          </v-dialog>
        </div>
        <div v-else-if="error">No se puede obtener los datos solicitados.</div>
      </v-container>
    </v-card-text>
    <v-card-actions class="d-flex justify-end">
      <v-btn color="error" elevation="3" outlined @click="cerrar()"
        >Cancelar</v-btn
      >
    </v-card-actions>
  </v-card>
</template>
