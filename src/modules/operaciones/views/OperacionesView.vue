<script setup>
import { ref } from "vue";
import { useTenantStore } from "@/stores/tenantStore";
import { RepoHeader } from "@/shared/components";
import OperacionTransformacion from "../components/OperacionTransformacion.vue";
import OperacionLiquidacion from "../components/OperacionLiquidacion.vue";
import OperacionBoletas from "../components/OperacionBoletas.vue";
import MonitorProcesos from "../components/MonitorProcesos.vue";

const tenantStore = useTenantStore();

const activeTab = ref("transformacion");
const monitorRef = ref(null);
const snackbar = ref({
  show: false,
  text: "",
  color: "success",
});

function onProcesoIniciado(evento) {
  snackbar.value = {
    show: true,
    text: `Operación enviada correctamente al servidor (${evento.tipo}).`,
    color: "success",
  };
  // Si el monitor está montado, refrescarlo
  if (monitorRef.value?.refrescar) {
    monitorRef.value.refrescar();
  }
}
</script>

<template>
  <v-container fluid class="pa-4">
    <RepoHeader
      title="Módulo de Operaciones"
      :subtitle="`Gestión de procesos masivos — ${tenantStore.tenantName}`"
    />

    <v-card class="mt-4 elevation-1 border" rounded="lg">
      <v-tabs
        v-model="activeTab"
        bg-color="surface"
        color="primary"
        align-tabs="start"
        grow
        class="border-b"
      >
        <v-tab value="transformacion" prepend-icon="mdi-swap-horizontal-bold">
          1. Transformación
        </v-tab>
        <v-tab value="liquidacion" prepend-icon="mdi-calculator-variant-outline">
          2. Liquidaciones
        </v-tab>
        <v-tab value="boletas" prepend-icon="mdi-file-document-check-outline">
          3. Publicación Boletas
        </v-tab>
        <v-tab value="monitor" prepend-icon="mdi-history">
          Monitor de Procesos
        </v-tab>
      </v-tabs>

      <v-window v-model="activeTab" class="pa-4">
        <v-window-item value="transformacion">
          <OperacionTransformacion @proceso-iniciado="onProcesoIniciado" />
        </v-window-item>

        <v-window-item value="liquidacion">
          <OperacionLiquidacion @proceso-iniciado="onProcesoIniciado" />
        </v-window-item>

        <v-window-item value="boletas">
          <OperacionBoletas @proceso-iniciado="onProcesoIniciado" />
        </v-window-item>

        <v-window-item value="monitor">
          <MonitorProcesos ref="monitorRef" />
        </v-window-item>
      </v-window>
    </v-card>

    <!-- Monitor colapsable o resumen rápido al pie cuando no está en la pestaña de monitor -->
    <v-row v-if="activeTab !== 'monitor'" class="mt-4">
      <v-col cols="12">
        <v-expansion-panels>
          <v-expansion-panel elevation="1" rounded="lg">
            <v-expansion-panel-title class="py-2 text-subtitle-2 font-weight-bold">
              <v-icon icon="mdi-history" color="primary" class="me-2" size="small"></v-icon>
              Ver registro reciente de procesos ejecutados
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <MonitorProcesos ref="monitorRef" />
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col>
    </v-row>

    <!-- Snackbar de notificación rápida -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="4000"
      location="bottom end"
    >
      {{ snackbar.text }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>
