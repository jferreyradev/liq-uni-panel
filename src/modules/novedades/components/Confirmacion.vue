<script setup>
import ConfirmacionDialog from "@/shared/components/ConfirmacionDialog.vue";
const props = defineProps([
  "titulo",
  "mensaje",
  "cerrar",
  "aceptar",
  "parametro",
]);
</script>

<template>
  <ConfirmacionDialog v-bind="props" />
</template>
