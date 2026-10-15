<script setup>
import { ref, watch } from "vue";
import LiqInputPanel from "@/shared/components/LiqInputPanel.vue";
import ResumenAcred from "../components/ResumenAcred.vue";
import ResumenAcredDetalle from "../components/ResumenAcredDetalle.vue";
import ArchAcred from "../components/ArchAcred.vue";
import { useFilterStore } from "@/stores/filterStore";
import { useEndPoints } from "@/composables/useEndPoints";

const store = useFilterStore();
const { apiBase, getBoletasHeaders, buildApiHeaders } = useEndPoints();

const cab = ref(null);
const detalle = ref([]);
const isPending = ref(false);
const error = ref(null);

async function fetchAcreditacion() {
  isPending.value = true;
  error.value = null;

  const headersFn = buildApiHeaders || getBoletasHeaders || (() => ({}));
  const headers = headersFn();

  try {
    // 1. Consultar cabecera con los filtros de la liquidación seleccionada
    const cabUrl = `${apiBase.value}/api/view/acredBancoCab?${store.filterString}`;
    const cabRes = await fetch(cabUrl, { headers });
    if (!cabRes.ok) {
      throw new Error(`Error ${cabRes.status} al consultar cabecera de acreditación`);
    }
    const cabData = await cabRes.json();

    if (Array.isArray(cabData) && cabData.length > 0) {
      cab.value = cabData[0];

      // 2. Consultar detalle de agentes y cuentas usando AcredCabId
      const detUrl = `${apiBase.value}/api/view/acredBancoDet?AcredCabId=${cab.value.ACREDCABID}`;
      const detRes = await fetch(detUrl, { headers });
      if (detRes.ok) {
        const detData = await detRes.json();
        detalle.value = Array.isArray(detData) ? detData : [];
      } else {
        detalle.value = [];
      }
    } else {
      cab.value = null;
      detalle.value = [];
    }
  } catch (err) {
    console.error("[AcreditacionView]", err);
    error.value = err.message || "Error al consultar la acreditación";
    cab.value = null;
    detalle.value = [];
  } finally {
    isPending.value = false;
  }
}

watch(
  () => [store.tipoliq, store.nroadi, store.month, store.year],
  () => {
    fetchAcreditacion();
  },
  { immediate: true }
);
</script>

<template>
  <v-container>
    <v-row justify="space-around" class="bg-primary">
      <h3>Exportación de Archivos — Acreditaciones Bancarias</h3>
    </v-row>

    <v-row>
      <LiqInputPanel @submit="fetchAcreditacion" />
    </v-row>

    <!-- Indicador de Carga -->
    <div v-if="isPending" class="py-4 text-center text-medium-emphasis">
      <v-progress-circular indeterminate color="primary" size="24" class="me-2" />
      Consultando acreditaciones bancarias...
    </div>

    <!-- Indicador de Error Técnico -->
    <div v-else-if="error" class="text-error py-3 text-center">
      {{ error }}
    </div>

    <!-- Contenido Unificado y Continuo (Sin Tabs) -->
    <template v-else>
      <!-- Planilla Resumen de Acreditaciones -->
      <v-row>
        <v-col cols="12" class="px-0">
          <ResumenAcred :cab="cab" :detalle="detalle" />
        </v-col>
      </v-row>

      <v-divider class="my-3"></v-divider>

      <!-- Detalle de Acreditaciones -->
      <v-row>
        <v-col cols="12" class="px-0">
          <ResumenAcredDetalle :cab="cab" :detalle="detalle" />
        </v-col>
      </v-row>

      <v-divider class="my-3"></v-divider>

      <!-- Archivo TXT para Banco -->
      <v-row>
        <v-col cols="12" class="px-0">
          <ArchAcred :cab="cab" :detalle="detalle" />
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>
