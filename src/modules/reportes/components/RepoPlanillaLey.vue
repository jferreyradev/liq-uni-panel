<script setup>
import { utils, writeFileXLSX } from "xlsx";
import { useFilterStore } from "@/stores/filterStore";
import { useFetch } from "@/composables/useFetch";
import { RepoHeader } from "@/shared/components";
import { financial, getVto, agregaTitulosExcel } from "@/utils/reportes.js";
import { computed, ref } from "vue";
const store = useFilterStore();
const search = ref("");

import { useEndPoints } from "@/composables/useEndPoints";

const { apiBase } = useEndPoints();

function useResLiqCod(getId) {
  return useFetch(() => `${apiBase.value}/api/view/planillaLey?${getId()}`);
}

const { data, error, isPending } = useResLiqCod(() => store.filterString);

const sortedData = computed(() => {
  if (!data.value || !Array.isArray(data.value)) return [];
  return [...data.value].sort((a, b) => {
    return (
      (Number(a.IDREP) || 0) - (Number(b.IDREP) || 0) ||
      (Number(a.ORDEN) || 0) - (Number(b.ORDEN) || 0) ||
      String(a.FECHADEV || "").localeCompare(String(b.FECHADEV || ""))
    );
  });
});

const totImporte = computed(() => {
  let totImp = 0;
  if (sortedData.value) {
    sortedData.value.forEach((x) => {
      totImp += x.IMPORTE;
    });
  }

  return { totImp };
});

const props = defineProps(["title", "subtitle", "fileName"]);

const headers = [
  {
    title: "Rep",
    align: "start",
    key: "IDREP",
  },
  {
    title: "Orden",
    align: "start",
    key: "ORDEN",
  },
  {
    title: "DNI",
    align: "start",
    key: "DOCUMENTO",
  },
  { title: "Apellido y nombre", key: "APENOM" },
  { title: "Descripción", key: "DESCRIPCION" },
  { title: "Importe", key: "IMPORTE" },
  { title: "Fecha Dev", key: "FECHADEV" },
];

function exportFile() {
  const map1 = sortedData.value.map((x) => {
    return [
      x.IDREP,
      x.ORDEN,
      x.DOCUMENTO,
      x.APENOM,
      x.DESCRIPCION,
      x.IMPORTE,
      getVto(x.FECHADEV),
    ];
  });

  const titulosTabla = [
    "Rep",
    "Orden",
    "Documento",
    "Apellido y Nombre",
    "Descripción",
    "Importe",
    "Fecha Dev.",
  ];
  const totalesTabla = [
    null,
    null,
    null,
    null,
    null,
    totImporte.value.totImp,
    null,
  ];
  map1.push(totalesTabla);
  const filtros = store.liqString;
  const tituloReporte = "Planilla de Ley";
  agregaTitulosExcel(map1, tituloReporte, filtros, titulosTabla);
  const ws = utils.aoa_to_sheet(map1);

  ws["!cols"] = [
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
    { wch: 35 },
    { wch: 20 },
    { wch: 15 },
    { wch: 10 },
  ];
  /* create workbook and append worksheet */
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");

  /* export to XLSX */
  writeFileXLSX(
    wb,
    props.fileName || `${store.liqCompactString}_PlanillaLey.xlsx`,
    {
      compression: true,
    },
  );
}
</script>

<template>
  <v-container>
    <RepoHeader
      title="Planilla de Ley"
      :subtitle="store.liqString"
      v-model:search="search"
    >
      <v-btn color="primary" :disabled="!data" @click="exportFile"
        >Descargar</v-btn
      >
    </RepoHeader>
    <v-row>
      <div v-if="isPending" class="d-flex align-center justify-center w-100 py-8 text-medium-emphasis">
        <v-progress-circular indeterminate color="primary" class="me-2" size="24" />
        <span>Cargando datos del reporte...</span>
      </div>
      <v-data-table
        v-else-if="data"
        class="text-caption"
        hover
        density="compact"
        :items="sortedData"
        :headers="headers"
        :search="search"
      >
        <template #item="{ item }">
          <tr class="pa-0 ma-0">
            <td class="text-right">{{ item.IDREP }}</td>
            <td class="text-right">{{ item.ORDEN }}</td>
            <td class="text-right">{{ item.DOCUMENTO }}</td>
            <td class="text-left">{{ item.APENOM }}</td>
            <td class="text-left">{{ item.DESCRIPCION }}</td>
            <td class="text-right">{{ financial(item.IMPORTE) }}</td>
            <td class="text-center">{{ getVto(item.FECHADEV) }}</td>
          </tr>
        </template>
        <template #[`body.append`]>
          <tr>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th class="text-right">{{ financial(totImporte.totImp) }}</th>
          </tr>
        </template>
      </v-data-table>
      <v-alert v-else-if="error" type="error" variant="tonal" class="my-3 w-100">
        No se pudieron cargar los datos solicitados. Verifique el período o liquidación seleccionada.
      </v-alert>
    </v-row>
  </v-container>
</template>
