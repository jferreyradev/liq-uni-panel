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
  <v-container>
    <v-row class="pa-0 ma-0">
      <v-col v-if="props.tipoliq" align-self="center">
        <v-select
          v-model="liqSelected"
          label="Liquidación"
          :items="liq"
          item-title="name"
          item-value="value"
          return-object
        >
        </v-select>
      </v-col>
      <v-col v-if="props.nroadi">
        <v-text-field
          v-model="nroAdi"
          label="Nro. Adicional"
          required
        ></v-text-field>
      </v-col>
      <v-col>
        <v-select v-model="month" label="Mes" :items="months"></v-select>
      </v-col>
      <v-col>
        <v-text-field
          v-model="year"
          label="Año"
          required
          type="number"
        ></v-text-field>
      </v-col>
      <v-col v-if="props.esley" align-self="center">
        <v-checkbox
          v-model="esLey"
          label="Es Ley"
          density="compact"
          hide-details
        ></v-checkbox>
      </v-col>
      <v-col v-if="$slots.default" align-self="center">
        <slot></slot>
      </v-col>
      <v-col align-self="center">
        <v-btn color="primary" @click="handleClick"> enviar </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>
