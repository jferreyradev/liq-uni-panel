<script setup>
import { ref } from "vue";
import { RepoHeader } from "@/shared/components";
import { useFilterStore } from "@/stores/filterStore";
import { useEndPoints } from "@/composables/useEndPoints";
import { useFetch } from "@/composables/useFetch";
import { request } from "@/shared/services/httpClient";

const preview = ref(false);
const { apiBase, getBoletasHeaders, buildApiHeaders } = useEndPoints();
const store = useFilterStore();

function printData() {
  downloadAcred();
}

const getTxtFromAPI = async (url) => {
  const headersFn = buildApiHeaders || getBoletasHeaders || (() => ({}));
  const res = await request({
    url,
    headers: {
      ...headersFn(),
      "Content-Type": "text/plain",
    },
    responseType: "blob",
  });
  if (!res.operacionOk) {
    return null;
  }
  const datos = res.datos;
  const urlSalida = window.URL.createObjectURL(datos);
  return urlSalida;
};

const getPeriodo = (per) => {
  if (per) {
    const p = per.split("-");
    return `${p[0]}_${p[1]}`;
  }
  return null;
};

async function downloadAcred() {
  const url = `${apiBase.value}/api/txt/archivoAcred?${store.filterStringLey}`;
  const urlDescarga = await getTxtFromAPI(url);

  if (urlDescarga == null) {
    if (data.value && data.value.length > 0) {
      let largeString = "";
      for (let index = 0; index < data.value.length; index++) {
        const element = data.value[index];
        largeString += (element.CADENA || element.cadena || "") + "\r\n";
      }
      const archivo = new Blob([largeString], { type: "text/plain;charset=utf-8" });
      const urlSalida = URL.createObjectURL(archivo);
      const a = document.createElement("a");
      a.href = urlSalida;
      a.download = `Acreditaciones_${getPeriodo(store.periodoString) || store.liqCompactString}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(urlSalida);
    }
    return;
  }

  const a = document.createElement("a");
  a.href = urlDescarga;
  a.download = `Acreditaciones_${getPeriodo(store.periodoString) || store.liqCompactString}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(urlDescarga);
}

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
    title: "CADENA",
    align: "start",
    key: "CADENA",
  },
];
</script>

<template>
  <v-container class="px-0">
    <RepoHeader title="Archivo Acreditaciones" :subtitle="store.liqString">
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
        @click="printData"
      >
        Descargar
      </v-btn>
    </RepoHeader>

    <v-row v-if="preview" class="ma-0">
      <div v-if="isPending" class="py-2 text-center text-medium-emphasis">
        <v-progress-circular indeterminate color="primary" size="20" class="me-2" />
        loading...
      </div>
      <div v-else-if="error" class="text-error py-2">
        No se puede obtener los datos solicitados.
      </div>
      <div v-else-if="data && data.length > 0" style="overflow-x: auto; width: 100%;">
        <v-data-table
          class="text-caption font-mono"
          hover
          density="compact"
          :items="data"
          :headers="headers"
          :items-per-page="10"
        >
          <template #item="{ item }">
            <tr class="pa-0 ma-0">
              <td class="text-left font-mono py-1 text-no-wrap">{{ item.CADENA }}</td>
            </tr>
          </template>
        </v-data-table>
      </div>
      <div v-else class="py-2 text-medium-emphasis">
        Sin datos para mostrar.
      </div>
    </v-row>
  </v-container>
</template>
