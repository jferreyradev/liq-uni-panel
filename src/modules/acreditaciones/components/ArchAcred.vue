<script setup>
import { ref } from "vue";
import RepoHeader from "@/shared/components/RepoHeader.vue";
import { useFilterStore } from "@/stores/filterStore";
import { useEndPoints } from "@/composables/useEndPoints";
import { useFetch } from "@/composables/useFetch";

const preview = ref(false);
const downloading = ref(false);
const { apiBase, getBoletasHeaders, buildApiHeaders } = useEndPoints();
const store = useFilterStore();

function useResumenAcred(getId) {
  const headersFn = buildApiHeaders || getBoletasHeaders || (() => ({}));
  return useFetch(
    () => `${apiBase.value}/api/view/archivoAcred?${getId()}`,
    () => ({ headers: headersFn() })
  );
}

const { data, error, isPending } = useResumenAcred(() => store.filterStringLey);

const headers = [
  {
    title: "Cadena de Registro (Formato Banco)",
    align: "start",
    key: "CADENA",
  },
];

async function downloadAcred() {
  downloading.value = true;
  const headersFn = buildApiHeaders || getBoletasHeaders || (() => ({}));
  const url = `${apiBase.value}/api/txt/archivoAcred?${store.filterStringLey}`;
  const filename = `Archivo_Acreditaciones_${store.periodoString || "banco"}.txt`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "text/plain",
        ...headersFn(),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    if (blob.size === 0 && data.value && data.value.length > 0) {
      throw new Error("Respuesta vacía del servidor, generando fallback...");
    }

    const urlSalida = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = urlSalida;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(urlSalida);
  } catch (err) {
    if (data.value && data.value.length > 0) {
      let largeString = "";
      for (let i = 0; i < data.value.length; i++) {
        const item = data.value[i];
        const linea = item.CADENA || item.cadena || "";
        largeString += linea + "\r\n";
      }
      const archivo = new Blob([largeString], { type: "text/plain;charset=utf-8" });
      const urlSalida = URL.createObjectURL(archivo);
      const a = document.createElement("a");
      a.href = urlSalida;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(urlSalida);
    } else {
      console.error("Error al descargar archivo de acreditación:", err);
    }
  } finally {
    downloading.value = false;
  }
}
</script>

<template>
  <v-container class="px-0">
    <RepoHeader title="Archivo de Acreditaciones para Banco" :subtitle="store.liqString">
      <div class="d-flex align-center ga-2">
        <span v-if="data && data.length > 0" class="text-caption text-grey-darken-1 font-weight-medium me-2">
          ({{ data.length }} reg.)
        </span>
        <v-btn
          variant="tonal"
          color="primary"
          :prepend-icon="preview ? 'mdi-eye-off' : 'mdi-eye'"
          :disabled="!data || data.length === 0"
          @click="preview = !preview"
        >
          {{ preview ? 'Ocultar Previsualización' : 'Previsualizar' }}
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-download"
          :loading="downloading"
          :disabled="!data || data.length === 0"
          @click="downloadAcred"
        >
          Descargar TXT
        </v-btn>
      </div>
    </RepoHeader>

    <div v-if="isPending" class="py-2 text-center text-medium-emphasis">
      <v-progress-circular indeterminate color="primary" size="20" class="me-2" />
      Cargando archivo de acreditación...
    </div>

    <div v-else-if="error" class="text-error py-2">
      No se pudo obtener el archivo de acreditación.
    </div>

    <div v-else-if="!data || data.length === 0" class="py-2 text-medium-emphasis">
      No existen registros de archivo para el filtro seleccionado.
    </div>

    <div v-if="preview && data && data.length > 0" style="overflow-x: auto;">
      <v-data-table
        class="text-caption font-mono"
        hover
        density="compact"
        :items="data"
        :headers="headers"
        :items-per-page="10"
      >
        <template v-slot:item="{ item }">
          <tr class="pa-0 ma-0">
            <td class="text-left font-mono py-1 text-no-wrap">{{ item.CADENA }}</td>
          </tr>
        </template>
      </v-data-table>
    </div>
  </v-container>
</template>
