<script setup>
import { ref } from "vue";
import { useFilterStore } from "@/stores/filterStore.js";
import { useFetch } from "@/composables/useFetch";
import { RepoHeader } from "@/shared/components";
import { useLiqStore } from "@/stores/liqStore.js";
import { useEndPoints } from "@/composables/useEndPoints";
import { request } from "@/shared/services/httpClient";
import { generarNombreBoleta } from "@/utils/boletas.js";
import { useBoletatxt } from "@/stores/boletaStore";

const { apiBase } = useEndPoints();
const store = useFilterStore();
const liqStore = useLiqStore();
const liqStoreBoleta = useBoletatxt();

function useLiqBoletas(getId) {
  return useFetch(() => `${apiBase.value}/api/view/boletas?${getId()}`);
}

const { data, error, isPending } = useLiqBoletas(() => store.filterString);

const search = ref("");
const downloadingId = ref(null);

const getVto = (vto) => {
  if (vto) {
    const d = vto.split("-");
    return `${d[1]}/${d[0]}`;
  }
  return null;
};

const headers = [
  {
    align: "start",
    key: "ORDEN",
    title: "Nro. Boleta",
  },
  { key: "DOCUMENTO", title: "DNI" },
  { key: "APELLIDO", title: "Apellido" },
  { key: "NOMBRE", title: "Nombre" },
  { key: "TIPOLIQUIDACIONDESCRIPCION", title: "Liquidación" },
  { key: "PERIODO", title: "Emisión" },
  { key: "FECHADEV", title: "Devengado" },
  { key: "LIQUIDACIONID", title: "Acción" },
];

async function handleDownload(item) {
  const idliq = item.LIQUIDACIONID;
  downloadingId.value = idliq;

  liqStore.setLiqItems(idliq);

  const nombreArchivo = generarNombreBoleta(
    item.PERIODO,
    item.TIPOLIQUIDACIONDESCRIPCION,
    item.APELLIDO,
    item.NOMBRE,
  );

  try {
    const res = await request({
      service: "base",
      path: "boleta",
      query: { IdLiq: idliq },
      responseType: "blob",
    });

    if (!res.operacionOk) {
      throw new Error(`Servidor devolvió código ${res.estado}`);
    }

    const blob = res.datos;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.warn("Descarga remota falló, generando boleta en cliente:", err);
    try {
      await liqStoreBoleta.setId(idliq);
      await liqStoreBoleta.createPdf();
    } catch (e2) {
      console.error("Error al generar boleta:", e2);
    }
  } finally {
    downloadingId.value = null;
  }
}
</script>

<template>
  <v-container>
    <RepoHeader
      title="Boletas disponibles para descarga"
      :subtitle="store.liqString"
    >
    </RepoHeader>
    <v-row>
      <div v-if="isPending" class="pa-4">
        <v-progress-circular
          indeterminate
          color="primary"
          class="me-2"
        ></v-progress-circular>
        Cargando listado de boletas...
      </div>

      <v-card v-else-if="data" flat class="w-100">
        <template #text>
          <v-text-field
            v-model="search"
            label="Búsqueda por DNI, Apellido o Nombre"
            prepend-inner-icon="mdi-magnify"
            single-line
            variant="outlined"
            density="compact"
            hide-details
          ></v-text-field>
        </template>

        <v-data-table
          class="elevation-1 text-caption pa-0 ma-0 w-100"
          :headers="headers"
          :items="data"
          :search="search"
          item-value="LIQUIDACIONID"
        >
          <template #[`item.PERIODO`]="{ value }">
            {{ getVto(value) }}
          </template>
          <template #[`item.FECHADEV`]="{ value }">
            {{ getVto(value) }}
          </template>

          <template #[`item.LIQUIDACIONID`]="{ item }">
            <v-btn
              variant="outlined"
              size="small"
              color="primary"
              :loading="downloadingId === item.LIQUIDACIONID"
              :disabled="downloadingId === item.LIQUIDACIONID"
              prepend-icon="mdi-download"
              @click="handleDownload(item)"
            >
              Descargar
            </v-btn>
          </template>
        </v-data-table>
      </v-card>
      <div v-else-if="error" class="text-error pa-4">
        No se puede obtener los datos solicitados.
      </div>
    </v-row>
  </v-container>
</template>
