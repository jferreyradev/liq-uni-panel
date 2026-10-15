<script setup>
import { ref } from "vue";
import RepoHeader from "@/shared/components/RepoHeader.vue";
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
    if (d.length >= 2) {
      return `${d[1]}/${d[0]}`;
    }
    return vto;
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
  { title: "Haberes", align: "end", key: "HABERES" },
  { title: "Retenciones", align: "end", key: "RETENCIONES" },
  { title: "Neto", align: "end", key: "NETO" },
  { title: "Uni Org", align: "start", key: "UNIORG" },
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
      Number(x.HABERES) || 0,
      Number(x.RETENCIONES) || 0,
      Number(x.NETO) || 0,
      x.UNIORG,
      x.BLOQ,
      x.ESLEY,
    ];
  });

  const titulosTabla = [
    "Adicional",
    "Periodo",
    "Fecha dev",
    "LiquidacionId",
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
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 12 },
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 15 },
    { wch: 24 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
  ];
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Detalle");

  writeFileXLSX(wb, `${store.liqCompactString}_Detalle_Acreditaciones.xlsx`, {
    compression: true,
  });
}
</script>

<template>
  <v-container class="px-0">
    <RepoHeader title="Detalle de Acreditaciones (Cuentas)" :subtitle="store.liqString">
      <div class="d-flex align-center ga-2">
        <span v-if="data && data.length > 0" class="text-caption text-grey-darken-1 font-weight-medium me-2">
          {{ data.length }} registros
        </span>
        <v-btn
          variant="tonal"
          color="primary"
          :prepend-icon="preview ? 'mdi-eye-off' : 'mdi-eye'"
          :disabled="!data || data.length === 0"
          @click="preview = !preview"
        >
          {{ preview ? 'Ocultar Previsualización' : 'Previsualizar Detalle' }}
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-file-excel"
          :disabled="!data || data.length === 0"
          @click="exportFile"
        >
          Exportar Excel Detalle
        </v-btn>
      </div>
    </RepoHeader>

    <div v-if="isPending" class="py-2 text-center text-medium-emphasis">
      <v-progress-circular indeterminate color="primary" size="20" class="me-2" />
      Cargando detalle de acreditaciones...
    </div>

    <div v-else-if="error" class="text-error py-2">
      No se pudo obtener el detalle de acreditaciones.
    </div>

    <div v-else-if="!data || data.length === 0" class="py-2 text-medium-emphasis">
      No existen registros de detalle para el filtro seleccionado.
    </div>

    <div v-if="preview && data && data.length > 0" style="overflow-x: auto;">
      <v-data-table
        class="text-caption"
        hover
        density="compact"
        :items="data"
        :headers="headers"
        :items-per-page="10"
      >
        <template v-slot:item="{ item }">
          <tr class="pa-0 ma-0">
            <td class="text-right py-1">{{ item.GRUPOADICIONALID }}</td>
            <td class="text-left py-1">{{ getVto(item.PERIODO) }}</td>
            <td class="text-left py-1">{{ getVto(item.FECHADEV) }}</td>
            <td class="text-right py-1">{{ item.LIQUIDACIONID }}</td>
            <td class="text-left py-1">{{ item.DOCUMENTO }}</td>
            <td class="text-left py-1">{{ item.APELLIDO }}</td>
            <td class="text-left py-1">{{ item.NOMBRE }}</td>
            <td class="text-left py-1">{{ item.REPARTICIONID }}</td>
            <td class="text-left py-1">{{ item.ORDEN }}</td>
            <td class="text-right py-1">{{ item.AFILIADO }}</td>
            <td class="text-left py-1">{{ item.CUIL }}</td>
            <td class="text-left py-1 font-mono">{{ item.CBU }}</td>
            <td class="text-right py-1 font-weight-medium">{{ financial(item.HABERES) }}</td>
            <td class="text-right py-1">{{ financial(item.RETENCIONES) }}</td>
            <td class="text-right py-1 font-weight-bold">{{ financial(item.NETO) }}</td>
            <td class="text-left py-1">{{ item.UNIORG }}</td>
            <td class="text-left py-1">{{ item.BLOQ }}</td>
            <td class="text-left py-1">{{ item.ESLEY }}</td>
          </tr>
        </template>
      </v-data-table>
    </div>
  </v-container>
</template>
