<script setup>
import { utils, writeFileXLSX } from "xlsx";
import { useFilterStore } from "@/stores/filterStore";
import { useFetch } from "@/composables/useFetch";
import { RepoHeader } from "@/shared/components";
import { financial, agregaTitulosExcel } from "@/utils/reportes.js";
import { computed, ref } from "vue";
import { useEndPoints } from "@/composables/useEndPoints";

const { apiBase } = useEndPoints();
const search = ref("");

const totImporte = computed(() => {
  let totPatJub = 0;
  let totPatOS = 0;
  let totPatART = 0;
  if (data.value) {
    data.value.forEach((x) => {
      totPatJub += x.PATJUB;
      totPatOS += x.PATOS;
      totPatART += x.PATART;
    });
  }

  return { totPatJub, totPatOS, totPatART };
});

const store = useFilterStore();

function useResLiqCod(getId) {
  return useFetch(() => `${apiBase.value}/api/view/aportesPat?${getId()}`);
}

const { data, error, isPending } = useResLiqCod(() => store.filterString);

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
  { title: "Pat. Jub.", key: "PATJUB" },
  { title: "Pat. OS", key: "PATOS" },
  { title: "Pat. ART", key: "PATART" },
];

function exportFile() {
  const map1 = data.value.map((x) => [
    x.IDREP,
    x.ORDEN,
    x.DOCUMENTO,
    x.APENOM,
    x.PATJUB,
    x.PATOS,
    x.PATART,
  ]);
  const titulosTabla = [
    "Rep",
    "Orden",
    "Documento",
    "Apellido y Nombre",
    "Pat. Jub",
    "Pat. OS",
    "Pat. ART",
  ];
  const totalesTabla = [
    null,
    null,
    null,
    null,
    totImporte.value.totPatJub,
    totImporte.value.totPatOS,
    totImporte.value.totPatART,
  ];
  map1.push(totalesTabla);
  const filtros = store.liqString;
  const tituloReporte = "Aportes Patronales";
  agregaTitulosExcel(map1, tituloReporte, filtros, titulosTabla);
  const ws = utils.aoa_to_sheet(map1);

  ws["!cols"] = [
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
    { wch: 35 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ];

  /* create workbook and append worksheet */
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");

  /* export to XLSX */
  writeFileXLSX(
    wb,
    props.fileName || `${store.liqCompactString}_ResumenPatJub.xlsx`,
    {
      compression: true,
    },
  );
}
</script>

<template>
  <v-container>
    <RepoHeader
      title="Resumen de Aportes Patromales"
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
        :items="data"
        :headers="headers"
        :search="search"
      >
        <template #item="{ item }">
          <tr class="pa-0 ma-0">
            <td class="text-right">{{ item.IDREP }}</td>
            <td class="text-right">{{ item.ORDEN }}</td>
            <td class="text-right">{{ item.DOCUMENTO }}</td>
            <td class="text-left">{{ item.APENOM }}</td>
            <td class="text-right">{{ financial(item.PATJUB) }}</td>
            <td class="text-right">{{ financial(item.PATOS) }}</td>
            <td class="text-right">{{ financial(item.PATART) }}</td>
          </tr>
        </template>
        <template #[`body.append`]>
          <tr>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th class="text-right">{{ financial(totImporte.totPatJub) }}</th>
            <th class="text-right">{{ financial(totImporte.totPatOS) }}</th>
            <th class="text-right">{{ financial(totImporte.totPatART) }}</th>
          </tr>
        </template>
      </v-data-table>
      <v-alert v-else-if="error" type="error" variant="tonal" class="my-3 w-100">
        No se pudieron cargar los datos solicitados. Verifique el período o liquidación seleccionada.
      </v-alert>
    </v-row>
  </v-container>
</template>
