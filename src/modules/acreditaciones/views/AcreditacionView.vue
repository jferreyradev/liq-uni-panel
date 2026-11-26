<script setup>
import { ref } from "vue";
import { useRoute } from "vue-router";
import { LiqInputPanel } from "@/shared/components";
import BloqueoLiquidaciones from "../components/BloqueoLiquidaciones.vue";
import ResumenAcred from "../components/ResumenAcred.vue";
import ResumenAcredDetalle from "../components/ResumenAcredDetalle.vue";
import ArchAcred from "../components/ArchAcred.vue";

const route = useRoute();
const tabActiva = ref(route.query.tab || "bloqueo");
</script>

<template>
  <v-container>
    <!-- Tarjeta Principal con Título y Filtros de Liquidación -->
    <v-card class="elevation-1 border mb-4" rounded="lg">
      <v-card-title class="d-flex align-center py-3 px-4 bg-primary text-white">
        <v-icon icon="mdi-bank-transfer" class="me-2"></v-icon>
        <span class="text-h6 font-weight-bold">Acreditaciones Bancarias</span>
      </v-card-title>

      <v-card-text class="pt-3 pb-1">
        <LiqInputPanel :esley="true" />
      </v-card-text>

      <v-divider />

      <!-- Pestañas de Navegación del Módulo -->
      <v-tabs
        v-model="tabActiva"
        color="primary"
        bg-color="grey-lighten-4"
        grow
        slider-color="primary"
      >
        <v-tab value="bloqueo" class="font-weight-bold text-warning-darken-3">
          <v-icon start icon="mdi-shield-lock" color="warning" />
          1. Bloquear Liquidaciones
        </v-tab>
        <v-tab value="detalle" class="font-weight-medium">
          <v-icon start icon="mdi-table-large" />
          2. Detalle y Excel
        </v-tab>
        <v-tab value="resumen" class="font-weight-medium">
          <v-icon start icon="mdi-chart-box-outline" />
          3. Resumen General
        </v-tab>
        <v-tab value="archivo" class="font-weight-medium">
          <v-icon start icon="mdi-file-download-outline" />
          4. Archivo Bancario TXT
        </v-tab>
      </v-tabs>
    </v-card>

    <!-- Contenido de las Pestañas -->
    <v-window v-model="tabActiva">
      <!-- PESTAÑA 1: BLOQUEAR LIQUIDACIONES -->
      <v-window-item value="bloqueo">
        <BloqueoLiquidaciones />
      </v-window-item>

      <!-- PESTAÑA 2: DETALLE Y EXCEL -->
      <v-window-item value="detalle">
        <ResumenAcredDetalle />
      </v-window-item>

      <!-- PESTAÑA 3: RESUMEN GENERAL -->
      <v-window-item value="resumen">
        <ResumenAcred />
      </v-window-item>

      <!-- PESTAÑA 4: ARCHIVO BANCARIO TXT -->
      <v-window-item value="archivo">
        <ArchAcred />
      </v-window-item>
    </v-window>
  </v-container>
</template>
