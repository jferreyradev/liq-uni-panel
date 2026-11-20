<script setup>
import { ref, onMounted } from "vue";
import { tipoLiq } from "@/utils/tipos";
import { getVto, getFechaToAPIFromMMYYYY, getVtoActual } from "@/utils/formatos";
import { rules } from "@/utils/reglasValidacion";
import { leerDatos, ejecutarSP_SinEspera } from "@/shared/services/apiService";
import { ConfirmacionDialog } from "@/shared/components";

const emit = defineEmits(["proceso-iniciado"]);

const form = ref(null);
const formValido = ref(false);
const isRunning = ref(false);

const gruposRep = [{ name: "Municipios", value: 1 }];
const grupoRepSelected = ref(gruposRep[0]);
const tipoLiqSelected = ref(tipoLiq[0]);
const periodo = ref("");
const adicional = ref(0);

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
    // Fallback a fecha del sistema
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

async function ejecutarTransformacion() {
  mostrarConfirmacion.value = false;
  isRunning.value = true;
  mostrarAlert.value = false;

  const payload = {
    Periodo: getFechaToAPIFromMMYYYY(periodo.value),
    GrupoRep: grupoRepSelected.value.value,
    TipoLiq: tipoLiqSelected.value.value,
    GrupoAdicional: Number(adicional.value) || 0,
  };

  try {
    const { salida } = await ejecutarSP_SinEspera("sp/transform", payload);
    if (salida === 0) {
      alertTipo.value = "success";
      alertMensaje.value = `Transformación de novedades iniciada exitosamente para el período ${periodo.value}.`;
      emit("proceso-iniciado", { tipo: "transformacion", payload });
    } else {
      alertTipo.value = "error";
      alertMensaje.value = "No se pudo iniciar el proceso de transformación en el servidor.";
    }
  } catch (err) {
    alertTipo.value = "error";
    alertMensaje.value = err.message || "Error al procesar la solicitud.";
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
        <v-icon icon="mdi-swap-horizontal-bold" size="small"></v-icon>
      </v-avatar>
      <div>
        <div class="text-subtitle-1 font-weight-bold">Transformación de Novedades</div>
        <div class="text-caption text-medium-emphasis">
          Procesa y valida las novedades cargadas en las hojas para prepararlas para el cálculo de liquidación.
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
        {{ alertMensaje }}
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
              v-model="grupoRepSelected"
              label="Grupo de Repartición"
              :items="gruposRep"
              item-title="name"
              item-value="value"
              return-object
              variant="outlined"
              density="compact"
            ></v-select>
          </v-col>
        </v-row>

        <v-divider class="my-3"></v-divider>

        <div class="d-flex justify-space-between align-center">
          <div class="text-caption text-medium-emphasis">
            <v-icon icon="mdi-information-outline" size="small" class="me-1"></v-icon>
            El procedimiento se ejecuta en segundo plano (SP: <code>sp/transform</code>).
          </div>

          <v-btn
            color="primary"
            prepend-icon="mdi-play"
            :loading="isRunning"
            :disabled="isRunning"
            @click="solicitarConfirmacion"
          >
            Ejecutar Transformación
          </v-btn>
        </div>
      </v-form>
    </v-card-text>

    <!-- Diálogo de Confirmación -->
    <v-dialog v-model="mostrarConfirmacion" max-width="500px">
      <ConfirmacionDialog
        titulo="Confirmar Transformación de Novedades"
        :mensaje="`¿Está seguro de iniciar la transformación de novedades para el período ${periodo} (${tipoLiqSelected.name})?`"
        :cerrar="() => (mostrarConfirmacion = false)"
        :aceptar="ejecutarTransformacion"
      />
    </v-dialog>
  </v-card>
</template>
