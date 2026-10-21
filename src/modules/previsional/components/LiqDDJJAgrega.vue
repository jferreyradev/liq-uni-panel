<script setup>
import { ref } from "vue";
import { getFechaToAPIFromMMYYYY } from "@/utils/formatos";
import { rules } from "@/utils/reglasValidacion";
import { tipoLiq } from "@/utils/tipos";

const props = defineProps(["periodoActivo", "funcion", "cerrar"]);

const form = ref(null);
const formOK = ref(false);

const periodoLiq = ref(null);
const grupoAdi = ref(0);
const liqSelected = ref(tipoLiq[0]);

const mostrarAlert = ref(false);
let mensajeError = ref("");
const isSaving = ref(false);

async function grabaRegistro() {
  const isValid = await form.value.validate();
  const valid = typeof isValid === "object" && isValid !== null ? isValid.valid : isValid;

  if (!valid || formOK.value === false) {
    return;
  }
  mostrarAlert.value = false;

  const tipoLiqId =
    typeof liqSelected.value === "object" && liqSelected.value !== null
      ? liqSelected.value.value
      : liqSelected.value;

  let registroGrabar = {
    PERIODODDJJ: getFechaToAPIFromMMYYYY(props.periodoActivo),
    TIPOLIQUIDACIONID: tipoLiqId,
    GRUPOADICIONALID: grupoAdi.value ? 1 : 0,
    REPARTICIONID: -1,
    PERIODOLIQ: getFechaToAPIFromMMYYYY(periodoLiq.value),
  };

  isSaving.value = true;
  try {
    let resultadoGrabacion = await props.funcion(registroGrabar, null);
    if (resultadoGrabacion == "OK") {
      props.cerrar();
    } else {
      mensajeError.value = resultadoGrabacion || "No se pudo grabar la liquidación";
      mostrarAlert.value = true;
    }
  } catch (err) {
    console.error("Error en grabaRegistro LiqDDJJ:", err);
    mensajeError.value = err.message || "Error al grabar la liquidación";
    mostrarAlert.value = true;
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <v-container>
    <v-card :loading="isSaving">
      <v-progress-linear v-if="isSaving" indeterminate color="primary"></v-progress-linear>
      <v-form ref="form" v-model="formOK">
        <v-card-title>Liquidaciones de DDJJ</v-card-title>
        <v-card-subtitle>Agregar Liquidacion</v-card-subtitle>
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
              <v-select
                v-model="liqSelected"
                label="Tipo Liq"
                :items="tipoLiq"
                item-title="name"
                item-value="value"
                return-object
              >
              </v-select>
            </v-row>
            <v-row>
              <v-text-field
                v-model="periodoLiq"
                hide-details="auto"
                label="Período Liq."
                :rules="rules.mmyyyy"
              >
              </v-text-field>
            </v-row>
            <v-row>
              <v-text-field
                v-model="grupoAdi"
                hide-details="auto"
                label="GrupoAdicional"
                :rules="[
                  ...rules.number,
                  (val) => rules.longitudEntre(val, 1, 2),
                ]"
              ></v-text-field>
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
