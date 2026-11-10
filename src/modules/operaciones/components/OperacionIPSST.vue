<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getVto, getFechaToAPIFromMMYYYY, getVtoActual } from "@/utils/formatos";
import { rules } from "@/utils/reglasValidacion";
import { leerDatos, ejecutarSP_SinEspera } from "@/shared/services/apiService";
import { ConfirmacionDialog } from "@/shared/components";

const emit = defineEmits(["proceso-iniciado"]);
const router = useRouter();

const form = ref(null);
const formValido = ref(false);
const isRunning = ref(false);

const periodo = ref("");

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

async function ejecutarIPSST() {
  mostrarConfirmacion.value = false;
  isRunning.value = true;
  mostrarAlert.value = false;

  const payload = {
    Periodo: getFechaToAPIFromMMYYYY(periodo.value),
  };

  try {
    const { salida } = await ejecutarSP_SinEspera("sp/archivoIPSSTddjj", payload);
    if (salida === 0) {
      alertTipo.value = "success";
      alertMensaje.value = `Generación del archivo IPSST DDJJ iniciada para el período ${periodo.value}.`;
      emit("proceso-iniciado", { tipo: "ipsst", payload });
    } else {
      alertTipo.value = "error";
      alertMensaje.value = "No se pudo iniciar la generación del archivo IPSST DDJJ en el servidor.";
    }
  } catch (err) {
    alertTipo.value = "error";
    alertMensaje.value = err.message || "Error al solicitar la generación del archivo IPSST.";
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
        <v-icon icon="mdi-hospital-box" size="small"></v-icon>
      </v-avatar>
      <div>
        <div class="text-subtitle-1 font-weight-bold">Generación de Archivo IPSST (DDJJ)</div>
        <div class="text-caption text-medium-emphasis">
          Genera el archivo para la Declaración Jurada mensual de Obra Social IPSST (SP: <code>mod_exportacion.GENERA_ARCHIVO_IPSST_DDJJ</code>).
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
            @click="router.push('/ipsst')"
          >
            Ir a Obra Social IPSST
          </v-btn>
        </div>
      </v-alert>

      <v-form ref="form" v-model="formValido" @submit.prevent="solicitarConfirmacion">
        <v-row>
          <v-col cols="12" sm="6" md="4">
            <v-text-field
              v-model="periodo"
              label="Período DDJJ (MM/AAAA)"
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
        </v-row>

        <v-divider class="my-3"></v-divider>

        <div class="d-flex justify-space-between align-center">
          <div class="text-caption text-medium-emphasis">
            <v-icon icon="mdi-information-outline" size="small" class="me-1"></v-icon>
            Invoca <code>sp/archivoIPSSTddjj</code> con parámetro <code>Periodo</code>.
          </div>

          <v-btn
            color="primary"
            prepend-icon="mdi-file-export"
            :loading="isRunning"
            :disabled="isRunning"
            @click="solicitarConfirmacion"
          >
            Generar Archivo IPSST
          </v-btn>
        </div>
      </v-form>
    </v-card-text>

    <!-- Diálogo de Confirmación -->
    <v-dialog v-model="mostrarConfirmacion" max-width="520px">
      <ConfirmacionDialog
        titulo="Confirmar Generación IPSST DDJJ"
        :mensaje="`¿Desea generar el archivo mensual IPSST DDJJ para el período ${periodo}?`"
        :cerrar="() => (mostrarConfirmacion = false)"
        :aceptar="ejecutarIPSST"
      />
    </v-dialog>
  </v-card>
</template>
