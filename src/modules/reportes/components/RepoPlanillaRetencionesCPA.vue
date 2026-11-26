<script setup>
import { utils, writeFileXLSX } from "xlsx";
import { useFilterStore } from "@/stores/filterStore";
import { useFetch } from "@/composables/useFetch";
import { RepoHeader } from "@/shared/components";
import { financial, getVto, agregaTitulosExcel } from "@/utils/reportes.js";
import { computed, ref } from "vue";
import { useEndPoints } from "@/composables/useEndPoints";

const { apiBase } = useEndPoints();

const store = useFilterStore();
const search = ref("");

function useResLiqCod(getId) {
  return useFetch(
    () =>
      `${apiBase.value}/api/view/planillaRetCPA?${getId()}&sort={"IdRep":"asc","Orden":"asc","Periodo":"asc"}`,
  );
}

const { data, error, isPending } = useResLiqCod(() => store.filterString);

const totImporte = computed(() => {
  var totImp = 0;
  if (data.value) {
    data.value.forEach((x) => {
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
  { title: "Código", key: "CODIGO", align: "center" },
  { title: "Subcódigo", key: "SUBCODIGO", align: "center" },
  { title: "Descripción", key: "DESCRIPCION" },
  { title: "Importe", key: "IMPORTE", align: "end" },
  { title: "Vto", key: "vto", align: "end" },
];

function handleDownload() {
  console.log("download");
  exportFile();
}

function exportFile() {
  const map1 = data.value.map((x) => {
    return [
      x.IDREP,
      x.ORDEN,
      x.DOCUMENTO,
      x.APENOM,
      x.CODIGO,
      x.SUBCODIGO,
      x.DESCRIPCION,
      x.IMPORTE,
      getVto(x.VTO),
    ];
  });
  const titulosTabla = [
    "Rep",
    "Orden",
    "Documento",
    "Apellido y Nombre",
    "Código",
    "Subcódigo",
    "Descripción",
    "Importe",
    "Vto",
  ];
  const totalesTabla = [
    null,
    null,
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
  const tituloReporte = "Resumen de códigos de retención CPA";
  agregaTitulosExcel(map1, tituloReporte, filtros, titulosTabla);

  const ws = utils.aoa_to_sheet(map1);

  ws["!cols"] = [
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 35 },
    { wch: 15 },
    { wch: 15 },
    { wch: 35 },
    { wch: 20 },
    { wch: 10 },
  ];
  /* create workbook and append worksheet */
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");

  /* export to XLSX */
  writeFileXLSX(
    wb,
    props.fileName || `${store.liqCompactString}_PlanillasRetCPA.xlsx`,
    {
      compression: true,
    },
  );
}
</script>

<template>
  <v-container>
    <RepoHeader
      title="Resumen de códigos de retención CPA"
      :subtitle="store.liqString"
      v-model:search="search"
    >
      <v-btn color="primary" :disabled="!data" @click="handleDownload"
        >Descargar</v-btn
      >
    </RepoHeader>
    <v-row>
      <div v-if="isPending">loading...</div>
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
            <td class="text-right">{{ item.CODIGO }}</td>
            <td class="text-right">{{ item.SUBCODIGO }}</td>
            <td class="text-left">{{ item.DESCRIPCION }}</td>
            <td class="text-right">{{ financial(item.IMPORTE) }}</td>
            <td class="text-center">{{ getVto(item.VTO) }}</td>
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
            <th></th>
            <th class="text-right">{{ financial(totImporte.totImp) }}</th>
          </tr>
        </template>
      </v-data-table>

      <div v-else-if="error">No se puede obtener los datos solicitados.</div>
    </v-row>
  </v-container>
</template>
