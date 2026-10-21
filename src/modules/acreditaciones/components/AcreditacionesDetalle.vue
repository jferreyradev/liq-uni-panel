<script setup>
import { ref, watch } from "vue";
import { financial } from "@/utils/formatos";
import { utils, writeFileXLSX } from "xlsx";
import { agregaTitulosExcel } from "@/utils/reportes.js";

const props = defineProps([
  "filtroCuenta",
  "setFiltroCuenta",
  "dataDetalle",
  "fileName",
]);
let filtroCuenta = props.filtroCuenta;

const listaHeaders = [
  { title: "Orden", key: "ORDEN" },
  { title: "DNI", key: "DNI" },
  { title: "Apellido", key: "APELLIDO" },
  { title: "Nombre", key: "NOMBRE" },
  { title: "Neto", key: "NETO" },
  { title: "Valor Fijo", key: "VALORFIJO" },
  { title: "Valor Cuota", key: "CUOTA" },
  { title: "Cuenta", key: "CUENTA" },
];

const filtroCuentaArray = [
  { id: 0, descripcion: "Todos" },
  { id: 1, descripcion: "Con cuenta" },
  { id: 2, descripcion: "Sin cuenta" },
];

const filtroCuentaSel = ref(filtroCuentaArray[filtroCuenta]);

// lectura de registros
const data = ref(props.dataDetalle || []);
const datosFiltrados = ref(null);

watch(
  () => props.dataDetalle,
  (newVal) => {
    data.value = newVal || [];
    filtrar();
  }
);

function filtrar() {
  if (filtroCuentaSel.value.id === 1) {
    datosFiltrados.value = data.value.filter(
      (item) => item.CUENTA && item.CUENTA.trim() !== "",
    );
  } else if (filtroCuentaSel.value.id === 2) {
    datosFiltrados.value = data.value.filter(
      (item) => !item.CUENTA || item.CUENTA.trim() === "",
    );
  } else {
    datosFiltrados.value = data.value;
  }
  props.setFiltroCuenta(filtroCuentaSel.value.id);
}

function exportFile() {
  const map1 = datosFiltrados.value.map((x) => {
    return [
      x.ORDEN,
      x.DNI,
      x.APELLIDO,
      x.NOMBRE,
      x.NETO,
      x.VALORFIJO,
      x.CUOTA,
      x.CUENTA,
    ];
  });

  const titulosTabla = [
    "Orden",
    "DNI",
    "Apellido",
    "Nombre",
    "Neto",
    "Valor Fijo",
    "Valor Cuota",
    "Cuenta",
  ];
  const filtros = filtroCuentaSel.value.descripcion;
  const tituloReporte = "Detalle de la Acreditación";
  agregaTitulosExcel(map1, tituloReporte, filtros, titulosTabla);
  const ws = utils.aoa_to_sheet(map1);
  ws["!cols"] = [
    { wch: 10 },
    { wch: 10 },
    { wch: 20 },
    { wch: 20 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 20 },
  ];
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");

  writeFileXLSX(wb, props.fileName || `DetalleAcreditacion.xlsx`, {
    compression: true,
  });
}

filtrar();
</script>

<template>
  <v-card>
    <v-card-title>
      <h3>Detalle de la Acreditación</h3>

      <v-row>
        <v-col cols="3">
          <v-select
            v-model="filtroCuentaSel"
            label="Filtro de cuenta"
            :items="filtroCuentaArray"
            item-title="descripcion"
            item-value="id"
            return-object
          ></v-select>
        </v-col>
        <v-col cols="4">
          <v-btn color="info" @click="filtrar">Filtrar</v-btn>
          <v-btn
            v-if="datosFiltrados && datosFiltrados.length > 0"
            color="info"
            @click="exportFile"
            >Exportar</v-btn
          >
        </v-col>
      </v-row>
    </v-card-title>
    <v-card-text>
      <v-container>
        <v-row v-if="datosFiltrados && datosFiltrados.length > 0">
          <v-data-table
            class="text-caption"
            hover
            density="compact"
            :items="datosFiltrados"
            :headers="listaHeaders"
          >
            <template #item="{ item }">
              <tr class="pa-0 ma-0">
                <td class="text-left m-0 p-0">{{ item.ORDEN }}</td>
                <td class="text-left m-0 p-0">{{ item.DNI }}</td>
                <td class="text-left m-0 p-0">{{ item.APELLIDO }}</td>
                <td class="text-left m-0 p-0">{{ item.NOMBRE }}</td>
                <td class="text-right m-0 p-0">{{ financial(item.NETO) }}</td>
                <td class="text-right m-0 p-0">
                  {{ financial(item.VALORFIJO) }}
                </td>
                <td class="text-right m-0 p-0">{{ financial(item.CUOTA) }}</td>
                <td class="text-right m-0 p-0">{{ item.CUENTA }}</td>
              </tr>
            </template>
          </v-data-table>
        </v-row>
        <v-row v-else>
          <h3>Sin datos para mostrar</h3>
        </v-row>
      </v-container>
    </v-card-text>
  </v-card>
</template>
