<script setup>
const props = defineProps({
  title: {
    type: String,
    default: "",
  },
  subtitle: {
    type: String,
    default: "",
  },
  icon: {
    type: String,
    default: "mdi-file-chart-outline",
  },
});
</script>

<template>
  <v-card class="elevation-0 border rounded-lg mb-3 bg-grey-lighten-5">
    <div class="pa-3 d-flex align-center justify-space-between flex-wrap ga-3">
      <!-- Título y Subtítulo con Icono -->
      <div class="d-flex align-center flex-wrap ga-2">
        <v-avatar color="primary" size="32" class="text-white" variant="flat">
          <v-icon :icon="props.icon" size="small" />
        </v-avatar>
        <div>
          <div class="text-subtitle-1 font-weight-bold text-primary lh-sm">
            {{ props.title }}
          </div>
          <div v-if="props.subtitle" class="text-caption text-medium-emphasis">
            {{ props.subtitle }}
          </div>
        </div>
      </div>

      <!-- Slot para botones de acción (Descargar Excel, Mostrar Tabla, etc.) -->
      <div v-if="$slots.default" class="d-flex align-center flex-wrap ga-2">
        <slot></slot>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.lh-sm {
  line-height: 1.25;
}
</style>
