<script setup>
import { utils, writeFileXLSX } from "xlsx";
import { useFilterStore } from "@/stores/filterStore";
import { useFetch } from "@/composables/useFetch";
import { RepoHeader } from "@/shared/components";
import { agregaTitulosExcel, getVto, getFecha } from "@/utils/reportes.js";
import { useEndPoints } from "@/composables/useEndPoints";
import { ref } from "vue";

const { apiBase } = useEndPoints();
const search = ref("");

const store = useFilterStore();

function useResLiqCod(getId) {
  return useFetch(() => `${apiBase.value}/api/view/bajasLey?${getId()}`);
}

const { data, error, isPending } = useResLiqCod(
  () => store.filterPeriodoString,
);

const props = defineProps(["fileName"]);

const headers = [
  { title: "Documento", key: "DOCUMENTO", align: "center" },
  {
    title: "Apellido y Nombre",
    key: "APENOM",
    align: "start",
  },
  { title: "Sexo", key: "SEXO", align: "center" },
  { title: "Fecha. Nac.", key: "FECHANAC", align: "center" },
  { title: "Edad", key: "EDAD", align: "center" },
  { title: "Periodo", key: "PERIODO", align: "center" },
];

function exportFile() {
  const map1 = data.value.map((x) => {
    return [
      x.DOCUMENTO,
      x.APENOM,
      x.SEXO,
      getFecha(x.FECHANAC),
      x.EDAD,
      getVto(x.PERIODO),
    ];
  });

  const titulosTabla = [
    "Documento",
    "Apellido y Nombre",
    "Sexo",
    "Fecha Nac.",
    "Edad",
    "Período",
  ];
  const filtros = store.periodoString;
  const tituloReporte = "Bajas de Ley";
  agregaTitulosExcel(map1, tituloReporte, filtros, titulosTabla);
  const ws = utils.aoa_to_sheet(map1);
  ws["!cols"] = [
    { wch: 10 },
    { wch: 25 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
  ];
  /* create workbook and append worksheet */
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");

  /* export to XLSX */
  writeFileXLSX(
    wb,
    props.fileName || `${store.liqCompactString}_BajasLey.xlsx`,
    {
      compression: true,
    },
  );
}
</script>

<template>
  <v-container>
    <RepoHeader
      title="Bajas de Ley"
      :subtitle="store.periodoString"
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
            <td class="text-center">{{ item.DOCUMENTO }}</td>
            <td class="text-left ma-0 pa-0">{{ item.APENOM }}</td>
            <td class="text-center">{{ item.SEXO }}</td>
            <td class="text-denter">{{ getFecha(item.FECHANAC) }}</td>
            <td class="text-center">{{ item.EDAD }}</td>
            <td class="text-center">{{ getVto(item.PERIODO) }}</td>
          </tr>
        </template>
      </v-data-table>
      <v-alert v-else-if="error" type="error" variant="tonal" class="my-3 w-100">
        No se pudieron cargar los datos solicitados. Verifique el período o liquidación seleccionada.
      </v-alert>
    </v-row>
  </v-container>
</template>
