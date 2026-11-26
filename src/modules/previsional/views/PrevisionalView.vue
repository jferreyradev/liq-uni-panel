<script setup>
import DDJJMarco from "../components/DDJJMarco.vue";
import ParametrosDDJJ_List from "../components/ParametrosDDJJ_List.vue";
import { ref } from "vue";

const verParam = ref(false);

const setVerParam = (nuevoVal) => {
  verParam.value = nuevoVal;
};
</script>

<template>
  <v-container>
    <!-- Encabezado Principal -->
    <v-card class="elevation-1 border mb-4" rounded="lg">
      <v-card-title class="d-flex align-center justify-space-between flex-wrap py-3 px-4 bg-primary text-white">
        <div class="d-flex align-center">
          <v-icon icon="mdi-shield-account-outline" class="me-2"></v-icon>
          <span class="text-h6 font-weight-bold">Régimen Previsional — DDJJ</span>
        </div>
        <v-btn
          v-if="!verParam"
          color="white"
          variant="elevated"
          class="text-primary font-weight-bold"
          prepend-icon="mdi-cog-outline"
          @click="setVerParam(true)"
        >
          Ver Parámetros
        </v-btn>
      </v-card-title>
    </v-card>

    <v-row v-if="!verParam">
      <v-col cols="12" class="px-0">
        <DDJJMarco />
      </v-col>
    </v-row>
    <v-row v-if="verParam">
      <v-col cols="12" class="px-0">
        <ParametrosDDJJ_List :cerrar="setVerParam" />
      </v-col>
    </v-row>
  </v-container>
</template>
