<script setup>
import { utils, writeFileXLSX } from "xlsx";
import { useFilterStore } from "@/stores/filterStore";
import { useFetch } from "@/composables/useFetch";
import { RepoHeader } from "@/shared/components";
import { agregaTitulosExcel } from "@/utils/reportes.js";
import { useEndPoints } from "@/composables/useEndPoints";
import { ref } from "vue";

const { apiBase } = useEndPoints();

const store = useFilterStore();
const search = ref("");

function useResLiqCod(getId) {
  return useFetch(() => {
    const q = getId ? getId() : "";
    const filter = q ? `${q}&` : "";
    return `${apiBase.value}/api/view/retencionesCargo?${filter}sort={"IdRep":"asc","Orden":"asc"}`;
  });
}

const { data, error, isPending } = useResLiqCod(() => "");

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
    title: "Afiliado",
    align: "start",
    key: "AFILIADO",
  },
  { title: "Categoría", key: "CATEGORIA" },
  { title: "Sit. Rev.", key: "SITREV" },
  {
    title: "DNI",
    align: "start",
    key: "DOCUMENTO",
  },
  { title: "Apellido y nombre", key: "APENOM" },
];

function exportFile() {
  const map1 = data.value.map((x) => {
    return [
      x.IDREP,
      x.ORDEN,
      x.AFILIADO,
      x.CATEGORIA,
      x.SITREV,
      x.DOCUMENTO,
      x.APENOM,
    ];
  });

  const titulosTabla = [
    "Rep",
    "Orden",
    "Afiliado",
    "Categoría",
    "Sit. de Rev.",
    "Documento",
    "Apellido y Nombre",
  ];
  const filtros = store.liqString;
  const tituloReporte = "Retenciones de Cargo";
  agregaTitulosExcel(map1, tituloReporte, filtros, titulosTabla);
  const ws = utils.aoa_to_sheet(map1);

  ws["!cols"] = [
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
    { wch: 35 },
  ];
  /* create workbook and append worksheet */
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");

  /* export to XLSX */
  writeFileXLSX(
    wb,
    props.fileName || `${store.liqCompactString}_RetencionesCargo.xlsx`,
    {
      compression: true,
    },
  );
}
</script>

<template>
  <v-container>
    <RepoHeader
      title="Retenciones de Cargo"
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
            <td class="text-right">{{ item.AFILIADO }}</td>
            <td class="text-center">{{ item.CATEGORIA }}</td>
            <td class="text-center">{{ item.SITREV }}</td>
            <td class="text-right">{{ item.DOCUMENTO }}</td>
            <td class="text-left">{{ item.APENOM }}</td>
          </tr>
        </template>
      </v-data-table>
      <v-alert v-else-if="error" type="error" variant="tonal" class="my-3 w-100">
        No se pudieron cargar los datos solicitados. Verifique el período o liquidación seleccionada.
      </v-alert>
    </v-row>
  </v-container>
</template>
