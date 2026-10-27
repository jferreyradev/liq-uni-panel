<script setup>
import { ref, computed } from "vue";
import {
  getVto,
  getVtoActual,
  getFechaToAPIFromMMYYYY,
  getDecimalToAPI,
  financial,
} from "@/utils/formatos";
import { rules } from "@/utils/reglasValidacion";

const props = defineProps(["Registro", "cerrar", "funcion", "hojaId", "hojaPeriodo"]);
let registroOrigen = props.Registro;
let hojaId = props.hojaId;
let registroActual = ref({});

const form = ref(null);
const formOK = ref(false);

const vencimiento = ref(null);
const periodoInicial = computed(() => {
  if (registroOrigen?.PERIODO) return getVto(registroOrigen.PERIODO);
  if (props.hojaPeriodo) return getVto(props.hojaPeriodo);
  return getVtoActual();
});
const periodo = ref(periodoInicial.value);

const registroVacio = ref({
  IDREP: 470,
  ORDEN: null,
  CODIGO: 0,
  SUBCODIGO: 0,
  PARAM1: 0,
  PARAM2: 0,
  VENCIMIENTO: vencimiento,
  IMPORTE: null,
  PERIODO: periodo,
  FECHAGRABACION: null,
  ESTADOREGISTRO: 0,
  HOJAID: hojaId,
  ID: 0,
});

if (registroOrigen) {
  registroActual.value = { ...registroOrigen };
  vencimiento.value = getVto(registroOrigen.VENCIMIENTO);
  periodo.value = periodoInicial.value;
  registroActual.value.IMPORTE = financial(registroOrigen.IMPORTE);
} else {
  registroActual.value = registroVacio.value;
}

const mostrarAlert = ref(false);

let mensajeError = ref("");
const isSaving = ref(false);

async function grabaRegistro() {
  const validation = await form.value.validate();
  const valid = typeof validation === "object" && validation !== null ? validation.valid : validation;

  if (!valid) {
    return;
  }
  mostrarAlert.value = false;
  if (!validarRegistro()) {
    mostrarAlert.value = true;
    return;
  }

  let vto = null;
  if (vencimiento.value != null && vencimiento.value !== undefined) {
    if (String(vencimiento.value).trim().length > 0) {
      vto = getFechaToAPIFromMMYYYY(vencimiento.value) || null;
    }
  }
  let registroGrabar = {
    vIDREP: Number(registroActual.value.IDREP) || 0,
    vORDEN: Number(registroActual.value.ORDEN) || 0,
    vCOD: Number(registroActual.value.CODIGO) || 0,
    vSUBCOD: Number(registroActual.value.SUBCODIGO) || 0,
    vP1:
      registroActual.value.PARAM1 !== null &&
      registroActual.value.PARAM1 !== undefined
        ? String(registroActual.value.PARAM1)
        : "0",
    vP2: Number(registroActual.value.PARAM2) || 0,
    vVTO: vto,
    vIMP: getDecimalToAPI(registroActual.value.IMPORTE),
    vIDHOJANOV: Number(hojaId) || 0,
    vPERIODO: getFechaToAPIFromMMYYYY(periodo.value),
  };
  if (registroActual.value.ID && registroActual.value.ID !== 0) {
    registroGrabar = {
      vIDNOV: registroActual.value.ID,
      ...registroGrabar,
      vIDESTADOREG: registroActual.value.ESTADOREGISTRO,
      vFECHAGRAB: registroActual.value.FECHAGRABACION,
    };
  }

  console.log("NovVarias registro a grabar:", registroGrabar);
  isSaving.value = true;
  try {
    let resultado = await props.funcion(registroGrabar, registroActual.value.ID || 0);

    const ok = typeof resultado === "boolean" ? resultado : resultado?.ok ?? (resultado === null);
    if (ok) {
      props.cerrar();
    } else {
      const err = typeof resultado === "string" ? resultado : resultado?.mensaje;
      mensajeError.value = err || "No se pudieron grabar los datos";
      mostrarAlert.value = true;
    }
  } catch (err) {
    console.error("Error en grabaRegistro NovVarias:", err);
    mensajeError.value = err.message || "Error al grabar novedad";
    mostrarAlert.value = true;
  } finally {
    isSaving.value = false;
  }
}

