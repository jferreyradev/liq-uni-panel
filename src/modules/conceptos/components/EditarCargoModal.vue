<script setup>
import { ref, watch } from "vue";
import { getFechaToAPIFromDDMMYYYY, getFechaDMY } from "@/utils/formatos";
import {
  reparticiones,
  tiposEmpleo,
  tipoLiq,
  tiposOS,
  estadosCargo,
  sitRev,
} from "@/utils/tipos";
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

const emit = defineEmits(["update:modelValue", "cargo-actualizado"]);

const form = ref(null);
const formValido = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref("");

// Reglas de validación robustas para Vuetify (funciones simples que retornan true o mensaje)
const reglaRequerido = (val) => {
  if (val === null || val === undefined || String(val).trim() === "") {
    return "El campo es requerido";
  }
  return true;
};

const reglaNumero = (val) => {
  if (val === null || val === undefined || String(val).trim() === "") return true;
  return /^[0-9]+$/.test(String(val).trim()) || "Número entero inválido";
};

const reglaOrden = (val) => {
  if (val === null || val === undefined || String(val).trim() === "") {
    return "El campo es requerido";
  }
  const str = String(val).trim();
  if (!/^[0-9]+$/.test(str)) return "Número entero inválido";
  if (str.length < 1 || str.length > 7) return "Se acepta entre 1 y 7 caracteres";
  return true;
};

const reglaAntiguedad = (val) => {
  if (val === null || val === undefined || String(val).trim() === "") return true;
  const str = String(val).trim();
  if (!/^[0-9]+$/.test(str)) return "Número entero inválido";
  if (str.length > 2) return "Se acepta hasta 2 dígitos";
  return true;
};

const reglaFechaDMY = (val) => {
  if (!val || !String(val).trim()) return true;
  return (
    /^([0-2][0-9]|3[0-1])\/(0?[1-9]|1[0-2])\/\d{4}$/.test(String(val).trim()) ||
    "El formato debe ser DD/MM/AAAA"
  );
};

// Campos editables del cargo
const reparticionId = ref(null);
const orden = ref(0);
const afiliado = ref(0);
const antiguedad = ref(0);
const vtoEscalafon = ref("");
const tipoEmpleoId = ref(null);
const situacionRevistaId = ref(null);
const categoria = ref(0);
const tipoOSId = ref(null);
const tipoLiqId = ref(null);
const estadoCargoId = ref(null);
const fechaBaja = ref("");
const observacion = ref("");

watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto && props.cargo) {
      errorMessage.value = "";
      const rawRep = props.cargo.ReparticionId ?? props.cargo.REPARTICIONID;
      reparticionId.value = rawRep != null ? Number(rawRep) : null;
      orden.value = props.cargo.Orden ?? props.cargo.ORDEN ?? 0;
      afiliado.value = props.cargo.Afiliado ?? props.cargo.AFILIADO ?? 0;
      antiguedad.value = props.cargo.Antiguedad ?? props.cargo.ANTIGUEDAD ?? 0;
      const rawVto = props.cargo.VtoEscalafon || props.cargo.VTOESCALAFON || "";
      vtoEscalafon.value = rawVto ? getFechaDMY(rawVto) : "";
      const rawTE = props.cargo.TipoEmpleoId ?? props.cargo.TIPOEMPLEOID;
      tipoEmpleoId.value = rawTE != null ? Number(rawTE) : null;
      const rawSR = props.cargo.SituacionRevistaId ?? props.cargo.SITUACIONREVISTAID;
      situacionRevistaId.value = rawSR != null ? Number(rawSR) : null;
      categoria.value = props.cargo.Categoria ?? props.cargo.CATEGORIA ?? 0;
      const rawOS = props.cargo.TipoObraSocialId ?? props.cargo.TIPOOBRASOCIALID;
      tipoOSId.value = rawOS != null ? Number(rawOS) : null;
      const rawTL = props.cargo.TipoLiquidacionId ?? props.cargo.TIPOLIQUIDACIONID;
      tipoLiqId.value = rawTL != null ? Number(rawTL) : null;
      const rawEC = props.cargo.EstadoCargoId ?? props.cargo.ESTADOCARGOID;
      estadoCargoId.value = rawEC != null ? Number(rawEC) : null;
      const rawBaja = props.cargo.FechaBaja || props.cargo.FECHABAJA || "";
      fechaBaja.value = rawBaja ? getFechaDMY(rawBaja) : "";
      const rawObs = props.cargo.Observacion ?? props.cargo.OBSERVACION ?? props.cargo.observacion ?? props.cargo.OBS ?? "";
      observacion.value = rawObs || "";
    }
  },
  { immediate: true }
);

function cerrar() {
  emit("update:modelValue", false);
}

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

