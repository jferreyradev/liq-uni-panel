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
      `${apiBase.value}/api/view/planillaRet?${getId()}&sort={"IdRep":"asc","Orden":"asc","Codigo":"asc","SubCodigo":"asc"}`,
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
  { title: "Código", key: "CODIGO" },
  { title: "SubCod.", key: "SUBCODIGO" },
  { title: "Descripción", key: "DESCRIPCION" },
  { title: "Vto", key: "VTO" },
  { title: "Clase", key: "CLASE" },
  { title: "Dias", key: "DIAS" },
  { title: "Importe", key: "IMPORTE" },
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
      getVto(x.VTO),
      x.CLASE,
      x.DIAS,
      x.IMPORTE,
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
    "Vencimiento",
    "Clase",
    "Dias",
    "Importe",
  ];
  const totalesTabla = [
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    totImporte.value.totImp,
  ];
  map1.push(totalesTabla);
  const filtros = store.liqString;
  const tituloReporte = "Planilla Retenciones";
  agregaTitulosExcel(map1, tituloReporte, filtros, titulosTabla);
  const ws = utils.aoa_to_sheet(map1);

  ws["!cols"] = [
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
    { wch: 35 },
    { wch: 10 },
    { wch: 10 },
    { wch: 20 },
    { wch: 10 },
    { wch: 5 },
    { wch: 5 },
    { wch: 15 },
  ];
  /* create workbook and append worksheet */
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");

  /* export to XLSX */
  writeFileXLSX(
    wb,
    props.fileName || `${store.liqCompactString}_PlanillaRet.xlsx`,
    {
      compression: true,
    },
  );
}
</script>

<template>
  <v-container>
    <RepoHeader
      title="Planilla de Retenciones"
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
            <td class="text-left">{{ getVto(item.VTO) }}</td>
            <td class="text-right">{{ item.CLASE }}</td>
            <td class="text-right">{{ item.DIAS }}</td>
            <td class="text-right">{{ financial(item.IMPORTE) }}</td>
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
