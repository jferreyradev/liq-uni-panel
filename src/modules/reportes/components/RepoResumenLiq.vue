<script setup>
import { utils, writeFileXLSX } from "xlsx";
import { useFetch } from "@/composables/useFetch";
import { useFilterStore } from "@/stores/filterStore";
import { RepoHeader } from "@/shared/components";
import { useEndPoints } from "@/composables/useEndPoints";
import { financial } from "@/utils/reportes.js";
import { ref } from "vue";

const { apiBase } = useEndPoints();

const store = useFilterStore();
const search = ref("");

function useResLiq(getId) {
  return useFetch(() => `${apiBase.value}/api/repo/resumenLiq?${getId()}`);
}

const { data, error, isPending } = useResLiq(() => store.filterString);

const props = defineProps(["title", "subtitle", "fileName"]);

const headers = [
  {
    title: "Rep",
    align: "end",
    key: "IDREP",
  },
  {
    title: "Orden",
    align: "end",
    key: "ORDEN",
  },
  { title: "DNI", key: "PERSONADOCUMENTO", align: "end" },
  { title: "Apellido", key: "PERSONAAPELLIDO", align: "start" },
  { title: "Nombre", key: "PERSONANOMBRE", align: "start" },
  { title: "Sujeto a aporte", key: "SUJETOAPORTE", align: "end" },
  { title: "Exento de aporte", key: "EXCENTOAPORTE", align: "end" },
  { title: "Descuentos de ley", key: "DESCUENTOSLEY", align: "end" },
  { title: "Descuentos varios", key: "DESCUENTOSVARIOS", align: "end" },
  { title: "Neto", key: "NETO", align: "end" },
];

function exportFile() {
  const map1 = data.value.map((x) => {
    return {
      REP: x.IDREP,
      ORDEN: x.ORDEN,
      DNI: x.PERSONADOCUMENTO,
      Apellido: x.PERSONAAPELLIDO,
      Nombre: x.PERSONANOMBRE,
      "Sujeto a aporte": x.SUJETOAPORTE,
      "Exento a aporte": x.EXCENTOAPORTE,
      "Descuentos de ley": x.DESCUENTOSLEY,
      "Descuentos varios": x.DESCUENTOSVARIOS,
      Neto: x.NETO,
    };
  });

  /* generate worksheet from state */
  const ws = utils.json_to_sheet(map1);
  ws["!cols"] = [
    { wch: 7 },
    { wch: 7 },
    { wch: 11 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
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
    props.fileName || `${store.liqCompactString}_ResumenLiq.xlsx`,
    {
      compression: true,
    },
  );
}
</script>

<template>
  <v-container>
    <RepoHeader
      title="Resumen de liquidación"
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
            <td class="text-right ma-0 pa-0">{{ item.ORDEN }}</td>
            <td class="text-right">{{ item.PERSONADOCUMENTO }}</td>
            <td class="text-left">{{ item.PERSONAAPELLIDO }}</td>
            <td class="text-left">{{ item.PERSONANOMBRE }}</td>
            <td class="text-right">{{ financial(item.SUJETOAPORTE) }}</td>
            <td class="text-right">{{ financial(item.EXCENTOAPORTE) }}</td>
            <td class="text-right">{{ financial(item.DESCUENTOSLEY) }}</td>
            <td class="text-right">{{ financial(item.DESCUENTOSVARIOS) }}</td>
            <td class="text-right">{{ financial(item.NETO) }}</td>
          </tr>
        </template>
      </v-data-table>
      <v-alert v-else-if="error" type="error" variant="tonal" class="my-3 w-100">
        No se pudieron cargar los datos solicitados. Verifique el período o liquidación seleccionada.
      </v-alert>
    </v-row>
  </v-container>
</template>
