<script setup>
import LiqBoletas from "../components/LiqBoletas.vue";
import { LiqInputPanel } from "@/shared/components";
</script>

<template>
  <v-container>
    <!-- Tarjeta Principal con Título y Filtros -->
    <v-card class="elevation-1 border mb-4" rounded="lg">
      <v-card-title class="d-flex align-center py-3 px-4 bg-primary text-white">
        <v-icon icon="mdi-receipt-text-outline" class="me-2"></v-icon>
        <span class="text-h6 font-weight-bold">Boletas de Sueldo</span>
      </v-card-title>

      <v-card-text class="pt-3 pb-1">
        <LiqInputPanel />
      </v-card-text>
    </v-card>

    <v-row>
      <v-col cols="12" class="px-0">
        <LiqBoletas />
      </v-col>
    </v-row>
  </v-container>
</template>
