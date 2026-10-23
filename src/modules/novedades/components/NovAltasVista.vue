<script setup>
import { ref, computed } from "vue";
import {
  getVto,
  getVtoActual,
  getFechaToAPIFromMMYYYY,
} from "@/utils/formatos";
import { rules } from "@/utils/reglasValidacion";
import { sexos, getObjetList } from "@/utils/tipos";

const props = defineProps(["Registro", "cerrar", "funcion", "hojaId", "hojaPeriodo"]);
let registroOrigen = props.Registro;
let hojaId = props.hojaId;
let registroActual = ref({});

const form = ref(null);
const formOK = ref(false);

const vencimiento = ref(getVtoActual());
const periodoInicial = computed(() => {
  if (registroOrigen?.PERIODO) return getVto(registroOrigen.PERIODO);
  if (props.hojaPeriodo) return getVto(props.hojaPeriodo);
  return getVtoActual();
});
const periodo = ref(periodoInicial.value);

const sexoSelected = ref(sexos[0]);

const registroVacio = ref({
  IDREP: 470,
  ORDEN: 0,
  AFILIADO: 0,
  DNI: 0,
  CUIL: 0,
  APELLIDO: "",
  NOMBRE: "",
  SEXO: "",
  TE: 0,
  CC: 0,
  CAT: 0,
  ANTIG: 0,
  VTO: vencimiento,
  TITULO: 0,
  DIFCAT: 0,
  AJUB: false,
  PERIODO: periodo,
  FECHAGRABACION: null,
  ESTADOREGISTRO: 1,
  HOJAID: hojaId,
  ID: 0,
});

if (registroOrigen) {
  registroActual.value = { ...registroOrigen };
  registroActual.value.AJUB = registroOrigen.APJUB == 1;
  vencimiento.value = getVto(registroOrigen.VTO);
  periodo.value = periodoInicial.value;
  sexoSelected.value = getObjetList(sexos, registroOrigen.SEXO);
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
    if (String(vencimiento.value).trim().length > 0)
      vto = getFechaToAPIFromMMYYYY(vencimiento.value) || null;
  }

  const sexoVal =
    typeof sexoSelected.value === "object" && sexoSelected.value !== null
      ? sexoSelected.value.value
      : sexoSelected.value;

  let registroGrabar = {
    vREP: registroActual.value.IDREP,
    vORD: registroActual.value.ORDEN,
    vAFI: registroActual.value.AFILIADO,
    vDNI: registroActual.value.DNI,
    vCUIL: registroActual.value.CUIL,
    vAPE: registroActual.value.APELLIDO,
    vNOM: registroActual.value.NOMBRE,
    vSEXO: sexoVal,
    vTE: registroActual.value.TE,
    vCC: registroActual.value.CC,
    vCAT: registroActual.value.CAT,
    vANTIG: registroActual.value.ANTIG,
    vVTO: vto,
    vTITULO: registroActual.value.TITULO,
    vDIF_CAT: registroActual.value.DIFCAT,
    vAJUB: registroActual.value.AJUB ? 1 : 0,
    vPERIODO: getFechaToAPIFromMMYYYY(periodo.value),
  };
  if (registroActual.value.ID && registroActual.value.ID !== 0) {
    registroGrabar = {
      vIDNOV: registroActual.value.ID,
      ...registroGrabar,
    };
  } else {
    registroGrabar = {
      ...registroGrabar,
      vIDHOJANOV: hojaId,
    };
  }
  console.log("NovAltas registro a grabar:", registroGrabar);
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
    console.error("Error en grabaRegistro NovAltas:", err);
    mensajeError.value = err.message || "Error al grabar novedad";
    mostrarAlert.value = true;
  } finally {
    isSaving.value = false;
  }
}

function validarRegistro() {
  return true;
}
</script>

