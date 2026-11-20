<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { leerDatos } from "@/shared/services/apiService";

const headers = [
  { title: "ID", key: "ID", align: "end", width: "80px" },
  { title: "Estado", key: "ESTADO", align: "center", width: "130px" },
  { title: "Procedimiento", key: "PROCEDIMIENTO", align: "start" },
  { title: "Inicio", key: "INICIO", align: "start", width: "160px" },
  { title: "Fin", key: "FIN", align: "start", width: "160px" },
  { title: "Parámetros", key: "PARAMETROS", align: "start" },
  { title: "Tipo", key: "TIPO", align: "center", width: "90px" },
];

const data = ref([]);
const isPending = ref(false);
const error = ref(null);
const search = ref("");
const autoRefresh = ref(false);
let refreshTimer = null;

async function leerRegistros() {
  isPending.value = true;
  error.value = null;
  try {
    const url = 'view/logProcesos?sort={"Id":"DESC"}';
    const { datos, operacionOk, errmsg } = await leerDatos(url);
    if (operacionOk && Array.isArray(datos)) {
      data.value = datos;
    } else {
      error.value = errmsg || "No se pudieron obtener los registros de procesos.";
    }
  } catch (err) {
    error.value = err.message || "Error al conectar con el servidor.";
  } finally {
    isPending.value = false;
  }
}

function getEstadoColor(estado) {
  if (!estado) return "grey";
  const st = String(estado).toUpperCase();
  if (st.includes("FIN") || st.includes("OK") || st.includes("TERMINAD")) return "success";
  if (st.includes("ERROR") || st.includes("FALL") || st.includes("ABORT")) return "error";
  if (st.includes("EJEC") || st.includes("CURSO") || st.includes("PEND")) return "warning";
  return "info";
}

function toggleAutoRefresh(val) {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  if (val) {
    refreshTimer = setInterval(() => {
      leerRegistros();
    }, 5000);
  }
}

onMounted(() => {
  leerRegistros();
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
});

defineExpose({
  refrescar: leerRegistros,
});
</script>

<template>
  <v-card class="elevation-1 border" rounded="lg">
    <v-card-title class="d-flex flex-wrap align-center justify-space-between py-3 px-4 bg-grey-lighten-4 border-b">
      <div class="d-flex align-center">
        <v-icon icon="mdi-history" class="me-2 text-primary" />
        <span class="text-subtitle-1 font-weight-bold">Monitor y Registro de Procesos</span>
      </div>

      <div class="d-flex align-center gap-2">
        <v-switch
          v-model="autoRefresh"
          label="Auto-refresco (5s)"
          color="primary"
          density="compact"
          hide-details
          class="me-3"
          @update:model-value="toggleAutoRefresh"
        ></v-switch>

        <v-btn
          color="primary"
          variant="tonal"
          size="small"
          prepend-icon="mdi-refresh"
          :loading="isPending"
          @click="leerRegistros"
        >
          Refrescar
        </v-btn>
      </div>
    </v-card-title>

    <v-card-text class="pa-4">
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        closable
        density="compact"
        class="mb-3"
        @click:close="error = null"
      >
        {{ error }}
      </v-alert>

      <v-text-field
        v-model="search"
        label="Filtrar por procedimiento, estado o parámetro..."
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        hide-details
        class="mb-3"
        clearable
      ></v-text-field>

      <v-data-table
        :headers="headers"
        :items="data"
        :search="search"
        :loading="isPending"
        hover
        density="compact"
        class="border rounded"
        no-data-text="No hay registros de procesos disponibles"
      >
        <template #[`item.ESTADO`]="{ value }">
          <v-chip
            :color="getEstadoColor(value)"
            size="x-small"
            class="font-weight-bold text-uppercase"
            variant="flat"
          >
            {{ value || 'Desconocido' }}
          </v-chip>
        </template>

        <template #[`item.PROCEDIMIENTO`]="{ value }">
          <span class="font-weight-medium font-monospace">{{ value }}</span>
        </template>

        <template #[`item.PARAMETROS`]="{ value }">
          <span class="text-caption text-truncate d-inline-block" style="max-width: 320px;" :title="value">
            {{ value || '-' }}
          </span>
        </template>
      </v-data-table>
    </v-card-text>
  </v-card>
</template>
