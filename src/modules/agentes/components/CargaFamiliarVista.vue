<script setup>
import { ref, watch } from "vue";
import { getFechaToAPIFromDDMMYYYY, getFechaDMY } from "@/utils/formatos";
import { rules } from "@/utils/reglasValidacion";
import {
  tipoEscolaridad,
  tipoRelacionFamiliar,
  getObjetList,
} from "@/utils/tipos";

const props = defineProps(["Registro", "cerrar", "funcion", "personaId"]);
let personaId = props.personaId;
let registroActual = ref({});

const form = ref(null);
const formOK = ref(false);

const fechaNacimiento = ref(null);

const escolaridadSelected = ref(tipoEscolaridad[0]);
const relacionFamiliarSelected = ref(tipoRelacionFamiliar[0]);

const isSaving = ref(false);

const registroVacio = ref({
  DOCUMENTO: "",
  APELLIDOYNOMBRE: "",
  FECHANACIMIENTO: "",
  GRADO: 0,
  DISCAPACITADO: false,
  PERSONAID: personaId,
  ID: 0,
});

function cargarRegistro(reg) {
  const pId = props.personaId || personaId;
  if (reg && (reg.ID !== undefined || reg.Id !== undefined || reg.DOCUMENTO)) {
    registroActual.value = { ...reg };
    registroActual.value.ID = reg.ID ?? reg.Id ?? 0;
    registroActual.value.PERSONAID = reg.PERSONAID || pId;
    registroActual.value.DISCAPACITADO = reg.DISCAPACITADO == 1;
    fechaNacimiento.value = getFechaDMY(registroActual.value.FECHANACIMIENTO);
    escolaridadSelected.value = getObjetList(
      tipoEscolaridad,
      reg.TIPOESCOLARIDADID,
    );
    relacionFamiliarSelected.value = getObjetList(
      tipoRelacionFamiliar,
      reg.TIPORELACIONID,
    );
  } else {
    registroActual.value = { ...registroVacio.value, PERSONAID: pId };
    fechaNacimiento.value = null;
    escolaridadSelected.value = tipoEscolaridad[0];
    relacionFamiliarSelected.value = tipoRelacionFamiliar[0];
  }
}

watch(
  () => props.Registro,
  (newVal) => {
    cargarRegistro(newVal);
  },
  { immediate: true },
);

const mostrarAlert = ref(false);

let mensajeError = ref("");

async function grabaRegistro() {
  const isValid = await form.value.validate();
  const valid = typeof isValid === "object" && isValid !== null ? isValid.valid : isValid;

  if (!valid || formOK.value === false) {
    return;
  }
  mostrarAlert.value = false;
  if (!validarRegistro()) {
    mostrarAlert.value = true;
    return;
  }

  isSaving.value = true;

  try {
    const idRel =
      typeof relacionFamiliarSelected.value === "object" && relacionFamiliarSelected.value !== null
        ? relacionFamiliarSelected.value.value
        : relacionFamiliarSelected.value;

    const idEsc =
      typeof escolaridadSelected.value === "object" && escolaridadSelected.value !== null
        ? escolaridadSelected.value.value
        : escolaridadSelected.value;

    // si es esposa/o coloca valores predeterminados en campos de hijo
    if (idRel == 1) {
      escolaridadSelected.value = tipoEscolaridad[0];
      fechaNacimiento.value = null;
      registroActual.value.GRADO = 0;
      registroActual.value.DISCAPACITADO = false;
    }

    let fecNacimiento = "";
    if (fechaNacimiento.value !== null && fechaNacimiento.value !== undefined) {
      if (String(fechaNacimiento.value).trim().length > 0) {
        fecNacimiento = getFechaToAPIFromDDMMYYYY(fechaNacimiento.value);
      }
    }

    let registroGrabar = {
      vIDPERS: registroActual.value.PERSONAID || personaId,
      vDNI: registroActual.value.DOCUMENTO,
      vAPEYNOM: registroActual.value.APELLIDOYNOMBRE,
      vIDTABTIPOREL: idRel,
      vFECHANAC: fecNacimiento,
      vIDTABTIPOESC: idRel == 2 ? idEsc : 0,
      vGRADO: idRel == 2 ? (registroActual.value.GRADO || 0) : 0,
      vDISCAPACITADO: idRel == 2 ? (registroActual.value.DISCAPACITADO ? 1 : 0) : 0,
    };
    const regId = registroActual.value.ID ?? registroActual.value.Id ?? 0;
    if (regId && regId !== 0) {
      registroGrabar = {
        vIDCARFAM: regId,
        ...registroGrabar,
      };
    }

    let resultado = await props.funcion(registroGrabar, regId);

    if (resultado === null) {
      props.cerrar();
    } else {
      mensajeError.value = resultado;
      mostrarAlert.value = true;
    }
  } catch (err) {
    console.error("Error al grabar carga familiar:", err);
    mensajeError.value = err.message || "Error al grabar";
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
        <v-card-title>Carga Familiar</v-card-title>
        <v-card-subtitle>
          {{ (registroActual?.ID ?? registroActual?.Id ?? 0) == 0 ? "Agregar " : "Modificar" }}
        </v-card-subtitle>
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
                  v-model="registroActual.DOCUMENTO"
                  hide-details="auto"
                  label="DNI"
                  :rules="[
                    ...rules.number,
                    (val) => rules.longitudEntre(val, 7, 9),
                  ]"
                ></v-text-field>
              </v-col>
              <v-col cols="8">
                <v-text-field
                  v-model="registroActual.APELLIDOYNOMBRE"
                  hide-details="auto"
                  label="Apellido y Nombre"
                  lazy-validation
                  :rules="[(val) => rules.longitudEntre(val, 3, 100)]"
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="6">
                <v-select
                  v-model="relacionFamiliarSelected"
                  label="Relación"
                  :items="tipoRelacionFamiliar"
                  item-title="name"
                  item-value="value"
                  return-object
                >
                </v-select>
              </v-col>
            </v-row>
            <v-row v-if="relacionFamiliarSelected && (relacionFamiliarSelected.value == 2 || relacionFamiliarSelected == 2)">
              <v-col cols="6">
                <v-select
                  v-model="escolaridadSelected"
                  label="Escolaridad"
                  :items="tipoEscolaridad"
                  item-title="name"
                  item-value="value"
                  return-object
                >
                </v-select>
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="fechaNacimiento"
                  hide-details="auto"
                  label="Fec. Nac."
                  lazy-validation
                  :rules="[
                    ...rules.ddmmyyyy,
                    (val) =>
                      relacionFamiliarSelected && (relacionFamiliarSelected.value == 2 || relacionFamiliarSelected == 2)
                        ? rules.longitudEntre(val, 8, 10)
                        : true,
                  ]"
                ></v-text-field>
              </v-col>
            </v-row>
            <v-row v-if="relacionFamiliarSelected && (relacionFamiliarSelected.value == 2 || relacionFamiliarSelected == 2)">
              <v-col cols="6">
                <v-text-field
                  v-model="registroActual.GRADO"
                  hide-details="auto"
                  label="Grado"
                  lazy-validation
                  :rules="[
                    ...rules.number,
                    (val) => rules.longitudEntreONull(val, 1, 2),
                  ]"
                ></v-text-field>
              </v-col>

              <v-col cols="4">
                <v-checkbox
                  v-model="registroActual.DISCAPACITADO"
                  color="primary"
                  label="Discapacitado"
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
