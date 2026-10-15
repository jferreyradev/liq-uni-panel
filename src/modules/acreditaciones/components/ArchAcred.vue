<script setup>
import { ref } from "vue";
import RepoHeader from "@/shared/components/RepoHeader.vue";
import { useFilterStore } from "@/stores/filterStore";
import { useEndPoints } from "@/composables/useEndPoints";
import { useFetch } from "@/composables/useFetch";

const preview = ref(false);
const { apiBase, getBoletasHeaders } = useEndPoints();
const store = useFilterStore();

function printData() {
  downloadAcred();
}

const getTxtFromAPI = async (url) => {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "text/plain",
      ...getBoletasHeaders(),
    },
  });
  if (!response.ok) {
    return null;
  }
  const datos = await response.blob();
  return window.URL.createObjectURL(datos);
};

async function downloadAcred() {
  const url = `${apiBase.value}/api/txt/archivoAcred?${store.filterStringLey}`;
  const urlDescarga = await getTxtFromAPI(url);

  if (urlDescarga == null) {
    if (data.value && data.value.length > 0) {
      let largeString = "";
      for (let i = 0; i < data.value.length; i++) {
        largeString += data.value[i].CADENA + "\n";
      }
      const archivo = new Blob([largeString], { type: "text/plain;charset=utf-8" });
      const urlSalida = URL.createObjectURL(archivo);
      const a = document.createElement("a");
      a.href = urlSalida;
      a.download = `Archivo_Acreditaciones_${store.periodoString || "banco"}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(urlSalida);
      return;
    }
    return;
  }

  const a = document.createElement("a");
  a.href = urlDescarga;
  a.download = `Archivo_Acreditaciones_${store.periodoString || "banco"}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(urlDescarga);
}

function useResumenAcred(getId) {
  return useFetch(() => `${apiBase.value}/api/view/archivoAcred?${getId()}`);
}

const { data, error, isPending } = useResumenAcred(() => store.filterStringLey);

const headers = [
  {
    title: "CADENA",
    align: "start",
    key: "CADENA",
  },
];
</script>

<template>
  <v-container>
    <RepoHeader title="Archivo Acreditaciones">
      <v-btn color="primary" :disabled="!data" @click="preview = !preview"
        >Previsualizar</v-btn
      >
      <v-btn color="primary" :disabled="!data" @click="printData"
        >Descargar</v-btn
      >
    </RepoHeader>

    <v-row v-if="preview">
      <div v-if="isPending">loading...</div>
      <v-data-table
        v-else-if="data"
        class="text-caption"
        hover
        density="compact"
        :items="data"
        :headers="headers"
      >
      </v-data-table>
      <div v-else-if="error">No se puede obtener los datos solicitados.</div>
    </v-row>
  </v-container>
</template>
