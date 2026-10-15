<script setup>
import RepoHeader from "@/shared/components/RepoHeader.vue";
const props = defineProps(["title", "subtitle"]);
</script>
<template>
  <RepoHeader v-bind="props">
    <slot />
  </RepoHeader>
</template>
