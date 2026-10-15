<script setup>
import LiqInputPanel from '@/shared/components/LiqInputPanel.vue'
import ArchIPSST from '../components/ArchIPSST.vue'
import ResumenIPSST from '../components/ResumenIPSST.vue'
</script>

<template>
  <v-container fluid class="pa-0">
    <!-- Encabezado de la Vista -->
    <v-row justify="space-around" class="bg-primary pa-3 rounded mb-3 mx-0">
      <div class="d-flex align-center">
        <v-icon icon="mdi-file-document-multiple" class="me-2 text-white" size="large"></v-icon>
        <h3 class="text-white mb-0">Exportación de Archivos — Obra Social IPSST</h3>
      </div>
    </v-row>

    <!-- Panel de Selección de Período -->
    <v-row class="mb-3 mx-0">
      <v-col cols="12" class="pa-0">
        <LiqInputPanel :tipoliq="false" :nroadi="false" />
      </v-col>
    </v-row>

    <!-- Generación de Archivo TXT Oficial IPSST -->
    <v-row class="mb-3 mx-0">
      <v-col cols="12" class="pa-0">
        <ArchIPSST />
      </v-col>
    </v-row>

    <!-- Resumen de Retenciones IPSST -->
    <v-row class="mx-0">
      <v-col cols="12" class="pa-0">
        <ResumenIPSST />
      </v-col>
    </v-row>
  </v-container>
</template>
