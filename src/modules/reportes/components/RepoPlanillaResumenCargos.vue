<script setup>
import { utils, writeFileXLSX } from "xlsx";
import { useFilterStore } from "@/stores/filterStore";
import { useFetch } from "@/composables/useFetch";
import { RepoHeader } from "@/shared/components";
import { getFecha, getVto, agregaTitulosExcel } from "@/utils/reportes.js";
import { useEndPoints } from "@/composables/useEndPoints";
import { ref } from "vue";

const { apiBase } = useEndPoints();

const store = useFilterStore();
const search = ref("");

function useResLiqCod(getId) {
  return useFetch(() => `${apiBase.value}/api/view/resumenCargos?${getId()}`);
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
  {
    title: "CUIL",
    align: "start",
    key: "PERSONACUIL",
  },
  { title: "Apellido", key: "APELLIDO" },
  { title: "Nombre", key: "NOMBRE" },
  { title: "Nacimiento", key: "FECHANAC" },
  { title: "Sexo", key: "SEXO" },
  { title: "Categoria", key: "CATEGORIA" },
  { title: "SitRev", key: "SITUACIONREVISTAID" },
  { title: "Titulo", key: "TITULO" },
  { title: "Titulo Esp", key: "TITULOESPECIAL" },
  { title: "Antiguedad", key: "ANTIGUEDAD" },
  { title: "Vto Esc.", key: "VTOESCALAFON" },
];

function exportFile() {
  const map1 = data.value.map((x) => {
    return [
      x.IDREP,
      x.ORDEN,
      x.DOCUMENTO,
      x.PERSONACUIL,
      x.APELLIDO,
      x.NOMBRE,
      getFecha(x.FECHANAC),
      x.SEXO,
      x.CATEGORIA,
      x.SITUACIONREVISTAID,
      x.TITULO,
      x.TITULOESPECIAL,
      x.ANTIGUEDAD,
      getVto(x.VTOESCALAFON),
    ];
  });

  const titulosTabla = [
    "Rep",
    "Orden",
    "Documento",
    "Cuil",
    "Apellido",
    "Nombre",
    "Nacimiento",
    "Sexo",
    "Categoria",
    "SitRev",
    "Titulo",
    "Titulo Esp.",
    "Antiguedad",
    "Vto. Esc.",
  ];

  const filtros = store.liqString;
  const tituloReporte = "Planilla resumen de cargos";
  agregaTitulosExcel(map1, tituloReporte, filtros, titulosTabla);
  const ws = utils.aoa_to_sheet(map1);

  ws["!cols"] = [
    { wch: 5 },
    { wch: 5 },
    { wch: 10 },
    { wch: 12 },
    { wch: 15 },
    { wch: 20 },
    { wch: 10 },
    { wch: 5 },
    { wch: 7 },
    { wch: 5 },
    { wch: 7 },
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
    props.fileName || `${store.liqCompactString}_ResumenCargos.xlsx`,
    {
      compression: true,
    },
  );
}
</script>

<template>
  <v-container>
    <RepoHeader
      title="Planilla resumen de cargos"
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
            <td class="text-right">{{ item.PERSONACUIL }}</td>
            <td class="text-left">{{ item.APELLIDO }}</td>
            <td class="text-left">{{ item.NOMBRE }}</td>
            <td class="text-right">{{ getFecha(item.FECHANAC) }}</td>
            <td class="text-right">{{ item.SEXO }}</td>
            <td class="text-left">{{ item.CATEGORIA }}</td>
            <td class="text-left">{{ item.SITUACIONREVISTAID }}</td>
            <td class="text-right">{{ item.TITULO }}</td>
            <td class="text-right">{{ item.TITULOESPECIAL }}</td>
            <td class="text-right">{{ item.ANTIGUEDAD }}</td>
            <td class="text-left">{{ getVto(item.VTOESCALAFON) }}</td>
          </tr>
        </template>
      </v-data-table>
      <v-alert v-else-if="error" type="error" variant="tonal" class="my-3 w-100">
        No se pudieron cargar los datos solicitados. Verifique el período o liquidación seleccionada.
      </v-alert>
    </v-row>
  </v-container>
</template>
