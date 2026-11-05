<script setup>
import { ref, watch } from "vue";
import { getFechaToAPIFromDDMMYYYY, getFechaDMY } from "@/utils/formatos";
import { rules } from "@/utils/reglasValidacion";
import { ejecutarSP } from "@/shared/services/apiService";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  cargo: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["update:modelValue", "baja-confirmada"]);

const form = ref(null);
const formValido = ref(false);
const fechaBaja = ref("");
const isSubmitting = ref(false);
const errorMessage = ref("");

function getFechaHoyDMY() {
  const d = new Date();
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = d.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) {
      fechaBaja.value = props.cargo?.FECHABAJA
        ? getFechaDMY(props.cargo.FECHABAJA)
        : getFechaHoyDMY();
      errorMessage.value = "";
    }
  },
  { immediate: true }
);

function cerrar() {
  emit("update:modelValue", false);
}

async function confirmarBaja() {
  if (form.value) {
    const res = await form.value.validate();
    const valid = typeof res === "object" && res !== null ? res.valid : res;
    if (!valid) return;
  }

  isSubmitting.value = true;
  errorMessage.value = "";

  const fecBajaApi = getFechaToAPIFromDDMMYYYY(fechaBaja.value);
  const cargoId = props.cargo.ID || props.cargo.Id || 0;

  const payload = {
    vIDCARGO: cargoId,
    vIDREP: props.cargo.REPARTICIONID,
    vORDEN: props.cargo.ORDEN,
    vAFILIADO: props.cargo.AFILIADO,
    vANTIG: props.cargo.ANTIGUEDAD,
    vIDTE: props.cargo.TIPOEMPLEOID,
    vIDSITREV: props.cargo.SITUACIONREVISTAID,
    vIDTIPOOS: props.cargo.TIPOOBRASOCIALID,
    vCATEGORIA: props.cargo.CATEGORIA,
    vIDTIPOLIQ: props.cargo.TIPOLIQUIDACIONID,
    vIDESTADOCARGO: 3, // 3 = Baja de Cargo
    vFECHABAJA: fecBajaApi,
  };

  try {
    const { operacionOk, valorError, errorMsg, out } = await ejecutarSP("sp/CargoUpd", payload);
    const errCode = valorError !== undefined && valorError !== -1
      ? valorError
      : (out?.vError ?? (operacionOk ? 0 : -1));

    if (operacionOk && errCode === 0) {
      emit("baja-confirmada", { cargo: props.cargo, fechaBaja: fechaBaja.value });
      cerrar();
    } else {
      errorMessage.value = errorMsg || out?.vErrorMsg || "No se pudo registrar la baja del cargo.";
    }
  } catch (err) {
    errorMessage.value = err.message || "Error al procesar la baja.";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="500px" persistent @update:model-value="emit('update:modelValue', $event)">
    <v-card class="elevation-3" rounded="lg">
      <v-card-title class="d-flex align-center py-3 px-4 bg-error text-white">
        <v-icon icon="mdi-account-arrow-down" class="me-2" />
        <span class="text-h6 font-weight-bold">Dar de Baja al Cargo</span>
      </v-card-title>

      <v-card-text class="pa-4">
        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          density="compact"
          closable
          class="mb-3"
          @click:close="errorMessage = ''"
        >
          {{ errorMessage }}
        </v-alert>

        <p class="text-body-2 mb-3">
          Está a punto de dar de baja el siguiente cargo:
        </p>

        <div class="pa-3 mb-4 bg-grey-lighten-4 rounded border">
          <div><strong>Cargo ID:</strong> {{ cargo?.ID || cargo?.Id }}</div>
          <div><strong>Repartición:</strong> {{ cargo?.REPARTICIONID }} — <strong>Orden:</strong> {{ cargo?.ORDEN }}</div>
          <div><strong>Agente:</strong> {{ cargo?.PERSONAAPELLIDO }} {{ cargo?.PERSONANOMBRE }}</div>
        </div>

        <v-form ref="form" v-model="formValido" @submit.prevent="confirmarBaja">
          <v-text-field
            v-model="fechaBaja"
            label="Fecha de Baja (DD/MM/AAAA)"
            placeholder="DD/MM/AAAA"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-calendar"
            :rules="[
              (v) => !!v || 'La fecha de baja es requerida',
              (val) => rules.longitudEntre(val, 8, 10),
            ]"
          ></v-text-field>
        </v-form>
      </v-card-text>

      <v-card-actions class="d-flex justify-end pa-4 pt-0">
        <v-btn
          variant="outlined"
          color="grey"
          :disabled="isSubmitting"
          @click="cerrar"
        >
          Cancelar
        </v-btn>
        <v-btn
          color="error"
          prepend-icon="mdi-check"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          @click="confirmarBaja"
        >
          Confirmar Baja
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
