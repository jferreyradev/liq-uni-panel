<script setup>
import { ref, computed } from "vue";
import RepoHeader from "@/shared/components/RepoHeader.vue";
import { useFilterStore } from "@/stores/filterStore";

const props = defineProps({
  cab: {
    type: Object,
    default: null,
  },
  detalle: {
    type: Array,
    default: () => [],
  },
});

const store = useFilterStore();
const preview = ref(false);

const headers = [
  {
    title: "Cadena de Registro (Formato Banco)",
    align: "start",
    key: "CADENA",
  },
];

const lineasTXT = computed(() => {
  if (!props.detalle || props.detalle.length === 0) return [];
  return props.detalle.map((item) => {
    const orden = String(item.ORDEN || "").padStart(5, "0");
    const dni = String(item.DNI || "").padStart(11, "0");
    const cuenta = String(item.CUENTA || "").trim().padEnd(22, " ");
    const importeCentavos = Math.round(
      (Number(item.CUOTA) || Number(item.NETO) || 0) * 100
    );
    const importeStr = String(importeCentavos).padStart(12, "0");
    const nombre = `${item.APELLIDO || ""} ${item.NOMBRE || ""}`
      .trim()
      .substring(0, 30)
      .padEnd(30, " ");
    return {
      CADENA: `${orden} ${dni} ${cuenta} ${importeStr} ${nombre}`,
    };
  });
});

function downloadAcred() {
  if (!lineasTXT.value || lineasTXT.value.length === 0) return;

  const content = lineasTXT.value.map((l) => l.CADENA).join("\r\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const urlSalida = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = urlSalida;
  a.download = `Acreditacion_Banco_${store.liqCompactString || "archivo"}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(urlSalida);
}
</script>

<template>
  <v-container class="px-0">
    <RepoHeader title="Archivo TXT para Banco" :subtitle="store.liqString">
      <div class="d-flex align-center ga-2">
        <span
          v-if="cab && lineasTXT.length > 0"
          class="text-caption text-grey-darken-1 font-weight-medium me-2"
        >
          ({{ lineasTXT.length }} reg.)
        </span>
        <v-btn
          variant="tonal"
          color="primary"
          :prepend-icon="preview ? 'mdi-eye-off' : 'mdi-eye'"
          :disabled="!cab || lineasTXT.length === 0"
          @click="preview = !preview"
        >
          {{ preview ? 'Ocultar Previsualización' : 'Previsualizar' }}
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-download"
          :disabled="!cab || lineasTXT.length === 0"
          @click="downloadAcred"
        >
          Descargar TXT
        </v-btn>
      </div>
    </RepoHeader>

    <div v-if="!cab" class="py-2 text-medium-emphasis">
      No existen registros de archivo para {{ store.liqString }}.
    </div>

    <div v-else-if="preview && lineasTXT.length > 0" style="overflow-x: auto;">
      <v-data-table
        class="text-caption font-mono"
        hover
        density="compact"
        :items="lineasTXT"
        :headers="headers"
        :items-per-page="10"
      >
        <template v-slot:item="{ item }">
          <tr class="pa-0 ma-0">
            <td class="text-left font-mono py-1 text-no-wrap">{{ item.CADENA }}</td>
          </tr>
        </template>
      </v-data-table>
    </div>
  </v-container>
</template>
