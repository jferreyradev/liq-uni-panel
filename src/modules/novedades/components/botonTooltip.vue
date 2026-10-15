<script setup>
import TooltipButton from "@/shared/components/TooltipButton.vue";
const props = defineProps(["icono", "toolMsg", "funcion", "itemid"]);
</script>

<template>
  <TooltipButton v-bind="props" />
</template>
