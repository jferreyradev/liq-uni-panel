<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { tipoLiq } from "@/utils/tipos";
import { getVto, getFechaToAPIFromMMYYYY, getVtoActual } from "@/utils/formatos";
import { rules } from "@/utils/reglasValidacion";
import { leerDatos, ejecutarSP_SinEspera } from "@/shared/services/apiService";
import { ConfirmacionDialog } from "@/shared/components";

const emit = defineEmits(["proceso-iniciado"]);
const router = useRouter();

const form = ref(null);
const formValido = ref(false);
const isRunning = ref(false);

const tipoLiqSelected = ref(tipoLiq[0]);
const periodo = ref("");
const adicional = ref(0);
const esLey = ref(0);

const opcionesLey = [
  { name: "Liquidación General (Ley = 0)", value: 0 },
  { name: "Cobra Ley Especial (Ley = 1)", value: 1 },
];

const mostrarConfirmacion = ref(false);
const alertMensaje = ref("");
const alertTipo = ref("success");
const mostrarAlert = ref(false);

async function obtieneVtoActual() {
  try {
    const { datos, operacionOk } = await leerDatos("view/periodo", {
      query: { Activo: 1 },
    });
    if (operacionOk && Array.isArray(datos) && datos.length > 0) {
      return getVto(datos[0].PERIODO) || getVtoActual();
    }
  } catch {
    // Fallback
  }
  return getVtoActual();
}

onMounted(async () => {
  periodo.value = await obtieneVtoActual();
});

async function solicitarConfirmacion() {
  const { valid } = await form.value.validate();
  if (!valid) return;
  mostrarConfirmacion.value = true;
}

async function ejecutarAcreditacion() {
  mostrarConfirmacion.value = false;
  isRunning.value = true;
  mostrarAlert.value = false;

  const payload = {
    vPERIODO: getFechaToAPIFromMMYYYY(periodo.value),
    vIDTIPOLIQ: tipoLiqSelected.value.value,
    vIDGRUPOADI: Number(adicional.value) || 0,
    vLEY: Number(esLey.value) || 0,
  };

  try {
    const { salida } = await ejecutarSP_SinEspera("sp/generaArchivoAcred", payload);
    if (salida === 0) {
      alertTipo.value = "success";
      alertMensaje.value = `Generación de archivo de acreditación bancaria iniciada para el período ${periodo.value} (${tipoLiqSelected.value.name}, Ley: ${esLey.value}).`;
      emit("proceso-iniciado", { tipo: "acreditaciones", payload });
    } else {
      alertTipo.value = "error";
      alertMensaje.value = "No se pudo iniciar la generación del archivo de acreditación en el servidor.";
    }
  } catch (err) {
    alertTipo.value = "error";
    alertMensaje.value = err.message || "Error al solicitar la generación de acreditaciones.";
  } finally {
    isRunning.value = false;
    mostrarAlert.value = true;
  }
}
</script>

<template>
  <v-card class="elevation-1 border" rounded="lg">
    <v-card-title class="d-flex align-center py-3 px-4 bg-grey-lighten-4 border-b">
      <v-avatar color="primary" size="32" class="me-2 text-white">
        <v-icon icon="mdi-bank-transfer" size="small"></v-icon>
      </v-avatar>
      <div>
        <div class="text-subtitle-1 font-weight-bold">Generación de Archivo de Acreditaciones</div>
        <div class="text-caption text-medium-emphasis">
          Genera el archivo para la acreditación bancaria de haberes netos en formato banco (SP: <code>MOD_EXPORTACION.GENERA_ARCHIVO_ACRED</code>).
        </div>
      </div>
    </v-card-title>

    <v-card-text class="pa-4">
      <v-alert
        v-model="mostrarAlert"
        :type="alertTipo"
        variant="tonal"
        density="comfortable"
        closable
        class="mb-4"
      >
        <div class="d-flex align-center justify-space-between flex-wrap gap-2">
          <span>{{ alertMensaje }}</span>
          <v-btn
            v-if="alertTipo === 'success'"
            variant="text"
            color="primary"
            size="small"
            prepend-icon="mdi-arrow-right"
            @click="router.push('/acredit')"
          >
            Ir a Acreditaciones
          </v-btn>
        </div>
      </v-alert>

      <v-form ref="form" v-model="formValido" @submit.prevent="solicitarConfirmacion">
        <v-row>
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="periodo"
              label="Período (MM/AAAA)"
              placeholder="MM/AAAA"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-calendar"
              :rules="[
                (v) => !!v || 'Período requerido',
                ...rules.mmyyyy,
                (val) => rules.longitudEntre(val, 6, 7),
              ]"
            ></v-text-field>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="tipoLiqSelected"
              label="Tipo de Liquidación"
              :items="tipoLiq"
              item-title="name"
              item-value="value"
              return-object
              variant="outlined"
              density="compact"
            ></v-select>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="adicional"
              label="Nro. Adicional"
              type="number"
              variant="outlined"
              density="compact"
              :rules="[
                ...rules.number,
                (val) => rules.longitudEntre(val, 1, 2),
              ]"
            ></v-text-field>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="esLey"
              label="Modalidad Ley"
              :items="opcionesLey"
              item-title="name"
              item-value="value"
              variant="outlined"
              density="compact"
            ></v-select>
          </v-col>
        </v-row>

        <v-divider class="my-3"></v-divider>

        <div class="d-flex justify-space-between align-center">
          <div class="text-caption text-medium-emphasis">
            <v-icon icon="mdi-information-outline" size="small" class="me-1"></v-icon>
            Invoca <code>sp/generaArchivoAcred</code> con <code>[vPERIODO, vIDTIPOLIQ, vIDGRUPOADI, vLEY]</code>.
          </div>

          <v-btn
            color="primary"
            prepend-icon="mdi-bank-transfer-out"
            :loading="isRunning"
            :disabled="isRunning"
            @click="solicitarConfirmacion"
          >
            Generar Acreditaciones
          </v-btn>
        </div>
      </v-form>
    </v-card-text>

    <!-- Diálogo de Confirmación -->
    <v-dialog v-model="mostrarConfirmacion" max-width="520px">
      <ConfirmacionDialog
        titulo="Confirmar Generación de Acreditaciones"
        :mensaje="`¿Desea generar el archivo de acreditación bancaria para el período ${periodo} (${tipoLiqSelected.name}, Ley: ${esLey})?`"
        :cerrar="() => (mostrarConfirmacion = false)"
        :aceptar="ejecutarAcreditacion"
      />
    </v-dialog>
  </v-card>
</template>
