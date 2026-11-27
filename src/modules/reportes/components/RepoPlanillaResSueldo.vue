<script setup>
import { utils, writeFileXLSX } from "xlsx";
import { useFilterStore } from "@/stores/filterStore";
import { useFetch } from "@/composables/useFetch";
import { RepoHeader } from "@/shared/components";
import { financial, agregaTitulosExcel } from "@/utils/reportes.js";
import { computed, ref } from "vue";
import { useEndPoints } from "@/composables/useEndPoints";

const { apiBase } = useEndPoints();

const store = useFilterStore();
const search = ref("");

function useResLiqCod(getId) {
  return useFetch(() => `${apiBase.value}/api/view/resumenSueldos?${getId()}`);
}

const { data, error, isPending } = useResLiqCod(() => store.filterString);

const totImporte = computed(() => {
  let totHabCA = 0;
  let totHabSA = 0;
  let totAsigFam = 0;
  let totDescLey = 0;
  let totDesVarios = 0;
  let totNeto = 0;
  if (data.value) {
    data.value.forEach((x) => {
      totHabCA += x.HABCONAP;
      totHabSA += x.HABSINAP;
      totAsigFam += x.ASIGNFAM;
      totDescLey += x.DESCLEY;
      totDesVarios += x.DESCVARIOS;
      totNeto += x.NETO;
    });
  }

  return { totHabCA, totHabSA, totAsigFam, totDescLey, totDesVarios, totNeto };
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
  { title: "Mes Liq.", key: "MESLIQ" },
  { title: "Categoría", key: "CAT" },
  { title: "Hab. c/Ap.", key: "HABCONAP" },
  { title: "Hab. S/Ap.", key: "HABSINAP" },
  { title: "Asig. Fam.", key: "ASIGNFAM" },
  { title: "Desc. Ley", key: "DESCLEY" },
  { title: "Desc. Varios", key: "DESCVARIOS" },
  { title: "Neto", key: "NETO" },
];

function exportFile() {
  const map1 = data.value.map((x) => {
    return [
      x.IDREP,
      x.ORDEN,
      x.DOCUMENTO,
      x.APENOM,
      x.MESLIQ,
      x.CAT,
      x.HABCONAP,
      x.HABSINAP,
      x.ASIGNFAM,
      x.DESCLEY,
      x.DESCVARIOS,
      x.NETO,
    ];
  });

  const titulosTabla = [
    "Rep",
    "Orden",
    "Documento",
    "Apellido y Nombre",
    "Mes Liq.",
    "categoría",
    "Hab. con Ap.",
    "Hab. sin Ap.",
    "Asign. Fam.",
    "Desc. de Ley",
    "Desc. varios",
    "Neto",
  ];
  const totalesTabla = [
    null,
    null,
    null,
    null,
    null,
    null,
    totImporte.value.totHabCA,
    totImporte.value.totHabSA,
    totImporte.value.totAsigFam,
    totImporte.value.totDescLey,
    totImporte.value.totDesVarios,
    totImporte.value.totNeto,
  ];
  map1.push(totalesTabla);
  const filtros = store.liqString;
  const tituloReporte = "Resumen de Sueldos";
  agregaTitulosExcel(map1, tituloReporte, filtros, titulosTabla);
  const ws = utils.aoa_to_sheet(map1);

  ws["!cols"] = [
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
    { wch: 35 },
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
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
    props.fileName || `${store.liqCompactString}_ResumenSueldos.xlsx`,
    {
      compression: true,
    },
  );
}
</script>

<template>
  <v-container>
    <RepoHeader
      title="Resumen de Sueldos"
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
            <td class="text-right">{{ item.MESLIQ }}</td>
            <td class="text-center">{{ item.CAT }}</td>
            <td class="text-right">{{ financial(item.HABCONAP) }}</td>
            <td class="text-right">{{ financial(item.HABSINAP) }}</td>
            <td class="text-right">{{ financial(item.ASIGNFAM) }}</td>
            <td class="text-right">{{ financial(item.DESCLEY) }}</td>
            <td class="text-right">{{ financial(item.DESCVARIOS) }}</td>
            <td class="text-right">{{ financial(item.NETO) }}</td>
          </tr>
        </template>
        <template #[`body.append`]>
          <tr>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th class="text-right">{{ financial(totImporte.totHabCA) }}</th>
            <th class="text-right">{{ financial(totImporte.totHabSA) }}</th>
            <th class="text-right">{{ financial(totImporte.totAsigFam) }}</th>
            <th class="text-right">{{ financial(totImporte.totDescLey) }}</th>
            <th class="text-right">{{ financial(totImporte.totDesVarios) }}</th>
            <th class="text-right">{{ financial(totImporte.totNeto) }}</th>
          </tr>
        </template>
      </v-data-table>
      <v-alert v-else-if="error" type="error" variant="tonal" class="my-3 w-100">
        No se pudieron cargar los datos solicitados. Verifique el período o liquidación seleccionada.
      </v-alert>
    </v-row>
  </v-container>
</template>
