<script setup>
import { utils, writeFileXLSX } from "xlsx";
import { useFilterStore } from "@/stores/filterStore";
import { useFetch } from "@/composables/useFetch";
import { RepoHeader } from "@/shared/components";
import { useEndPoints } from "@/composables/useEndPoints";
import { ref } from "vue";

const { apiBase } = useEndPoints();

const store = useFilterStore();
const search = ref("");

function useResLiqCod(getId) {
  return useFetch(
    () =>
      `${apiBase.value}/api/view/resumenCodigo?${getId()}&Codigo=153&SubCodigo=0`,
  );
}

const { data, error, isPending } = useResLiqCod(() => store.filterString);

const props = defineProps(["title", "subtitle", "fileName"]);

const headers = [
  {
    title: "REP",
    align: "start",
    key: "IDREP",
  },
  {
    title: "DNI",
    align: "start",
    key: "DOCUMENTO",
  },
  { title: "Apellido y nombre", key: "APENOM" },
  { title: "Importe", key: "IMPORTE", align: "end" },
];

function exportFile() {
  const map1 = data.value.map((x) => {
    return [x.IDREP, x.DOCUMENTO, x.APENOM, x.IMPORTE];
  });

  const tituloTabla = ["Rep", "Documento", "Apellido y Nombre", "Importe"];
  const tituloTablaFormato = tituloTabla.map((t) => ({
    v: t,
    s: { font: { bold: true, sz: 12 } }, // sz: Tamaño de letra (14 por ejemplo)
  }));
  map1.unshift(tituloTablaFormato);

  const linea = [""];
  map1.unshift(linea);

  // agrega título secundario
  const tituloSec = ["", store.liqString];
  const tituloSecFormato = tituloSec.map((t) => ({
    v: t,
    s: { font: { bold: true, sz: 12 } }, // sz: Tamaño de letra (14 por ejemplo)
  }));
  map1.unshift(tituloSecFormato);

  // Agrega Título Principal
  const tituloPpal = ["", "Resúmen de código 153 de Liquidación"];
  const tituloPpalFormato = tituloPpal.map((t) => ({
    v: t,
    s: { font: { bold: true, sz: 12 } }, // sz: Tamaño de letra (14 por ejemplo)
  }));
  map1.unshift(tituloPpalFormato);

  /* generate worksheet from state */
  const ws = utils.aoa_to_sheet(map1);

  ws["!cols"] = [{ wch: 10 }, { wch: 10 }, { wch: 35 }, { wch: 20 }];
  /* create workbook and append worksheet */
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");

  /* export to XLSX */
  writeFileXLSX(
    wb,
    props.fileName || `${store.liqCompactString}_ResumenLiqCod153.xlsx`,
    {
      compression: true,
    },
  );
}
</script>

<template>
  <v-container>
    <RepoHeader
      title="Resumen de código 153 de liquidación"
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
      </v-data-table>
      <v-alert v-else-if="error" type="error" variant="tonal" class="my-3 w-100">
        No se pudieron cargar los datos solicitados. Verifique el período o liquidación seleccionada.
      </v-alert>
    </v-row>
  </v-container>
</template>
