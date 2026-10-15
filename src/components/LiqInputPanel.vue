<script setup>
import LiqInputPanel from "@/shared/components/LiqInputPanel.vue";
const props = defineProps({
  tipoliq: {
    type: Boolean,
    default: true,
  },
  nroadi: {
    type: Boolean,
    default: true,
  },
});
const emit = defineEmits(["submit"]);
</script>

<template>
  <LiqInputPanel v-bind="props" @submit="emit('submit')">
    <slot />
  </LiqInputPanel>
</template>
