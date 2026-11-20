<script setup>
import { ref, watch } from "vue";
import { getFechaToAPIFromDDMMYYYY, getFechaDMY } from "@/utils/formatos";
import { leerDatos, ejecutarSP } from "@/shared/services/apiService";
import { resolveSpErrorCode, extractSpMessage, SP_OK } from "@/utils/spRespuesta";

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

const reglaFechaBaja = [
  (v) => (v !== null && v !== undefined && String(v).trim() !== "" ? true : "La fecha de baja es requerida"),
  (v) =>
    /^([0-2][0-9]|3[0-1])\/(0?[1-9]|1[0-2])\/\d{4}$/.test(String(v || "").trim()) ||
    "El formato debe ser DD/MM/AAAA",
];

function resolveCargoId() {
  return Number(
    props.cargo?.idcargo ??
    props.cargo?.IdCargo ??
    props.cargo?.idCargo ??
    props.cargo?.IDCARGO ??
    props.cargo?.CargoId ??
    props.cargo?.CARGOID ??
    props.cargo?.ID ??
    props.cargo?.Id ??
    0
  );
}

watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) {
      const rawBaja = props.cargo?.FechaBaja || props.cargo?.FECHABAJA;
      fechaBaja.value = rawBaja ? getFechaDMY(rawBaja) : getFechaHoyDMY();
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

  let cargoId = resolveCargoId();

  if (!cargoId) {
    const rep = props.cargo?.ReparticionId ?? props.cargo?.REPARTICIONID;
    const ord = props.cargo?.Orden ?? props.cargo?.ORDEN;
    if (rep && ord) {
      try {
        const resCargo = await leerDatos("cargo", {
          query: { ReparticionId: rep, Orden: ord },
        });
        if (resCargo.operacionOk && Array.isArray(resCargo.datos) && resCargo.datos.length > 0) {
          cargoId = Number(resCargo.datos[0].ID ?? resCargo.datos[0].Id ?? 0);
        }
      } catch (err) {
        console.warn("No se pudo obtener el ID del cargo desde entidad cargo:", err);
      }
    }
  }

  if (!cargoId) {
    errorMessage.value = "No se pudo identificar el ID del cargo a dar de baja.";
    isSubmitting.value = false;
    return;
  }

  const fecBajaApi = getFechaToAPIFromDDMMYYYY(fechaBaja.value);
  const rawVto = props.cargo?.VtoEscalafon || props.cargo?.VTOESCALAFON || "";
  const vtoEscApi = rawVto ? getFechaToAPIFromDDMMYYYY(getFechaDMY(rawVto)) : "";

  const payload = {
    vIDCARGO: Number(cargoId),
    idcargo: Number(cargoId),
    IdCargo: Number(cargoId),
    vIDREP: Number(props.cargo?.ReparticionId ?? props.cargo?.REPARTICIONID ?? 0),
    vORDEN: Number(props.cargo?.Orden ?? props.cargo?.ORDEN ?? 0),
    vAFILIADO: Number(props.cargo?.Afiliado ?? props.cargo?.AFILIADO ?? 0),
    vANTIG: Number(props.cargo?.Antiguedad ?? props.cargo?.ANTIGUEDAD ?? 0),
    vVTOESC: vtoEscApi,
    vIDTE: Number(props.cargo?.TipoEmpleoId ?? props.cargo?.TIPOEMPLEOID ?? 0),
    vIDSITREV: Number(props.cargo?.SituacionRevistaId ?? props.cargo?.SITUACIONREVISTAID ?? 0),
    vIDTIPOOS: Number(props.cargo?.TipoObraSocialId ?? props.cargo?.TIPOOBRASOCIALID ?? 0),
    vCATEGORIA: Number(props.cargo?.Categoria ?? props.cargo?.CATEGORIA ?? 0),
    vIDTIPOLIQ: Number(props.cargo?.TipoLiquidacionId ?? props.cargo?.TIPOLIQUIDACIONID ?? 0),
    vIDESTADOCARGO: 3, // 3 = Baja de Cargo
    vFECHABAJA: fecBajaApi,
  };

  try {
    const res = await ejecutarSP("sp/cargos_spuCargo", payload);
    const errCode = resolveSpErrorCode(res);
    const esExito = res.operacionOk && (errCode === SP_OK || Number(res.valorError) === 0);

    if (esExito) {
      emit("baja-confirmada", { cargo: props.cargo, fechaBaja: fechaBaja.value });
      cerrar();
    } else {
      errorMessage.value = extractSpMessage(res, "No se pudo registrar la baja del cargo.");
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
          <div><strong>Cargo ID:</strong> {{ resolveCargoId() || '—' }}</div>
          <div><strong>Repartición:</strong> {{ cargo?.ReparticionId ?? cargo?.REPARTICIONID }} — <strong>Orden:</strong> {{ cargo?.Orden ?? cargo?.ORDEN }}</div>
          <div><strong>Agente:</strong> {{ cargo?.PersonaApellido ?? cargo?.PERSONAAPELLIDO }} {{ cargo?.PersonaNombre ?? cargo?.PERSONANOMBRE }}</div>
        </div>

        <v-form ref="form" v-model="formValido" @submit.prevent="confirmarBaja">
          <v-text-field
            v-model="fechaBaja"
            label="Fecha de Baja (DD/MM/AAAA)"
            placeholder="DD/MM/AAAA"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-calendar"
            :rules="reglaFechaBaja"
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
