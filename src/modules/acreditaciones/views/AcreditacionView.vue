<script setup>
import { ref, computed } from "vue";
import LiqInputPanel from "@/shared/components/LiqInputPanel.vue";
import ResumenAcred from "../components/ResumenAcred.vue";
import ResumenAcredDetalle from "../components/ResumenAcredDetalle.vue";
import ArchAcred from "../components/ArchAcred.vue";
import AcreditacionGeneraciones from "../components/AcreditacionGeneraciones.vue";
import { useFilterStore } from "@/stores/filterStore";

const store = useFilterStore();
const showGeneracionModal = ref(false);
const refreshKey = ref(0);

const alertMensaje = ref(null);
const alertTipo = ref(null);
const mostrarAlert = ref(false);

const liqMap = new Map([
  ["1", "Mensual"],
  ["5", "Adicional"],
  ["2", "SAC"],
  ["21", "Liq Final"],
  ["10", "Ayuda Escolar"],
]);

const tipoLiquidacionComputed = computed(() => ({
  name: liqMap.get(String(store.tipoliq)) || "Mensual",
  value: store.tipoliq,
}));

function cerrarGeneracionModal(generacion = 0) {
  showGeneracionModal.value = false;
  if (generacion === 1) {
    alertMensaje.value = "Generación de acreditación bancaria realizada con éxito.";
    alertTipo.value = "success";
    mostrarAlert.value = true;
    refreshKey.value++;
  }
}
</script>

<template>
  <v-container>
    <v-row justify="space-around" class="bg-primary">
      <h3>Exportación de Archivos — Acreditaciones Bancarias</h3>
    </v-row>

    <v-row>
      <LiqInputPanel>
        <v-btn
          color="secondary"
          variant="elevated"
          prepend-icon="mdi-cog-sync"
          @click="showGeneracionModal = true"
        >
          Generar
        </v-btn>
      </LiqInputPanel>
    </v-row>

    <v-alert
      v-if="mostrarAlert"
      v-model="mostrarAlert"
      border="start"
      :color="alertTipo"
      :icon="'$' + alertTipo"
      closable
      class="my-2"
    >
      {{ alertMensaje }}
    </v-alert>

    <!-- Planilla Resumen de Acreditaciones -->
    <v-row>
      <v-col cols="12" class="px-0">
        <ResumenAcred :key="refreshKey" />
      </v-col>
    </v-row>

    <v-divider class="my-3"></v-divider>

    <!-- Detalle de Acreditaciones -->
    <v-row>
      <v-col cols="12" class="px-0">
        <ResumenAcredDetalle :key="refreshKey" />
      </v-col>
    </v-row>

    <v-divider class="my-3"></v-divider>

    <!-- Archivo TXT para Banco -->
    <v-row>
      <v-col cols="12" class="px-0">
        <ArchAcred :key="refreshKey" />
      </v-col>
    </v-row>
  </v-container>

  <v-dialog v-model="showGeneracionModal" max-width="500">
    <AcreditacionGeneraciones
      :periodo="store.periodoDMY"
      :tipoLiquidacion="tipoLiquidacionComputed"
      :grupoAdicionalId="store.nroadi"
      @cerrar="cerrarGeneracionModal"
    />
  </v-dialog>
</template>
