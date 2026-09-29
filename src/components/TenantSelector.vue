<script setup>
import { computed } from 'vue'
import { useTenantStore } from '@/stores/tenantStore'
import { useFilterStore } from '@/stores/filterStore'
import { useLiqStore } from '@/stores/liqStore'

const tenantStore = useTenantStore()
const filterStore = useFilterStore()
const liqStore = useLiqStore()

const tenants = computed(() => tenantStore.tenantsList)
const activeTenant = computed(() => tenantStore.activeTenant)

async function selectTenant(tenantId) {
  if (tenantStore.activeTenantId === tenantId) return

  tenantStore.setTenant(tenantId)

  // Limpiar filtros o datos dependientes del tenant previo
  if (liqStore) {
    try {
      liqStore.$reset()
    } catch {
      // Ignorar si el store no define reset
    }
  }

  // Refrescar configuración y período del nuevo municipio
  await filterStore.setConfig()
  await filterStore.setPer()
}
</script>

<template>
  <div class="tenant-selector-wrapper">
    <v-menu location="bottom end" transition="scale-transition">
      <template v-slot:activator="{ props }">
        <v-btn
          v-bind="props"
          variant="tonal"
          color="white"
          class="tenant-btn text-none px-3"
          prepend-icon="mdi-city-variant-outline"
          append-icon="mdi-chevron-down"
        >
          <span class="d-none d-sm-inline font-weight-medium me-1">Municipio:</span>
          <strong>{{ activeTenant.shortName }}</strong>
        </v-btn>
      </template>

      <v-list density="compact" class="py-1 tenant-dropdown" min-width="260">
        <v-list-subheader class="text-uppercase text-caption font-weight-bold">
          Seleccionar Municipio
        </v-list-subheader>

        <v-list-item
          v-for="tenant in tenants"
          :key="tenant.id"
          :value="tenant.id"
          :active="tenant.id === activeTenant.id"
          color="primary"
          @click="selectTenant(tenant.id)"
          class="py-2"
        >
          <template v-slot:prepend>
            <v-avatar size="32" class="me-2" rounded="sm">
              <v-img v-if="tenant.logo" :src="tenant.logo" alt="Logo" />
              <v-icon v-else icon="mdi-city"></v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="font-weight-medium text-body-2">
            {{ tenant.name }}
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            Puerto: {{ tenant.projectPort }} &bull; Key: {{ tenant.projectKey }}
          </v-list-item-subtitle>

          <template v-slot:append>
            <v-icon
              v-if="tenant.id === activeTenant.id"
              icon="mdi-check"
              color="primary"
              size="small"
            ></v-icon>
          </template>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<style scoped>
.tenant-selector-wrapper {
  display: inline-flex;
  align-items: center;
}

.tenant-btn {
  border: 1px solid rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(4px);
}

.tenant-dropdown {
  border-radius: 8px;
}
</style>
