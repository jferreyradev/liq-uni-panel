<script setup>
import { ref } from 'vue'
import LiqInputPanel from '@/shared/components/LiqInputPanel.vue'
import ArchIPSST from '../components/ArchIPSST.vue'
import ResumenIPSST from '../components/ResumenIPSST.vue'

const currentTab = ref('archivo')
</script>

<template>
  <v-container>
    <v-row justify="space-around" class="bg-primary pa-2 rounded-t mb-2">
      <div class="d-flex align-center">
        <v-icon icon="mdi-file-document-multiple" class="me-2 text-white" size="large"></v-icon>
        <h3 class="text-white">Exportación de Archivos — Obra Social IPSST</h3>
      </div>
    </v-row>

    <!-- Panel de Selección de Período -->
    <v-row class="mb-2">
      <LiqInputPanel :tipoliq="false" :nroadi="false" />
    </v-row>

    <!-- Pestañas del Módulo IPSST (Primero Archivo TXT) -->
    <v-tabs v-model="currentTab" color="primary" grow class="mb-4">
      <v-tab value="archivo" prepend-icon="mdi-file-download-outline">
        Generación de Archivo TXT IPSST
      </v-tab>
      <v-tab value="resumen" prepend-icon="mdi-table-check">
        Resumen de Retenciones IPSST
      </v-tab>
    </v-tabs>

    <v-window v-model="currentTab">
      <v-window-item value="archivo">
        <ArchIPSST />
      </v-window-item>

      <v-window-item value="resumen">
        <ResumenIPSST />
      </v-window-item>
    </v-window>
  </v-container>
</template>
