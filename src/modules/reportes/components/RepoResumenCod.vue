<script setup>
import { utils, writeFileXLSX } from "xlsx";
import { useFilterStore } from "@/stores/filterStore";
import { useFetch } from "@/composables/useFetch";
import { RepoHeader } from "@/shared/components";
import { financial, agregaTitulosExcel } from "@/utils/reportes.js";
import { useEndPoints } from "@/composables/useEndPoints";
import { ref } from "vue";

const { apiBase } = useEndPoints();

const store = useFilterStore();
const search = ref("");

function useResLiqCod(getId) {
  return useFetch(() => `${apiBase.value}/api/view/resumenCodLiq?${getId()}`);
}

const { data, error, isPending } = useResLiqCod(() => store.filterString);

const props = defineProps(["fileName"]);

const headers = [
  { title: "Rep", key: "IDREP", align: "start" },
  { title: "Codigo", key: "CODIGO", align: "end" },
  { title: "Subcodigo", key: "SUBCODIGO", align: "start" },
  { title: "Descripción", key: "DESCRIPCION", align: "start" },
  { title: "Cantidad", key: "CANTIDAD", align: "end" },
  { title: "Importe", key: "IMPORTE", align: "end" },
  { title: "Tipo total", key: "TIPOTOTAL", align: "end" },
];

function exportFile() {
  const map1 = data.value.map((x) => {
    return [
      x.IDREP,
      x.CODIGO,
      x.SUBCODIGO,
      x.DESCRIPCION,
      x.CANTIDAD,
      x.IMPORTE,
      x.TIPOTOTAL,
    ];
  });

  const titulosTabla = [
    "Rep",
    "Codigo",
    "Subcódigo",
    "Descripción",
    "Cantidad",
    "Importe",
    "TipoTotal",
  ];
  const filtros = store.liqString;
  const tituloReporte = "Resúmen de códigos por liquidación";
  agregaTitulosExcel(map1, tituloReporte, filtros, titulosTabla);
  const ws = utils.aoa_to_sheet(map1);
  ws["!cols"] = [
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 25 },
    { wch: 10 },
    { wch: 20 },
    { wch: 10 },
  ];
  /* create workbook and append worksheet */
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");

  /* export to XLSX */
  writeFileXLSX(
    wb,
    props.fileName || `${store.liqCompactString}_ResumenCodLiq.xlsx`,
    {
      compression: true,
    },
  );
}
</script>

<template>
  <v-container>
    <RepoHeader
      title="Resumen de códigos de liquidación"
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
            <td class="text-right ma-0 pa-0">{{ item.CODIGO }}</td>
            <td class="text-right">{{ item.SUBCODIGO }}</td>
            <td class="text-left">{{ item.DESCRIPCION }}</td>
            <td class="text-right">{{ item.CANTIDAD }}</td>
            <td class="text-right">{{ financial(item.IMPORTE) }}</td>
            <td class="text-right">{{ item.TIPOTOTAL }}</td>
          </tr>
        </template>
      </v-data-table>
      <v-alert v-else-if="error" type="error" variant="tonal" class="my-3 w-100">
        No se pudieron cargar los datos solicitados. Verifique el período o liquidación seleccionada.
      </v-alert>
    </v-row>
  </v-container>
</template>
