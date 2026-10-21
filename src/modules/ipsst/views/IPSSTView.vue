<script setup>
import { LiqInputPanel } from "@/shared/components";
import ResumenIPSST from '../components/ResumenIPSST.vue'
import ArchIPSST from '../components/ArchIPSST.vue'
</script>

<template>
  <v-container>
    <v-row justify="space-around" class="bg-primary">
      <h3>Exportación de Archivos — Obra Social IPSST</h3>
    </v-row>

    <v-row>
      <LiqInputPanel :tipoliq="false" :nroadi="false" />
    </v-row>

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