async function guardar() {
  if (form.value) {
    const res = await form.value.validate();
    const valid = typeof res === "object" && res !== null ? res.valid : res;
    if (!valid) return;
  }

  isSubmitting.value = true;
  errorMessage.value = "";

  let cargoId = resolveCargoId();

  // Fallback: Si no viene en props.cargo, consultar la vista canónica view/cargo por Reparticion y Orden
  if (!cargoId) {
    const rep = props.cargo?.ReparticionId ?? props.cargo?.REPARTICIONID;
    const ord = props.cargo?.Orden ?? props.cargo?.ORDEN;
    if (rep && ord) {
      try {
        const resCargo = await leerDatos("view/cargo", {
          query: { ReparticionId: rep, Orden: ord },
        });
        if (resCargo.operacionOk && Array.isArray(resCargo.datos) && resCargo.datos.length > 0) {
          cargoId = Number(
            resCargo.datos[0].Id ??
            resCargo.datos[0].ID ??
            resCargo.datos[0].CargoId ??
            resCargo.datos[0].CARGOID ??
            resCargo.datos[0].idcargo ??
            0
          );
        }
      } catch (err) {
        console.warn("No se pudo obtener el ID del cargo desde view/cargo:", err);
      }
    }
  }

  if (!cargoId) {
    errorMessage.value = "No se pudo identificar el ID del cargo a modificar.";
    isSubmitting.value = false;
    return;
  }

  const fecBajaApi = fechaBaja.value ? getFechaToAPIFromDDMMYYYY(fechaBaja.value) : null;
  const vtoEscApi = vtoEscalafon.value ? getFechaToAPIFromDDMMYYYY(vtoEscalafon.value) : null;

  const payload = {
    vIDCARGO: Number(cargoId),
    idcargo: Number(cargoId),
    IdCargo: Number(cargoId),
    vIDREP: Number(reparticionId.value),
    vORDEN: Number(orden.value) || 0,
    vAFILIADO: Number(afiliado.value) || 0,
    vANTIG: Number(antiguedad.value) || 0,
    vVTOESC: vtoEscApi,
    vIDTE: Number(tipoEmpleoId.value),
    vIDSITREV: Number(situacionRevistaId.value),
    vIDTIPOOS: Number(tipoOSId.value),
    vCATEGORIA: Number(categoria.value) || 0,
    vIDTIPOLIQ: Number(tipoLiqId.value),
    vIDESTADOCARGO: Number(estadoCargoId.value),
    vFECHABAJA: fecBajaApi,
    vOBSERVACION: observacion.value ? String(observacion.value).trim() : "",
    vOBSERVACIONES: observacion.value ? String(observacion.value).trim() : "",
    Observacion: observacion.value ? String(observacion.value).trim() : "",
  };

  try {
    const res = await ejecutarSP("sp/cargos_spuCargo", payload);
    const errCode = resolveSpErrorCode(res);
    const esExito = res.operacionOk && (errCode === SP_OK || Number(res.valorError) === 0);

    if (esExito) {
      emit("cargo-actualizado", { cargoId, payload });
      cerrar();
    } else {
      errorMessage.value = extractSpMessage(res, "No se pudo actualizar el cargo.");
    }
  } catch (err) {
    errorMessage.value = err.message || "Error al conectar con el servidor.";
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="800px"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="elevation-3" rounded="lg">
      <v-card-title class="d-flex align-center justify-space-between py-3 px-4 bg-primary text-white">
        <div class="d-flex align-center">
          <v-icon icon="mdi-account-cog" class="me-2" />
          <span class="text-subtitle-1 font-weight-bold">
            Actualizar Cargo #{{ resolveCargoId() || `${cargo?.ReparticionId || cargo?.REPARTICIONID || ''}-${cargo?.Orden || cargo?.ORDEN || ''}` }}
          </span>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          density="compact"
          color="white"
          :disabled="isSubmitting"
          @click="cerrar"
        ></v-btn>
      </v-card-title>

      <!-- Contexto de solo lectura del Agente (solamente lo relacionado al cargo se edita) -->
      <div class="bg-blue-grey-lighten-5 px-4 py-2 border-b text-caption d-flex flex-wrap ga-4">
        <div>
          <span class="text-grey-darken-2 font-weight-bold">DNI: </span>
          <span>{{ cargo?.PersonaDocumento || cargo?.PERSONADOCUMENTO || cargo?.Documento || '—' }}</span>
        </div>
        <div>
          <span class="text-grey-darken-2 font-weight-bold">Agente: </span>
          <span>{{ cargo?.APELLIDOYNOMBRE || `${cargo?.PersonaApellido || cargo?.PERSONAAPELLIDO || ''}, ${cargo?.PersonaNombre || cargo?.PERSONANOMBRE || ''}`.trim() || '—' }}</span>
        </div>
        <div>
          <span class="text-grey-darken-2 font-weight-bold">Asignación Familiar: </span>
          <span>{{ (cargo?.Salario ?? cargo?.SALARIO) === 1 ? 'SÍ' : 'NO' }}</span>
        </div>
      </div>

      <v-card-text class="pa-4">
        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          density="comfortable"
          closable
          class="mb-4"
          @click:close="errorMessage = ''"
        >
          {{ errorMessage }}
        </v-alert>

        <v-form ref="form" v-model="formValido" @submit.prevent="guardar">
          <v-row dense>
            <!-- Repartición -->
            <v-col cols="12" sm="6">
              <v-select
                v-model="reparticionId"
                label="Repartición *"
                :items="reparticiones"
                item-title="name"
                item-value="value"
                variant="outlined"
                density="compact"
                :rules="[reglaRequerido]"
              ></v-select>
            </v-col>

            <!-- Orden -->
            <v-col cols="12" sm="3">
              <v-text-field
                v-model="orden"
                label="Orden *"
                type="number"
                variant="outlined"
                density="compact"
                :rules="[reglaOrden]"
              ></v-text-field>
            </v-col>

            <!-- Afiliado -->
            <v-col cols="12" sm="3">
              <v-text-field
                v-model="afiliado"
                label="Afiliado"
                type="number"
                variant="outlined"
                density="compact"
                :rules="[reglaNumero]"
              ></v-text-field>
            </v-col>

            <!-- Tipo de Empleo (No editable por regla de negocio) -->
            <v-col cols="12" sm="4">
              <v-select
                v-model="tipoEmpleoId"
                label="Tipo de Empleo *"
                :items="tiposEmpleo"
                item-title="name"
                item-value="value"
                variant="outlined"
                density="compact"
                disabled
                messages="No se permite modificar el tipo de empleo"
                :rules="[reglaRequerido]"
              ></v-select>
            </v-col>

            <!-- Antigüedad -->
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="antiguedad"
                label="Antigüedad (años)"
                type="number"
                variant="outlined"
                density="compact"
                :rules="[reglaAntiguedad]"
              ></v-text-field>
            </v-col>

            <!-- Vto. Escalafón -->
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="vtoEscalafon"
                label="Vto. Escalafón"
                placeholder="DD/MM/AAAA"
                variant="outlined"
                density="compact"
                :rules="[reglaFechaDMY]"
              ></v-text-field>
            </v-col>

            <!-- Situación de Revista -->
            <v-col cols="12" sm="4">
              <v-select
                v-model="situacionRevistaId"
                label="Sit. de Revista *"
                :items="sitRev"
                item-title="name"
                item-value="value"
                variant="outlined"
                density="compact"
                :rules="[reglaRequerido]"
              ></v-select>
            </v-col>

            <!-- Categoría -->
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="categoria"
                label="Categoría"
                type="number"
                variant="outlined"
                density="compact"
                :rules="[reglaNumero]"
              ></v-text-field>
            </v-col>

            <!-- Tipo Obra Social -->
            <v-col cols="12" sm="4">
              <v-select
                v-model="tipoOSId"
                label="Tipo Obra Social *"
                :items="tiposOS"
                item-title="name"
                item-value="value"
                variant="outlined"
                density="compact"
                :rules="[reglaRequerido]"
              ></v-select>
            </v-col>

            <!-- Tipo de Liquidación (No editable por regla de negocio) -->
            <v-col cols="12" sm="4">
              <v-select
                v-model="tipoLiqId"
                label="Tipo Liquidación *"
                :items="tipoLiq"
                item-title="name"
                item-value="value"
                variant="outlined"
                density="compact"
                disabled
                messages="No se permite modificar el tipo de liquidación"
                :rules="[reglaRequerido]"
              ></v-select>
            </v-col>

            <!-- Estado del Cargo -->
            <v-col cols="12" sm="4">
              <v-select
                v-model="estadoCargoId"
                label="Estado del Cargo *"
                :items="estadosCargo"
                item-title="name"
                item-value="value"
                variant="outlined"
                density="compact"
                :rules="[reglaRequerido]"
              ></v-select>
            </v-col>

            <!-- Fecha de Baja -->
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="fechaBaja"
                label="Fecha de Baja"
                placeholder="DD/MM/AAAA"
                variant="outlined"
                density="compact"
                :rules="[reglaFechaDMY]"
              ></v-text-field>
            </v-col>

            <!-- Observación -->
            <v-col cols="12">
              <v-textarea
                v-model="observacion"
                label="Observación"
                rows="2"
                auto-grow
                variant="outlined"
                density="compact"
                hide-details="auto"
                placeholder="Observaciones adicionales sobre el cargo"
              ></v-textarea>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-card-actions class="px-4 py-3 bg-grey-lighten-4 border-t d-flex justify-end ga-2">
        <v-btn
          variant="outlined"
          color="grey-darken-1"
          :disabled="isSubmitting"
          @click="cerrar"
        >
          Cancelar
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-content-save"
          :loading="isSubmitting"
          @click="guardar"
        >
          Guardar Cambios
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