<template>
  <v-container>
    <v-card :loading="isSaving">
      <v-progress-linear v-if="isSaving" indeterminate color="primary"></v-progress-linear>
      <v-form ref="form" v-model="formOK">
        <v-card-title>Novedades de Altas</v-card-title>
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
          <v-container style="height: 60vh; overflow-y: scroll">
            <v-row>
              <v-col cols="4">
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
              <v-col cols="4">
                <v-text-field
                  v-model="registroActual.ORDEN"
                  hide-details="auto"
                  label="Nro. Boleta"
                  lazy-validation
                  :rules="[
                    ...rules.number,
                    (val) => rules.longitudEntre(val, 1, 7),
                  ]"
                ></v-text-field>
              </v-col>
              <v-col cols="4">
                <v-text-field
                  v-model="registroActual.AFILIADO"
                  hide-details="auto"
                  label="Afiliado"
                  lazy-validation
                  :rules="[
                    ...rules.number,
                    (val) => rules.longitudEntre(val, 1, 7),
                  ]"
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="registroActual.APELLIDO"
                  hide-details="auto"
                  label="Apellido"
                  lazy-validation
                  :rules="[(val) => rules.longitudEntre(val, 3, 100)]"
                ></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="registroActual.NOMBRE"
                  hide-details="auto"
                  label="Nombre"
                  lazy-validation
                  :rules="[(val) => rules.longitudEntre(val, 3, 100)]"
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="registroActual.DNI"
                  hide-details="auto"
                  label="DNI"
                  lazy-validation
                  :rules="[
                    ...rules.number,
                    (val) => rules.longitudEntre(val, 1, 9),
                  ]"
                ></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="registroActual.CUIL"
                  hide-details="auto"
                  label="CUIL"
                  lazy-validation
                  :rules="[
                    ...rules.number,
                    (val) => rules.longitudEntre(val, 11, 11),
                  ]"
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="3">
                <v-select
                  v-model="sexoSelected"
                  label="Sexo"
                  :items="sexos"
                  item-title="name"
                  item-value="value"
                  return-object
                >
                </v-select>
              </v-col>
              <v-col cols="3">
                <v-text-field
                  v-model="registroActual.TE"
                  hide-details="auto"
                  label="Tipo Emp."
                  lazy-validation
                  :rules="[
                    ...rules.number,
                    (val) => rules.longitudEntre(val, 1, 2),
                  ]"
                ></v-text-field>
              </v-col>
              <v-col cols="3">
                <v-text-field
                  v-model="registroActual.CC"
                  hide-details="auto"
                  label="Sit. Rev."
                  lazy-validation
                  :rules="[
                    ...rules.number,
                    (val) => rules.longitudEntre(val, 1, 2),
                  ]"
                ></v-text-field>
              </v-col>
              <v-col cols="3">
                <v-text-field
                  v-model="registroActual.CAT"
                  hide-details="auto"
                  label="categoría"
                  lazy-validation
                  :rules="[
                    ...rules.number,
                    (val) => rules.longitudEntre(val, 1, 2),
                  ]"
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="4">
                <v-text-field
                  v-model="registroActual.ANTIG"
                  hide-details="auto"
                  label="Antig."
                  lazy-validation
                  :rules="[
                    ...rules.number,
                    (val) => rules.longitudEntre(val, 1, 2),
                  ]"
                ></v-text-field>
              </v-col>
              <v-col cols="4">
                <v-text-field
                  v-model="vencimiento"
                  hide-details="auto"
                  label="Vencimiento"
                  :rules="rules.mmyyyy"
                >
                </v-text-field>
              </v-col>
              <v-col cols="4">
                <v-text-field
                  v-model="registroActual.TITULO"
                  hide-details="auto"
                  label="Título"
                  lazy-validation
                  :rules="[
                    ...rules.number,
                    (val) => rules.longitudEntre(val, 1, 3),
                  ]"
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="4">
                <v-text-field
                  v-model="registroActual.DIFCAT"
                  hide-details="auto"
                  label="Dif. Cat."
                  lazy-validation
                  :rules="[
                    ...rules.number,
                    (val) => rules.longitudEntre(val, 1, 2),
                  ]"
                ></v-text-field>
              </v-col>
              <v-col cols="4">
                <v-checkbox
                  v-model="registroActual.AJUB"
                  color="primary"
                  label="Ap. Jub"
                  hide-details
                ></v-checkbox>
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
