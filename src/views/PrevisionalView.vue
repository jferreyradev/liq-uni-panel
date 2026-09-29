<script setup>
import DDJJMarco from '@/components/Previsional/DDJJMarco.vue'
import ParametrosDDJJ_List from '@/components/Previsional/ParametrosDDJJ_List.vue'
import { ref } from 'vue'

const verParam = ref(false)

const setVerParam = (nuevoVal) => {
  verParam.value = nuevoVal
}
</script>

<template>
  <v-container>
    <v-row justify="space-around" class="bg-primary">
      <v-col cols="10"><h3>Previsional</h3></v-col>
      <v-col cols="2">
        <v-btn
          v-if="!verParam"
          color="primary"
          elevation="3"
          class="mx-2"
          @click="setVerParam(true)"
          >Ver Parámetros</v-btn
        >
      </v-col>
    </v-row>
    <v-row v-if="!verParam">
      <DDJJMarco></DDJJMarco>
    </v-row>
    <v-row v-if="verParam">
      <ParametrosDDJJ_List :cerrar="setVerParam"></ParametrosDDJJ_List>
    </v-row>
  </v-container>
</template>
