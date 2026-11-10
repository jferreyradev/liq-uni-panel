<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useEndPoints } from '@/composables/useEndPoints'
import { useUserStore } from '@/stores/userStore'
import { useFilterStore } from '@/stores/filterStore'
import { useLogStore } from '@/stores/logStore'

const props = defineProps({
  variant: {
    type: String,
    default: 'tonal'
  },
  color: {
    type: String,
    default: 'white'
  },
  density: {
    type: String,
    default: 'compact'
  },
  showLabel: {
    type: Boolean,
    default: true
  }
})

const router = useRouter()
const userStore = useUserStore()
const filterStore = useFilterStore()
const logStore = useLogStore()

const {
  apiEnvironments,
  activeEnvId,
  activeEnvironment,
  setApiEnvironment
} = useEndPoints()

const currentEnvLabel = computed(() => {
  return activeEnvironment.value?.nombre || 'Servidor API'
})

function handleSelectEnv(envId) {
  if (activeEnvId.value === envId) return

  setApiEnvironment(envId)

  // Cierre de sesión por seguridad al cambiar de backend
  userStore.$reset()
  filterStore.serverConfig = {}
  filterStore.serverConfigError = null

  if (router?.currentRoute?.value?.path !== '/login') {
    router.push('/login')
  }
}
</script>

<template>
  <div class="api-env-selector-wrapper">
    <v-menu location="bottom end" transition="scale-transition">
      <template #activator="{ props: menuProps }">
        <v-btn
          v-bind="menuProps"
          :variant="props.variant"
          :color="props.color"
          :density="props.density"
          class="text-none px-3 font-weight-medium rounded-pill"
          prepend-icon="mdi-server-network"
          append-icon="mdi-chevron-down"
        >
          <span v-if="props.showLabel" class="d-none d-sm-inline me-1 text-caption text-medium-emphasis">
            Servidor:
          </span>
          <strong class="text-caption">{{ currentEnvLabel }}</strong>
        </v-btn>
      </template>

      <v-list density="compact" class="py-1 env-dropdown" min-width="300" max-width="360">
        <v-list-subheader class="text-uppercase text-caption font-weight-bold d-flex align-center justify-space-between">
          <span>Servidores API Disponibles</span>
          <v-chip size="x-small" color="primary" variant="flat">
            {{ apiEnvironments.length }}
          </v-chip>
        </v-list-subheader>

        <v-list-item
          v-for="item in apiEnvironments"
          :key="item.id"
          :value="item.id"
          :active="item.id === activeEnvId"
          color="primary"
          class="py-2 mb-1 rounded"
          @click="handleSelectEnv(item.id)"
        >
          <template #prepend>
            <v-avatar size="32" class="me-2" :color="item.id === activeEnvId ? 'primary' : 'grey-lighten-3'">
              <v-icon
                :icon="item.id.includes('desa') || item.id.includes('local') ? 'mdi-laptop' : 'mdi-cloud-outline'"
                :color="item.id === activeEnvId ? 'white' : 'grey-darken-2'"
                size="small"
              ></v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="font-weight-bold text-caption">
            {{ item.nombre }}
          </v-list-item-title>

          <v-list-item-subtitle class="text-caption font-mono text-truncate" style="font-size: 11px !important;">
            {{ item.url }}
          </v-list-item-subtitle>

          <template #append>
            <div class="d-flex flex-column align-end">
              <v-chip
                size="x-small"
                :color="item.apiKey ? 'success' : 'warning'"
                variant="tonal"
                class="font-weight-medium"
                style="font-size: 10px;"
              >
                {{ item.apiKey ? 'Key OK' : 'Sin Key' }}
              </v-chip>
              <v-icon
                v-if="item.id === activeEnvId"
                icon="mdi-check-circle"
                color="primary"
                size="x-small"
                class="mt-1"
              ></v-icon>
            </div>
          </template>
        </v-list-item>

        <v-divider class="my-1"></v-divider>

        <v-list-item
          class="text-caption text-primary font-weight-medium"
          prepend-icon="mdi-cog-outline"
          @click="logStore.openDialog"
        >
          Administrar Servidores en Diagnóstico...
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<style scoped>
.font-mono {
  font-family: monospace;
}
.env-dropdown {
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}
</style>
