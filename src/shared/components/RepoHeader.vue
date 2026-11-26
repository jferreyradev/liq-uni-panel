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
  showSearch: {
    type: Boolean,
    default: false,
  },
  searchPlaceholder: {
    type: String,
    default: "Buscar en la tabla...",
  },
});

const search = defineModel("search", {
  type: String,
  default: undefined,
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

      <!-- Slot para búsqueda y botones de acción (Descargar Excel, Mostrar Tabla, etc.) -->
      <div v-if="$slots.default || props.showSearch || search !== undefined" class="d-flex align-center flex-wrap ga-2">
        <v-text-field
          v-if="props.showSearch || search !== undefined"
          v-model="search"
          :placeholder="props.searchPlaceholder"
          prepend-inner-icon="mdi-magnify"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          bg-color="white"
          style="min-width: 200px; max-width: 280px;"
        />
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
