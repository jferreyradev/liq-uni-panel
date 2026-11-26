<script setup>
import { LiqInputPanel } from "@/shared/components";
import ResumenIPSST from '../components/ResumenIPSST.vue'
import ArchIPSST from '../components/ArchIPSST.vue'
</script>

<template>
  <v-container>
    <!-- Tarjeta Principal con Título y Filtros -->
    <v-card class="elevation-1 border mb-4" rounded="lg">
      <v-card-title class="d-flex align-center py-3 px-4 bg-primary text-white">
        <v-icon icon="mdi-hospital-box-outline" class="me-2"></v-icon>
        <span class="text-h6 font-weight-bold">Exportación de Archivos — Obra Social IPSST</span>
      </v-card-title>

      <v-card-text class="pt-3 pb-1">
        <LiqInputPanel :tipoliq="false" :nroadi="false" />
      </v-card-text>
    </v-card>

    <!-- Planilla de Retenciones IPSST -->
    <v-row>
      <v-col cols="12" class="px-0">
        <ResumenIPSST />
      </v-col>
    </v-row>

    <v-divider class="my-3"></v-divider>

    <!-- Archivo TXT para IPSST -->
    <v-row>
      <v-col cols="12" class="px-0">
        <ArchIPSST />
      </v-col>
    </v-row>
  </v-container>
</template>
