<script setup>
import { ref } from "vue";
import { getVto, financial } from "@/utils/formatos";
import { leerDatos, ejecutarSP } from "@/shared/services/apiService";
import { resolveSpErrorCode, extractSpMessage, SP_OK } from "@/utils/spRespuesta";
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
  let [resView, resEntidad] = await Promise.all([
    leerDatos("view/conceptosLiq", { query: { idCargo: cargoId } }),
    leerDatos("conceptoLiq", { query: { CargoId: cargoId } }),
  ]);

  let datos = [];
  if (resView.operacionOk && Array.isArray(resView.datos) && resView.datos.length > 0) {
    datos = resView.datos;
  } else if (resEntidad.operacionOk && Array.isArray(resEntidad.datos)) {
    datos = resEntidad.datos;
  }

  const mapEntidad = new Map();
  if (resEntidad.operacionOk && Array.isArray(resEntidad.datos)) {
    for (const item of resEntidad.datos) {
      const k = `${item.CODIGO ?? item.Codigo}-${item.SUBCODIGO ?? item.SubCodigo ?? 0}`;
      mapEntidad.set(k, item);
    }
  }

  data.value = datos
    .map((c) => {
      const cod = Number(c.CODIGO ?? c.Codigo ?? 0);
      const sub = Number(c.SUBCODIGO ?? c.SubCodigo ?? 0);
      const key = `${cod}-${sub}`;
      const ent = mapEntidad.get(key) || {};
      return {
        ID: c.ID || c.Id || c.IDCONCEPTOLIQ || ent.ID || ent.Id || 0,
        CARGOID: c.IDCARGO || c.CARGOID || c.CargoId || cargoId,
        CODIGO: cod,
        SUBCODIGO: sub,
        PARAMETRO1: c.PARAM1 ?? c.PARAMETRO1 ?? ent.PARAMETRO1 ?? 0,
        PARAMETRO2: c.PARAM2 ?? c.PARAMETRO2 ?? ent.PARAMETRO2 ?? 0,
        IMPORTE: c.IMPORTE ?? ent.IMPORTE ?? 0,
        VENCIMIENTO: c.VTO || c.VENCIMIENTO || ent.VENCIMIENTO || null,
        PERIODO: c.PERIODO || ent.PERIODO || null,
        GRUPOADICIONALID: c.GRUPOADICIONALID ?? ent.GRUPOADICIONALID ?? 0,
        PENLEY: c.PENLEY ?? ent.PENLEY ?? 0,
      };
    })
    .sort((a, b) => {
      if (a.CODIGO !== b.CODIGO) return a.CODIGO - b.CODIGO;
      return a.SUBCODIGO - b.SUBCODIGO;
    });

  lecturaListaRegs.value = Boolean(resView.operacionOk || resEntidad.operacionOk);
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
  const isEdit = Boolean(id && id !== 0);
  let primarySp = isEdit ? "sp/ConceptoLiqUpd" : "sp/ConceptoLiqIns";
  let fallbackSp = isEdit ? "sp/conceptoliq_spuConceptoliq" : "sp/conceptoliq_spiConceptoliq";

  try {
    let res = await ejecutarSP(primarySp, item);
    if (!res.operacionOk) {
      const resFallback = await ejecutarSP(fallbackSp, item);
      if (
        resFallback.operacionOk ||
        (resFallback.valorError !== undefined && Number(resFallback.valorError) >= 0)
      ) {
        res = resFallback;
      }
    }

    const errCode = resolveSpErrorCode(res);
    const msgError = extractSpMessage(res, "");
    const tieneMensajeRechazo =
      Boolean(msgError) &&
      msgError.trim() !== "0" &&
      msgError.trim().toUpperCase() !== "OK";

    const esExito =
      res.operacionOk &&
      !tieneMensajeRechazo &&
      (errCode === SP_OK ||
        Number(res.valorError) === 0 ||
        (!isEdit && Number(res.valorError) > 0) ||
        res.out?.vError === 0 ||
        Number(res.out?.vError) === 0);

    if (esExito) {
      Promise.resolve(leerListaRegs()).catch((e) => {
        console.warn("Error al refrescar conceptos de cargo:", e);
      });
      alertMensaje.value = "Se grabó el concepto de liquidación";
      alertTipo.value = "success";
      mostrarAlert.value = true;
      return null;
    }
    return extractSpMessage(res, "No se pudo grabar el concepto de liquidación");
  } catch (err) {
    console.error("Error en grabarSP Conceptos:", err);
    return err.message || "Error al grabar concepto";
  }
}

async function eliminar(id) {
  muestraConfirmacion.value = false;
  let item = {
    vIDCONCEPTOLIQ: Number(id),
  };
  let url = "sp/conceptoliq_spdConceptoliq";

  try {
    let res = await ejecutarSP(url, item);
    if (!res.operacionOk && res.estado === 404) {
      res = await ejecutarSP("sp/ConceptoLiqDel", item);
    }
    const errCode = resolveSpErrorCode(res);
    const esExito = res.operacionOk && (errCode === SP_OK || Number(res.valorError) === 0);

    if (esExito) {
      await leerListaRegs();
      alertMensaje.value = "Se eliminó el concepto de liquidación";
      alertTipo.value = "success";
      mostrarAlert.value = true;
      return true;
    }
    alertMensaje.value = extractSpMessage(res, "No se pudo eliminar el concepto de liquidación");
    alertTipo.value = "error";
    mostrarAlert.value = true;
    return false;
  } catch (err) {
    console.error("Error en eliminar Conceptos:", err);
    alertMensaje.value = err.message || "Error al eliminar concepto";
    alertTipo.value = "error";
    mostrarAlert.value = true;
    return false;
  }
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
