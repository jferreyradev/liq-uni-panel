<script setup>
import { ref, watch } from "vue";
import {
  getDecimalToAPI,
  getFechaToAPIFromMMYYYY,
  getVto,
  financial,
} from "@/utils/formatos";
import { rules } from "@/utils/reglasValidacion";
import { ejecutarSP } from "@/shared/services/apiService";
import { resolveSpErrorCode, extractSpMessage, SP_OK } from "@/utils/spRespuesta";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  registro: {
    type: Object,
    default: null,
  },
  cargoId: {
    type: [Number, String],
    default: 0,
  },
  periodoDefault: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:modelValue", "guardado"]);

const form = ref(null);
const formValido = ref(false);
const isSaving = ref(false);
const errorMessage = ref("");

const concepto = ref({
  ID: 0,
  CODIGO: "",
  SUBCODIGO: "0",
  PARAMETRO1: "0",
  PARAMETRO2: "0",
  IMPORTE: "0.00",
  GRUPOADICIONALID: "0",
  PENLEY: false,
});

const vencimiento = ref("");
const periodo = ref("");

watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) {
      errorMessage.value = "";
      if (props.registro) {
        concepto.value = {
          ID: props.registro.ID || props.registro.Id || props.registro.IDCONCEPTOLIQ || 0,
          CODIGO: String(props.registro.CODIGO ?? ""),
          SUBCODIGO: String(props.registro.SUBCODIGO ?? "0"),
          PARAMETRO1: String(props.registro.PARAM1 ?? props.registro.PARAMETRO1 ?? "0"),
          PARAMETRO2: String(props.registro.PARAM2 ?? props.registro.PARAMETRO2 ?? "0"),
          IMPORTE: financial(props.registro.IMPORTE) || "0.00",
          GRUPOADICIONALID: String(props.registro.GRUPOADICIONALID ?? "0"),
          PENLEY: props.registro.PENLEY === 1 || props.registro.PENLEY === true,
        };
        const rawVto = props.registro.VTO || props.registro.VENCIMIENTO || "";
        vencimiento.value = rawVto ? getVto(rawVto) : "";
        periodo.value = props.registro.PERIODO ? getVto(props.registro.PERIODO) : props.periodoDefault;
      } else {
        concepto.value = {
          ID: 0,
          CODIGO: "",
          SUBCODIGO: "0",
          PARAMETRO1: "0",
          PARAMETRO2: "0",
          IMPORTE: "0.00",
          GRUPOADICIONALID: "0",
          PENLEY: false,
        };
        vencimiento.value = "";
        periodo.value = props.periodoDefault;
      }
    }
  },
  { immediate: true }
);

function cerrar() {
  emit("update:modelValue", false);
}

async function guardar() {
  if (form.value) {
    const res = await form.value.validate();
    const valid = typeof res === "object" && res !== null ? res.valid : res;
    if (!valid) return;
  }

  isSaving.value = true;
  errorMessage.value = "";

  const fecVto = vencimiento.value ? getFechaToAPIFromMMYYYY(vencimiento.value) : "";
  const fecPer = periodo.value ? getFechaToAPIFromMMYYYY(periodo.value) : "";

  let payload = {
    vIDCARGO: Number(props.cargoId),
    vCODIGO: Number(concepto.value.CODIGO),
    vSUBCOD: Number(concepto.value.SUBCODIGO) || 0,
    vPARM1: Number(concepto.value.PARAMETRO1) || 0,
    vPARM2: Number(concepto.value.PARAMETRO2) || 0,
    vVTO: fecVto,
    vIMPORTE: getDecimalToAPI(concepto.value.IMPORTE),
    vPERIODO: fecPer,
    vIDGRUPOADI: Number(concepto.value.GRUPOADICIONALID) || 0,
    vPENLEY: concepto.value.PENLEY ? 1 : 0,
  };

  const isEdit = Boolean(concepto.value.ID && concepto.value.ID !== 0);
  let spUrl = isEdit ? "sp/conceptoliq_spuConceptoliq" : "sp/conceptoliq_spiConceptoliq";

  if (isEdit) {
    payload = {
      vIDCONCEPTOLIQ: Number(concepto.value.ID),
      ...payload,
    };
  }

  try {
    let res = await ejecutarSP(spUrl, payload);
    if (!res.operacionOk && res.estado === 404) {
      // Fallback a nombre de SP legacy si el endpoint con prefijo no estuviera
      const legacySp = isEdit ? "sp/ConceptoLiqUpd" : "sp/ConceptoLiqIns";
      res = await ejecutarSP(legacySp, payload);
    }
    const errCode = resolveSpErrorCode(res);
    const esExito = res.operacionOk && (errCode === SP_OK || Number(res.valorError) === 0);

    if (esExito) {
      emit("guardado", { isEdit, payload });
      cerrar();
    } else {
      errorMessage.value = extractSpMessage(res, "No se pudo guardar el concepto.");
    }
  } catch (err) {
    errorMessage.value = err.message || "Error al procesar el concepto.";
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="600px" persistent @update:model-value="emit('update:modelValue', $event)">
    <v-card class="elevation-3" rounded="lg">
      <v-card-title class="d-flex align-center py-3 px-4 bg-primary text-white">
        <v-icon :icon="concepto.ID ? 'mdi-pencil' : 'mdi-plus'" class="me-2" />
        <span class="text-h6 font-weight-bold">
          {{ concepto.ID ? 'Editar Concepto de Liquidación' : 'Agregar Concepto al Cargo' }}
        </span>
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

        <v-form ref="form" v-model="formValido" @submit.prevent="guardar">
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="concepto.CODIGO"
                label="Código de Concepto"
                type="number"
                variant="outlined"
                density="compact"
                :rules="[
                  (v) => (v !== null && v !== undefined && String(v).trim() !== '') || 'Código requerido',
                  (v) => (!isNaN(Number(v)) && Number(v) >= 0) || 'Código inválido (debe ser mayor o igual a 0)',
                ]"
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="concepto.SUBCODIGO"
                label="Subcódigo"
                type="number"
                variant="outlined"
                density="compact"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="concepto.PARAMETRO1"
                label="Parámetro 1"
                type="number"
                variant="outlined"
                density="compact"
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="concepto.PARAMETRO2"
                label="Parámetro 2"
                type="number"
                variant="outlined"
                density="compact"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="concepto.IMPORTE"
                label="Importe ($)"
                placeholder="0.00"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-currency-usd"
                :rules="[(v) => v !== '' && v !== null || 'Importe requerido']"
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="periodo"
                label="Período (MM/AAAA)"
                placeholder="MM/AAAA"
                variant="outlined"
                density="compact"
                :rules="[
                  (v) => !!v || 'Período requerido',
                  ...rules.mmyyyy,
                ]"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="vencimiento"
                label="Vencimiento (MM/AAAA, opcional)"
                placeholder="MM/AAAA"
                variant="outlined"
                density="compact"
                clearable
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="concepto.GRUPOADICIONALID"
                label="Grupo Adicional"
                type="number"
                variant="outlined"
                density="compact"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row align="center">
            <v-col cols="12">
              <v-checkbox
                v-model="concepto.PENLEY"
                label="Es Concepto de Ley (PENLEY)"
                color="primary"
                density="compact"
                hide-details
              ></v-checkbox>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-card-actions class="d-flex justify-end pa-4 pt-0">
        <v-btn
          variant="outlined"
          color="grey"
          :disabled="isSaving"
          @click="cerrar"
        >
          Cancelar
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-content-save"
          :loading="isSaving"
          :disabled="isSaving"
          @click="guardar"
        >
          Guardar Concepto
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
