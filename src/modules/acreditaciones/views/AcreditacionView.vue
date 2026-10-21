<script setup>
import { LiqInputPanel } from "@/shared/components";
import ResumenAcred from "../components/ResumenAcred.vue";
import ResumenAcredDetalle from "../components/ResumenAcredDetalle.vue";
import ArchAcred from "../components/ArchAcred.vue";
</script>

<template>
  <v-container>
    <v-row justify="space-around" class="bg-primary">
      <h3>Acreditaciones</h3>
    </v-row>
    <v-row>
      <LiqInputPanel :esley="true">
      </LiqInputPanel>
    </v-row>
    <v-row>
      <v-col cols="12" class="px-0">
        <ResumenAcred />
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" class="px-0">
        <ResumenAcredDetalle />
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" class="px-0">
        <ArchAcred />
      </v-col>
    </v-row>
  </v-container>
</template>
