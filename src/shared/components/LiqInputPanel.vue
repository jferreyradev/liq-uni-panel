<script setup>
import { ref, watch } from "vue";
import { useFilterStore } from "@/stores/filterStore.js";

const store = useFilterStore();

const emit = defineEmits(["submit"]);

const props = defineProps({
  tipoliq: {
    type: Boolean,
    default: true,
  },
  nroadi: {
    type: Boolean,
    default: true,
  },
  esley: {
    type: Boolean,
    default: false,
  },
});

const liq = [
  {
    name: "Mensual",
    value: "1",
  },
  {
    name: "Adicional",
    value: "5",
  },
  {
    name: "SAC",
    value: "2",
  },
  {
    name: "Liq Final",
    value: "21",
  },
  {
    name: "Ayuda Escolar",
    value: "10",
    disabled: true,
  },
];

const liqSelected = ref({
  name: "Mensual",
  value: "1",
});
const nroAdi = ref(0);

const months = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const month = ref("");
const year = ref("");
const esLey = ref(false);

watch(
  () => store.ley,
  (newVal) => {
    esLey.value = Boolean(newVal);
  },
  { immediate: true }
);

watch(
  () => [store.month, store.year],
  ([newMonth, newYear]) => {
    const mIndex = Number(newMonth) - 1;
    if (mIndex >= 0 && months[mIndex]) {
      month.value = months[mIndex];
    }
    if (newYear) {
      year.value = newYear;
    }
  },
  { immediate: true }
);

watch(
  () => [store.tipoliq, store.nroadi],
  ([newTipo, newAdi]) => {
    const found = liq.find((l) => String(l.value) === String(newTipo));
    if (found) {
      liqSelected.value = found;
    }
    if (newAdi !== undefined) {
      nroAdi.value = newAdi;
    }
  },
  { immediate: true }
);

const handleClick = () => {
  if (props.tipoliq && liqSelected.value?.value) {
    store.tipoliq = Number(liqSelected.value.value) || liqSelected.value.value;
  }
  if (props.nroadi) {
    store.nroadi = Number(nroAdi.value) || 0;
  }
  if (props.esley) {
    store.ley = esLey.value ? 1 : 0;
  }
  const idx = months.indexOf(month.value);
  if (idx >= 0) {
    store.month = String(idx + 1).padStart(2, "0");
  }
  if (year.value) {
    store.year = Number(year.value) || year.value;
  }

  emit("submit");
};
</script>

<template>
  <v-container fluid class="pa-0 ma-0">
    <v-row align="center" dense class="pa-0 ma-0">
      <v-col v-if="props.tipoliq" cols="12" sm="6" md="3">
        <v-select
          v-model="liqSelected"
          label="Liquidación"
          :items="liq"
          item-title="name"
          item-value="value"
          return-object
          density="compact"
          variant="outlined"
          hide-details
        />
      </v-col>
      <v-col v-if="props.nroadi" cols="12" sm="6" md="2">
        <v-text-field
          v-model="nroAdi"
          label="Nro. Adicional"
          type="number"
          density="compact"
          variant="outlined"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6" md="2">
        <v-select
          v-model="month"
          label="Mes"
          :items="months"
          density="compact"
          variant="outlined"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6" md="2">
        <v-text-field
          v-model="year"
          label="Año"
          type="number"
          density="compact"
          variant="outlined"
          hide-details
        />
      </v-col>
      <v-col v-if="props.esley" cols="auto" class="d-flex align-center">
        <v-checkbox
          v-model="esLey"
          :label="esLey ? 'Ley Especial (1)' : 'Liquidación Efectivo (0)'"
          :color="esLey ? 'purple-darken-1' : 'primary'"
          density="compact"
          hide-details
        />
      </v-col>
      <v-col v-if="$slots.default" cols="auto" class="d-flex align-center">
        <slot></slot>
      </v-col>
      <v-col cols="auto" class="d-flex align-center ms-auto">
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-filter-check-outline"
          @click="handleClick"
        >
          Aplicar
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>
