<script setup>
import { ref } from "vue";
import { RepoHeader } from "@/shared/components";
import { useFilterStore } from "@/stores/filterStore";
import { useEndPoints } from "@/composables/useEndPoints";
import { useFetch } from "@/composables/useFetch";
import { financial, agregaTitulosExcel } from "@/utils/reportes.js";
import { utils, writeFileXLSX } from "xlsx";

const { apiBase, getBoletasHeaders, buildApiHeaders } = useEndPoints();
const store = useFilterStore();
const preview = ref(false);

function useResumenAcred(getId) {
  const headersFn = buildApiHeaders || getBoletasHeaders || (() => ({}));
  return useFetch(
    () => `${apiBase.value}/api/view/detalleAcred?${getId()}`,
    () => ({ headers: headersFn() })
  );
}

const { data, error, isPending } = useResumenAcred(() => store.filterStringLey);

const getVto = (vto) => {
  if (vto) {
    const d = vto.split("-");
    return `${d[1]}/${d[0]}`;
  }
  return null;
};

const getPeriodo = (per) => {
  if (per) {
    const p = per.split("-");
    return `${p[0]}_${p[1]}`;
  }
  return null;
};

const headers = [
  { title: "Adicional", align: "start", key: "GRUPOADICIONALID" },
  { title: "Periodo", align: "start", key: "PERIODO" },
  { title: "Fecha dev", align: "start", key: "FECHADEV" },
  { title: "Liquidacion Id", align: "start", key: "LIQUIDACIONID" },
  { title: "Documento", align: "start", key: "DOCUMENTO" },
  { title: "Apellido", align: "start", key: "APELLIDO" },
  { title: "Nombre", align: "start", key: "NOMBRE" },
  { title: "Reparticion", align: "start", key: "REPARTICIONID" },
  { title: "Orden", align: "start", key: "ORDEN" },
  { title: "Afiliado", align: "start", key: "AFILIADO" },
  { title: "CUIL", align: "start", key: "CUIL" },
  { title: "CBU", align: "start", key: "CBU" },
  { title: "Haberes", align: "start", key: "HABERES" },
  { title: "Retenciones", align: "start", key: "RETENCIONES" },
  { title: "Neto", align: "start", key: "NETO" },
  { title: "Uni Org", align: "end", key: "UNIORG" },
  { title: "Bloqueo", align: "start", key: "BLOQ" },
  { title: "Es Ley", align: "start", key: "ESLEY" },
];

function exportFile() {
  if (!data.value || data.value.length === 0) return;

  const map1 = data.value.map((x) => {
    return [
      x.GRUPOADICIONALID,
      getVto(x.PERIODO),
      getVto(x.FECHADEV),
      x.LIQUIDACIONID,
      x.DOCUMENTO,
      x.APELLIDO,
      x.NOMBRE,
      x.REPARTICIONID,
      x.ORDEN,
      x.AFILIADO,
      x.CUIL,
      x.CBU,
      x.HABERES,
      x.RETENCIONES,
      x.NETO,
      x.UNIORG,
      x.BLOQ,
      x.ESLEY,
    ];
  });

  const titulosTabla = [
    "Grupo Adicional",
    "Periodo",
    "Fecha dev",
    "Liquidacion Id",
    "Documento",
    "Apellido",
    "Nombre",
    "Reparticion",
    "Orden",
    "Afiliado",
    "CUIL",
    "CBU",
    "Haberes",
    "Retenciones",
    "Neto",
    "Uni Org",
    "Bloqueo",
    "Es Ley",
  ];
  const filtros = store.liqString;
  const tituloReporte = "Detalle Acreditaciones";
  agregaTitulosExcel(map1, tituloReporte, filtros, titulosTabla);
  const ws = utils.aoa_to_sheet(map1);

  ws["!cols"] = [
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
    { wch: 10 },
    { wch: 15 },
    { wch: 20 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 25 },
    { wch: 25 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
  ];
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");

  writeFileXLSX(wb, `Detalle_Acred_${getPeriodo(store.periodoString) || store.liqCompactString}.xlsx`, {
    compression: true,
  });
}
</script>

<template>
  <v-container class="px-0">
    <RepoHeader title="Detalle Acreditaciones" :subtitle="store.liqString">
      <v-btn
        color="primary"
        :disabled="!data || data.length === 0"
        @click="preview = !preview"
      >
        Previsualizar
      </v-btn>
      <v-btn
        color="primary"
        :disabled="!data || data.length === 0"
        @click="exportFile"
      >
        Descargar
      </v-btn>
    </RepoHeader>

    <v-row v-if="preview" class="ma-0">
      <div v-if="isPending" class="py-2 text-center text-medium-emphasis">
        <v-progress-circular indeterminate color="primary" size="20" class="me-2" />
        loading...
      </div>
      <v-data-table
        v-else-if="data && data.length > 0"
        class="text-caption"
        hover
        density="compact"
        :items="data"
        :headers="headers"
        :items-per-page="10"
      >
        <template #item="{ item }">
          <tr class="pa-0 ma-0">
            <td class="text-right py-1">{{ item.GRUPOADICIONALID }}</td>
            <td class="text-right py-1">{{ getVto(item.PERIODO) }}</td>
            <td class="text-left py-1">{{ getVto(item.FECHADEV) }}</td>
            <td class="text-right py-1">{{ item.LIQUIDACIONID }}</td>
            <td class="text-left py-1">{{ item.DOCUMENTO }}</td>
            <td class="text-left py-1">{{ item.APELLIDO }}</td>
            <td class="text-left py-1">{{ item.NOMBRE }}</td>
            <td class="text-right py-1">{{ item.REPARTICIONID }}</td>
            <td class="text-right py-1">{{ item.ORDEN }}</td>
            <td class="text-right py-1">{{ item.AFILIADO }}</td>
            <td class="text-left py-1">{{ item.CUIL }}</td>
            <td class="text-left py-1 font-mono">{{ item.CBU }}</td>
            <td class="text-right py-1 font-weight-medium">{{ financial(item.HABERES) }}</td>
            <td class="text-right py-1">{{ item.RETENCIONES }}</td>
            <td class="text-right py-1 font-weight-bold">{{ financial(item.NETO) }}</td>
            <td class="text-right py-1">{{ item.UNIORG }}</td>
            <td class="text-right py-1">{{ item.BLOQ }}</td>
            <td class="text-left py-1">{{ item.ESLEY }}</td>
          </tr>
        </template>
      </v-data-table>
      <div v-else-if="error" class="text-error py-2">
        No se puede obtener los datos solicitados.
      </div>
      <div v-else class="py-2 text-medium-emphasis">
        Sin datos para mostrar.
      </div>
    </v-row>
  </v-container>
</template>
