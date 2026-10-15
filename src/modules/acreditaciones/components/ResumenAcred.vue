<script setup>
import { computed } from "vue";
import RepoHeader from "@/shared/components/RepoHeader.vue";
import { useFilterStore } from "@/stores/filterStore";
import { financial, agregaTitulosExcel } from "@/utils/reportes.js";
import { getVto } from "@/utils/formatos";
import { utils, writeFileXLSX } from "xlsx";

const props = defineProps({
  cab: {
    type: Object,
    default: null,
  },
  detalle: {
    type: Array,
    default: () => [],
  },
});

const store = useFilterStore();

const liqMap = new Map([
  ["1", "Mensual"],
  ["5", "Adicional"],
  ["2", "SAC"],
  ["21", "Liq Final"],
  ["10", "Ayuda Escolar"],
]);

const tipoLiqNombre = computed(() => {
  if (!props.cab) return "";
  return liqMap.get(String(props.cab.TIPOLIQUIDACIONID)) || `Tipo ${props.cab.TIPOLIQUIDACIONID}`;
});

const totalRegistros = computed(() => props.detalle?.length || 0);

const totalNeto = computed(() => {
  if (!props.detalle || props.detalle.length === 0) return 0;
  return props.detalle.reduce((sum, item) => sum + (Number(item.NETO) || 0), 0);
});

const conCuenta = computed(() => {
  if (!props.detalle || props.detalle.length === 0) return 0;
  return props.detalle.filter((i) => i.CUENTA && String(i.CUENTA).trim() !== "").length;
});

const sinCuenta = computed(() => totalRegistros.value - conCuenta.value);

function exportFile() {
  if (!props.cab || !props.detalle || props.detalle.length === 0) return;

  const map1 = props.detalle.map((x) => [
    x.ORDEN,
    x.DNI,
    x.APELLIDO,
    x.NOMBRE,
    Number(x.NETO) || 0,
    Number(x.VALORFIJO) || 0,
    Number(x.CUOTA) || 0,
    x.CUENTA || "Sin cuenta",
  ]);

  // Fila de totales
  map1.push([
    null,
    null,
    null,
    "TOTAL",
    totalNeto.value,
    null,
    null,
    null,
  ]);

  const titulosTabla = [
    "Orden",
    "DNI",
    "Apellido",
    "Nombre",
    "Neto",
    "Valor Fijo",
    "Cuota",
    "Cuenta Bancaria",
  ];
  const filtros = store.liqString;
  const tituloReporte = "Resumen de Acreditaciones Bancarias";
  agregaTitulosExcel(map1, tituloReporte, filtros, titulosTabla);
  const ws = utils.aoa_to_sheet(map1);

  ws["!cols"] = [
    { wch: 10 },
    { wch: 12 },
    { wch: 20 },
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 25 },
  ];
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Acreditaciones");

  writeFileXLSX(wb, `${store.liqCompactString}_Acreditaciones.xlsx`, {
    compression: true,
  });
}
</script>

<template>
  <v-container class="px-0">
    <RepoHeader title="Planilla de Acreditaciones Bancarias" :subtitle="store.liqString">
      <div class="d-flex align-center ga-2">
        <span v-if="cab && totalRegistros > 0" class="text-caption text-grey-darken-1 font-weight-medium me-2">
          Total: ${{ financial(totalNeto) }} ({{ totalRegistros }} agentes)
        </span>
        <v-btn
          color="primary"
          prepend-icon="mdi-file-excel"
          :disabled="!cab || totalRegistros === 0"
          @click="exportFile"
        >
          Exportar Excel
        </v-btn>
      </div>
    </RepoHeader>

    <div v-if="!cab" class="py-2 text-medium-emphasis">
      No existen acreditaciones registradas para {{ store.liqString }}.
    </div>

    <div v-else>
      <!-- Resumen en Tarjetas Informativas -->
      <v-row class="mb-2">
        <v-col cols="12" sm="6" md="3">
          <v-sheet rounded class="pa-3 border bg-surface">
            <div class="text-caption text-medium-emphasis">Total Acreditado</div>
            <div class="text-h6 font-weight-bold text-primary">${{ financial(totalNeto) }}</div>
          </v-sheet>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-sheet rounded class="pa-3 border bg-surface">
            <div class="text-caption text-medium-emphasis">Cantidad de Agentes</div>
            <div class="text-h6 font-weight-bold">{{ totalRegistros }}</div>
          </v-sheet>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-sheet rounded class="pa-3 border bg-surface">
            <div class="text-caption text-medium-emphasis">Con Cuenta Bancaria</div>
            <div class="text-h6 font-weight-bold text-success">{{ conCuenta }}</div>
          </v-sheet>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-sheet rounded class="pa-3 border bg-surface">
            <div class="text-caption text-medium-emphasis">Sin Cuenta Bancaria</div>
            <div class="text-h6 font-weight-bold text-warning">{{ sinCuenta }}</div>
          </v-sheet>
        </v-col>
      </v-row>

      <!-- Tabla Resumen de Cabecera -->
      <v-table density="compact" class="border rounded text-caption">
        <thead>
          <tr class="bg-grey-lighten-4">
            <th class="text-left font-weight-bold">Período</th>
            <th class="text-left font-weight-bold">Tipo Liquidación</th>
            <th class="text-right font-weight-bold">Grupo Adicional</th>
            <th class="text-right font-weight-bold">Valor Fijo</th>
            <th class="text-right font-weight-bold">Nro. Cuotas</th>
            <th class="text-right font-weight-bold">Registros Generados</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="text-left py-2 font-mono">{{ getVto(cab.PERIODO) }}</td>
            <td class="text-left py-2">{{ tipoLiqNombre }}</td>
            <td class="text-right py-2">{{ cab.GRUPOADICIONALID }}</td>
            <td class="text-right py-2 font-weight-medium">${{ financial(cab.VALORFIJO) }}</td>
            <td class="text-right py-2">{{ cab.CANTCUOTAS }}</td>
            <td class="text-right py-2 font-weight-bold text-primary">{{ totalRegistros }}</td>
          </tr>
        </tbody>
      </v-table>
    </div>
  </v-container>
</template>