/**
 * Guarda de validación previa al grabado.
 *
 * La llamada ya existía pero la función se había perdido (ReferenceError al
 * guardar). Se restablece con el mismo criterio que las otras vistas de
 * novedades y agentes, que hoy delegan la validación en el v-form.
 */
function validarRegistro() {
  return true;
}
</script>

<template>
  <v-container>
    <v-card :loading="isSaving">
      <v-progress-linear v-if="isSaving" indeterminate color="primary"></v-progress-linear>
      <v-form ref="form" v-model="formOK">
        <v-card-title>Novedades Varias</v-card-title>
        <v-card-subtitle>Agregar en Hoja Nº {{ hojaId }}</v-card-subtitle>
        <v-alert
          v-model="mostrarAlert"
          border="start"
          close-label="Close Alert"
          color="error"
          icon="$error"
          closable
        >
          {{ mensajeError }}
        </v-alert>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="2">
                <v-text-field
                  v-model="registroActual.IDREP"
                  hide-details="auto"
                  label="Repartición"
                  :rules="[
                    ...rules.number,
                    (val) => rules.longitudEntre(val, 1, 7),
                  ]"
                ></v-text-field>
              </v-col>
              <v-col cols="3">
                <v-text-field
                  v-model="registroActual.ORDEN"
                  hide-details="auto"
                  label="Nro. Boleta"
                  lazy-validation
                  :rules="[
                    (val) => (val !== null && val !== undefined && val !== '' && Number(val) > 0) || 'Nro. de boleta requerido',
                    ...rules.number,
                    (val) => rules.longitudEntre(val, 1, 7),
                  ]"
                ></v-text-field>
              </v-col>
              <v-col cols="2">
                <v-text-field
                  v-model="registroActual.CODIGO"
                  hide-details="auto"
                  label="Código"
                  :rules="[
                    (val) => (val !== null && val !== undefined && val !== '' && Number(val) >= 0) || 'Código requerido',
                    ...rules.number,
                    (val) => rules.longitudEntre(val, 1, 4),
                  ]"
                ></v-text-field>
              </v-col>
              <v-col cols="2">
                <v-text-field
                  v-model="registroActual.SUBCODIGO"
                  hide-details="auto"
                  label="Sub. Cód."
                  :rules="[
                    ...rules.number,
                    (val) => rules.longitudEntre(val, 1, 3),
                  ]"
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="3">
                <v-text-field
                  v-model="registroActual.PARAM1"
                  hide-details="auto"
                  label="P1"
                  :rules="[
                    ...rules.number,
                    (val) => rules.longitudEntre(val, 1, 3),
                  ]"
                ></v-text-field>
              </v-col>
              <v-col cols="3">
                <v-text-field
                  v-model="registroActual.PARAM2"
                  hide-details="auto"
                  label="P2"
                  :rules="[
                    ...rules.number,
                    (val) => rules.longitudEntre(val, 1, 2),
                    (val) => rules.rango(val, 0, 99),
                  ]"
                ></v-text-field>
              </v-col>
              <v-col cols="3">
                <v-text-field
                  v-model="vencimiento"
                  hide-details="auto"
                  label="Vencimiento"
                  :rules="rules.mmyyyy"
                >
                </v-text-field>
              </v-col>
              <v-col cols="3">
                <v-text-field
                  v-model="registroActual.IMPORTE"
                  hide-details="auto"
                  label="Importe"
                  :rules="[
                    ...rules.numDecimal,
                    (val) => rules.longitudMin(val, 1),
                  ]"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions class="d-flex justify-end">
          <v-btn
            color="primary"
            elevation="3"
            outlined
            value="grabar"
            :loading="isSaving"
            :disabled="isSaving"
            @click="grabaRegistro()"
            >Grabar</v-btn
          >
          <v-btn
            color="error"
            elevation="3"
            outlined
            :disabled="isSaving"
            @click="cerrar()"
            >Cancelar</v-btn
          >
        </v-card-actions>
      </v-form>
    </v-card>
  </v-container>
</template>
