<script setup>
import { ref } from 'vue'
import AcreditacionBase from '@/components/Acreditacion/AbreditacionBase.vue'
import LiqInputPanel from '@/components/LiqInputPanel.vue'
import ResumenAcred from '@/components/ResumenAcred.vue'
import ResumenAcredDetalle from '@/components/ResumenAcredDetalle.vue'
import ArchAcred from '@/components/ArchAcred.vue'

const currentTab = ref('generacion')
</script>

<template>
  <v-container>
    <v-row justify="space-around" class="bg-primary pa-2 rounded-t mb-2">
      <h3 class="text-white">Acreditaciones Bancarias</h3>
    </v-row>

    <v-tabs v-model="currentTab" color="primary" grow class="mb-4">
      <v-tab value="generacion" prepend-icon="mdi-file-export-outline">
        Generación de Acreditación (TXT)
      </v-tab>
      <v-tab value="resumen" prepend-icon="mdi-table-check">
        Resumen y Control de Cuentas
      </v-tab>
    </v-tabs>

    <v-window v-model="currentTab">
      <v-window-item value="generacion">
        <AcreditacionBase />
      </v-window-item>

      <v-window-item value="resumen">
        <v-row class="mb-2">
          <LiqInputPanel :esley="true" />
        </v-row>
        <v-row class="mb-2">
          <ResumenAcred />
        </v-row>
        <v-row class="mb-2">
          <ResumenAcredDetalle />
        </v-row>
        <v-row class="mb-2">
          <ArchAcred />
        </v-row>
      </v-window-item>
    </v-window>
  </v-container>
</template>