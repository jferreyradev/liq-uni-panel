<script setup>
import { ref } from "vue";
import { ejecutarSP } from "@/shared/services/apiService";
import { rules } from "@/utils/reglasValidacion";
import { getFechaToAPIFromMMYYYY } from "@/utils/formatos";

const props = defineProps(["periodo", "tipoLiquidacion", "grupoAdicionalId"]);
const emit = defineEmits(["cerrar"]);

const form = ref(null);
const formOK = ref(false);
const valorFijo = ref(150000);
const cantCuotas = ref(1);
const errMensaje = ref(null);
const isSubmitting = ref(false);

async function Generar() {
  if (form.value) {
    const { valid } = await form.value.validate();
    if (!valid) return;
  }

  isSubmitting.value = true;
  errMensaje.value = null;

  try {
    const tipoVal =
      props.tipoLiquidacion && typeof props.tipoLiquidacion === "object"
        ? props.tipoLiquidacion.value
        : props.tipoLiquidacion;

    const filtros = {
      Periodo: getFechaToAPIFromMMYYYY(props.periodo),
      TipoLiq: tipoVal,
      GrupoAdicional: props.grupoAdicionalId,
      ValorFijo: Number(valorFijo.value) || 0,
      Cuotas: Number(cantCuotas.value) || 1,
    };

    const resultado = await ejecutarSP("sp/generaAcredBco", filtros);
    console.log("Resultado de generar acreditación:", resultado);

    if (!resultado.operacionOk) {
      errMensaje.value = resultado.errmsg || "No se pudo generar la acreditación";
      return;
    }

    const vError =
      resultado.valorError !== undefined
        ? resultado.valorError
        : resultado.out?.ValorError;

    if (vError == 0) {
      emit("cerrar", 1);
    } else {
      errMensaje.value = `No se pudo generar la acreditación (código de error: ${vError})`;
    }
  } catch (error) {
    errMensaje.value = error?.message || "Error al generar la acreditación";
  } finally {
    isSubmitting.value = false;
  }
}

function Cancelar() {
  emit("cerrar", 0);
}
</script>

<template>
  <v-card>
    <v-card-title class="bg-primary text-white d-flex align-center">
      <v-icon icon="mdi-bank-transfer" class="me-2" />
      Generar Acreditación Bancaria
    </v-card-title>

    <v-alert
      v-if="errMensaje"
      type="error"
      density="compact"
      class="ma-3"
      closable
      @click:close="errMensaje = null"
    >
      {{ errMensaje }}
    </v-alert>

    <v-card-text class="pt-4">
      <v-form ref="form" v-model="formOK">
        <v-list density="compact" class="bg-grey-lighten-4 rounded mb-3">
          <v-list-item>
            <template v-slot:prepend>
              <span class="font-weight-medium me-2">Período:</span>
            </template>
            <span class="font-mono">{{ props.periodo }}</span>
          </v-list-item>
          <v-list-item>
            <template v-slot:prepend>
              <span class="font-weight-medium me-2">Tipo de Liquidación:</span>
            </template>
            <span>{{ props.tipoLiquidacion?.name || props.tipoLiquidacion }}</span>
          </v-list-item>
          <v-list-item>
            <template v-slot:prepend>
              <span class="font-weight-medium me-2">Grupo Adicional:</span>
            </template>
            <span>{{ props.grupoAdicionalId }}</span>
          </v-list-item>
        </v-list>

        <v-text-field
          label="Valor Fijo"
          v-model="valorFijo"
          type="number"
          variant="outlined"
          density="comfortable"
          :rules="[...rules.required, ...rules.numDecimal]"
          class="mb-2"
        ></v-text-field>

        <v-text-field
          label="Cant. Cuotas"
          v-model="cantCuotas"
          type="number"
          variant="outlined"
          density="comfortable"
          :rules="[
            ...rules.required,
            ...rules.number,
            (v) => (v >= 1 && v <= 5) || 'Debe ser entre 1 y 5',
          ]"
        ></v-text-field>
      </v-form>
    </v-card-text>

    <v-card-actions class="d-flex justify-end pa-3 border-t">
      <v-btn color="grey-darken-1" variant="text" @click="Cancelar" :disabled="isSubmitting">
        Cancelar
      </v-btn>
      <v-btn
        color="primary"
        variant="elevated"
        prepend-icon="mdi-cog-sync"
        :loading="isSubmitting"
        @click="Generar"
      >
        Generar
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
