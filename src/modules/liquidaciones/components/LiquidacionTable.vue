<script setup>
import { ref } from "vue";
import { useFilterStore } from "@/stores/filterStore.js";
import { useFetch } from "@/composables/useFetch";
import { useEndPoints } from "@/composables/useEndPoints";

const { apiBase } = useEndPoints();

const store = useFilterStore();

function useLiq(getId) {
  return useFetch(
    () => `${apiBase.value}/api/view/liq?${getId()}&sort={"Orden":"asc"}`,
  );
}

const { data, error, isPending } = useLiq(() => store.filterString);

const props = defineProps(["title", "subtitle"]);
const emit = defineEmits(["select"]);

const search = ref();

const liqHeaders = [
  { title: "Orden", key: "ORDEN" },
  { title: "Documento", key: "DOCUMENTO" },
  { title: "Apellido", key: "APELLIDO", sortable: true },
  { title: "Nombre", key: "NOMBRE" },
  { title: "Fecha Dev.", key: "FECHADEV" },
];

function handleClick(item) {
  const row = item?.raw || item;
  emit("select", row.LIQUIDACIONID || item.LIQUIDACIONID, {
    apellido: row.APELLIDO || item.APELLIDO,
    nombre: row.NOMBRE || item.NOMBRE,
    orden: row.ORDEN || item.ORDEN,
    dni: row.DOCUMENTO || item.DOCUMENTO,
  });
}

const getVto = (vto) => {
  if (vto) {
    const d = vto.split("-");
    return `${d[1]}/${d[0]}`;
  }
  return null;
};
</script>

<template>
  <v-container>
    <div v-if="isPending">loading...</div>
    <v-card v-else-if="data" flat>
      <v-card-title class="d-flex align-center pe-2 bg-blue-accent-1">
        {{ props.title }}
        <v-spacer></v-spacer>
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          density="compact"
          label="Texto a buscar en toda la tabla"
          single-line
          flat
          hide-details
          variant="solo-filled"
        >
        </v-text-field>
      </v-card-title>
      <v-card-subtitle class="d-flex align-center pe-2 bg-blue-accent-1">
        {{ props.subtitle }}
      </v-card-subtitle>
      <v-divider></v-divider>

      <v-data-table
        :headers="liqHeaders"
        :items="data"
        item-key="LIQUIDACIONID"
        :search="search"
        hover
        density="compact"
        class="elevation-1 text-caption pa-0 ma-0 w-auto"
      >
        <template #item="{ item }">
          <tr class="pa-0 ma-0" @click="handleClick(item)">
            <td class="text-right ma-0 pa-0">{{ item.ORDEN }}</td>
            <td class="text-right">{{ item.DOCUMENTO }}</td>
            <td class="text-left">{{ item.APELLIDO }}</td>
            <td class="text-left">{{ item.NOMBRE }}</td>
            <td class="text-center">{{ getVto(item.FECHADEV) }}</td>
          </tr>
        </template>
      </v-data-table>
    </v-card>
    <v-alert
      v-else-if="error"
      type="error"
      variant="tonal"
      class="my-3"
      closable
      icon="mdi-alert-circle-outline"
    >
      <div class="font-weight-bold">No se pudieron obtener las liquidaciones</div>
      <div class="text-caption text-medium-emphasis mt-1">
        {{ error?.message || error || 'Error al conectar con el servidor o consultar los datos del período seleccionado.' }}
      </div>
    </v-alert>
  </v-container>
</template>

<style scoped></style>
