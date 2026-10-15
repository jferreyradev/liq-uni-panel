<script setup>
import { ref, computed } from "vue";
import RepoHeader from "@/shared/components/RepoHeader.vue";
import { useFilterStore } from "@/stores/filterStore";
import { financial, agregaTitulosExcel } from "@/utils/reportes.js";
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
const preview = ref(false);
const filtroCuenta = ref(0);

const totalTodos = computed(() => props.detalle?.length || 0);

const totalConCuenta = computed(() => {
  if (!props.detalle) return 0;
  return props.detalle.filter((i) => i.CUENTA && String(i.CUENTA).trim() !== "").length;
});

const totalSinCuenta = computed(() => totalTodos.value - totalConCuenta.value);

const filteredDetalle = computed(() => {
  if (!props.detalle || props.detalle.length === 0) return [];
  if (filtroCuenta.value === 1) {
    return props.detalle.filter((i) => i.CUENTA && String(i.CUENTA).trim() !== "");
  }
  if (filtroCuenta.value === 2) {
    return props.detalle.filter((i) => !i.CUENTA || String(i.CUENTA).trim() === "");
  }
  return props.detalle;
});

const headers = [
  { title: "Orden", align: "start", key: "ORDEN" },
  { title: "DNI", align: "start", key: "DNI" },
  { title: "Apellido y Nombre", align: "start", key: "NOMBRE_COMPLETO" },
  { title: "Neto", align: "end", key: "NETO" },
  { title: "Valor Fijo", align: "end", key: "VALORFIJO" },
  { title: "Cuota", align: "end", key: "CUOTA" },
  { title: "Cuenta Bancaria", align: "start", key: "CUENTA" },
];

function exportFile() {
  if (!filteredDetalle.value || filteredDetalle.value.length === 0) return;

  const map1 = filteredDetalle.value.map((x) => [
    x.ORDEN,
    x.DNI,
    x.APELLIDO,
    x.NOMBRE,
    Number(x.NETO) || 0,
    Number(x.VALORFIJO) || 0,
    Number(x.CUOTA) || 0,
    x.CUENTA || "Sin cuenta",
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
  const filtroTexto =
    filtroCuenta.value === 1
      ? "Con Cuenta"
      : filtroCuenta.value === 2
      ? "Sin Cuenta"
      : "Todos";
  const filtros = `${store.liqString} — ${filtroTexto}`;
  const tituloReporte = "Detalle de Acreditaciones Bancarias";
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
  utils.book_append_sheet(wb, ws, "Detalle");

  writeFileXLSX(wb, `${store.liqCompactString}_Detalle_Acreditaciones.xlsx`, {
    compression: true,
  });
}
</script>

<template>
  <v-container class="px-0">
    <RepoHeader title="Detalle de Agentes y Cuentas Bancarias" :subtitle="store.liqString">
      <div class="d-flex align-center ga-2">
        <span v-if="cab && totalTodos > 0" class="text-caption text-grey-darken-1 font-weight-medium me-2">
          {{ filteredDetalle.length }} de {{ totalTodos }} agentes
        </span>
        <v-btn
          variant="tonal"
          color="primary"
          :prepend-icon="preview ? 'mdi-eye-off' : 'mdi-eye'"
          :disabled="!cab || totalTodos === 0"
          @click="preview = !preview"
        >
          {{ preview ? 'Ocultar Previsualización' : 'Previsualizar Detalle' }}
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-file-excel"
          :disabled="!cab || filteredDetalle.length === 0"
          @click="exportFile"
        >
          Exportar Excel Detalle
        </v-btn>
      </div>
    </RepoHeader>

    <div v-if="!cab" class="py-2 text-medium-emphasis">
      No existen registros de detalle para {{ store.liqString }}.
    </div>

    <div v-else-if="preview">
      <!-- Filtros de Cuenta (Todos / Con Cuenta / Sin Cuenta) -->
      <div class="d-flex align-center ga-2 my-2">
        <v-btn
          size="small"
          :variant="filtroCuenta === 0 ? 'flat' : 'outlined'"
          color="primary"
          @click="filtroCuenta = 0"
        >
          Todos ({{ totalTodos }})
        </v-btn>
        <v-btn
          size="small"
          :variant="filtroCuenta === 1 ? 'flat' : 'outlined'"
          color="success"
          @click="filtroCuenta = 1"
        >
          Con Cuenta ({{ totalConCuenta }})
        </v-btn>
        <v-btn
          size="small"
          :variant="filtroCuenta === 2 ? 'flat' : 'outlined'"
          color="warning"
          @click="filtroCuenta = 2"
        >
          Sin Cuenta ({{ totalSinCuenta }})
        </v-btn>
      </div>

      <!-- Tabla de Detalle -->
      <div style="overflow-x: auto;">
        <v-data-table
          class="text-caption"
          hover
          density="compact"
          :items="filteredDetalle"
          :headers="headers"
          :items-per-page="10"
        >
          <template v-slot:item="{ item }">
            <tr class="pa-0 ma-0">
              <td class="text-right py-1 font-mono">{{ item.ORDEN }}</td>
              <td class="text-left py-1 font-mono">{{ item.DNI }}</td>
              <td class="text-left py-1 font-weight-medium">
                {{ item.APELLIDO }} {{ item.NOMBRE }}
              </td>
              <td class="text-right py-1 font-weight-bold text-primary">
                ${{ financial(item.NETO) }}
              </td>
              <td class="text-right py-1">${{ financial(item.VALORFIJO) }}</td>
              <td class="text-right py-1 font-weight-medium">
                ${{ financial(item.CUOTA) }}
              </td>
              <td class="text-left py-1">
                <v-chip
                  v-if="item.CUENTA && String(item.CUENTA).trim() !== ''"
                  size="x-small"
                  color="success"
                  variant="tonal"
                  class="font-mono"
                >
                  {{ item.CUENTA }}
                </v-chip>
                <v-chip v-else size="x-small" color="warning" variant="tonal">
                  Sin cuenta
                </v-chip>
              </td>
            </tr>
          </template>
        </v-data-table>
      </div>
    </div>
  </v-container>
</template>
