<script setup>
import { RepoHeader } from "@/shared/components";
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
    return `${d[1]}/${d[0]}`;
  }
  return null;
};

const getPeriodo = (per) => {
  if (per) {
    const p = per.split("-");
    return `${p[0]}_${p[1]}`;
  }
  return null;
};

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
      x.IMPORTE,
      x.CANTIDAD,
      x.BLOQ,
      x.ESLEY,
    ];
  });

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
    { wch: 10 },
    { wch: 10 },
    { wch: 25 },
    { wch: 15 },
  ];
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");

  writeFileXLSX(wb, `Resumen_Acred_${getPeriodo(store.periodoString) || store.liqCompactString}.xlsx`, {
    compression: true,
  });
}
</script>

<template>
  <v-container class="px-0">
    <RepoHeader title="Resumen Acreditaciones" :subtitle="store.liqString">
      <v-btn
        color="primary"
        :disabled="!data || data.length === 0"
        @click="exportFile"
      >
        Descargar
      </v-btn>
    </RepoHeader>

    <v-row class="ma-0">
      <div v-if="isPending" class="py-2 text-center text-medium-emphasis">
        <v-progress-circular indeterminate color="primary" size="20" class="me-2" />
        loading...
      </div>
      <div v-else-if="error" class="text-error py-2">
        No se puede obtener los datos solicitados.
      </div>
      <v-data-table
        v-else-if="data && data.length > 0"
        class="text-caption"
        hover
        density="compact"
        :items="data"
        :headers="headers"
        :items-per-page="10"
      >
        <template #item="{ item }">
          <tr class="pa-0 ma-0">
            <td class="text-right py-1">{{ getVto(item.PERIODO) }}</td>
            <td class="text-left py-1">{{ getVto(item.FECHADEV) }}</td>
            <td class="text-right py-1 font-weight-medium">{{ financial(item.IMPORTE) }}</td>
            <td class="text-right py-1">{{ item.CANTIDAD }}</td>
            <td class="text-left py-1">{{ item.BLOQ }}</td>
            <td class="text-left py-1">{{ item.ESLEY }}</td>
          </tr>
        </template>
      </v-data-table>
      <div v-else class="py-2 text-medium-emphasis">
        Sin datos para mostrar.
      </div>
    </v-row>
  </v-container>
</template>
