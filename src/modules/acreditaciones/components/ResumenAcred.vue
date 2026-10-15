<script setup>
import { computed } from "vue";
import RepoHeader from "@/shared/components/RepoHeader.vue";
import { useFilterStore } from "@/stores/filterStore";
import { useEndPoints } from "@/composables/useEndPoints";
import { useFetch } from "@/composables/useFetch";
import { financial, agregaTitulosExcel } from "@/utils/reportes.js";
import { utils, writeFileXLSX } from "xlsx";

const { apiBase, getBoletasHeaders, buildApiHeaders } = useEndPoints();
const store = useFilterStore();

function useResumenAcred(getId) {
  const headersFn = buildApiHeaders || getBoletasHeaders || (() => ({}));
  return useFetch(
    () => `${apiBase.value}/api/view/resumenAcred?${getId()}`,
    () => ({ headers: headersFn() })
  );
}

const { data, error, isPending } = useResumenAcred(() => store.filterStringLey);

const getVto = (vto) => {
  if (vto) {
    const d = vto.split("-");
    if (d.length >= 2) {
      return `${d[1]}/${d[0]}`;
    }
    return vto;
  }
  return null;
};

const totalImporte = computed(() => {
  if (!data.value || !Array.isArray(data.value)) return 0;
  return data.value.reduce((sum, item) => sum + (Number(item.IMPORTE) || 0), 0);
});

const totalCantidad = computed(() => {
  if (!data.value || !Array.isArray(data.value)) return 0;
  return data.value.reduce((sum, item) => sum + (Number(item.CANTIDAD) || 0), 0);
});

const headers = [
  {
    title: "Periodo",
    align: "start",
    key: "PERIODO",
  },
  {
    title: "Fecha dev",
    align: "start",
    key: "FECHADEV",
  },
  {
    title: "Importe",
    align: "end",
    key: "IMPORTE",
  },
  {
    title: "Cantidad",
    align: "end",
    key: "CANTIDAD",
  },
  {
    title: "Bloqueo",
    align: "start",
    key: "BLOQ",
  },
  {
    title: "Es Ley",
    align: "start",
    key: "ESLEY",
  },
];

function exportFile() {
  if (!data.value || data.value.length === 0) return;

  const map1 = data.value.map((x) => {
    return [
      getVto(x.PERIODO),
      getVto(x.FECHADEV),
      Number(x.IMPORTE) || 0,
      Number(x.CANTIDAD) || 0,
      x.BLOQ,
      x.ESLEY,
    ];
  });

  if (map1.length > 0) {
    map1.push([null, "TOTAL", totalImporte.value, totalCantidad.value, null, null]);
  }

  const titulosTabla = [
    "Periodo",
    "Fecha dev",
    "Importe",
    "Cantidad",
    "Bloqueo",
    "Es Ley",
  ];
  const filtros = store.liqString;
  const tituloReporte = "Resumen Acreditaciones";
  agregaTitulosExcel(map1, tituloReporte, filtros, titulosTabla);
  const ws = utils.aoa_to_sheet(map1);

  ws["!cols"] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 25 },
    { wch: 15 },
  ];
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Acreditaciones");

  writeFileXLSX(wb, `${store.liqCompactString}_Acreditaciones.xlsx`, {
    compression: true,
  });
}
</script>

<template>
  <v-container class="px-0">
    <RepoHeader title="Planilla de Acreditaciones" :subtitle="store.liqString">
      <div class="d-flex align-center ga-2">
        <span v-if="data && data.length > 0" class="text-caption text-grey-darken-1 font-weight-medium me-2">
          Total: ${{ financial(totalImporte) }} ({{ totalCantidad }} reg.)
        </span>
        <v-btn
          color="primary"
          prepend-icon="mdi-file-excel"
          :disabled="!data || data.length === 0"
          @click="exportFile"
        >
          Exportar Excel
        </v-btn>
      </div>
    </RepoHeader>

    <div v-if="isPending" class="py-2 text-center text-medium-emphasis">
      <v-progress-circular indeterminate color="primary" size="20" class="me-2" />
      Cargando resumen de acreditaciones...
    </div>

    <div v-else-if="error" class="text-error py-2">
      No se pudo obtener el resumen de acreditaciones.
    </div>

    <div v-else-if="!data || data.length === 0" class="py-2 text-medium-emphasis">
      No existen acreditaciones registradas para el filtro seleccionado.
    </div>

    <v-data-table
      v-else
      class="text-caption"
      hover
      density="compact"
      :items="data"
      :headers="headers"
      :items-per-page="10"
    >
      <template v-slot:item="{ item }">
        <tr class="pa-0 ma-0">
          <td class="text-left py-1">{{ getVto(item.PERIODO) }}</td>
          <td class="text-left py-1">{{ getVto(item.FECHADEV) }}</td>
          <td class="text-right py-1 font-weight-medium">{{ financial(item.IMPORTE) }}</td>
          <td class="text-right py-1">{{ item.CANTIDAD }}</td>
          <td class="text-left py-1">{{ item.BLOQ }}</td>
          <td class="text-left py-1">{{ item.ESLEY }}</td>
        </tr>
      </template>
    </v-data-table>
  </v-container>
</template>
