<script setup>
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useTenantStore } from '@/stores/tenantStore'
import { useUserStore } from '@/stores/userStore'
import { useFilterStore } from '@/stores/filterStore'
import { useLiqStore } from '@/stores/liqStore'
import { useEndPoints } from '@/composables/useEndPoints'

const router = useRouter()
const tenantStore = useTenantStore()
const userStore = useUserStore()
const filterStore = useFilterStore()
const liqStore = useLiqStore()
const { setDesa, setProd } = useEndPoints()

const tenants = computed(() => tenantStore.tenantsList)
const activeTenant = computed(() => tenantStore.activeTenant)

// Los logos son recursos remotos: si alguno no carga, se marca para
// mostrar el ícono por defecto en lugar de una imagen rota.
const logosFallidos = reactive({})

async function selectTenant(tenantId) {
  if (tenantStore.activeTenantId === tenantId) return

  tenantStore.setTenant(tenantId)

  // Sincronizar automáticamente: Desarrollo activa Desa, los municipios activan Prod
  if (tenantId === 'desarrollo') {
    setDesa()
  } else {
    setProd()
  }

  // Cada cambio de municipio cierra la sesión por seguridad
  userStore.$reset()

  // Limpiar filtros o datos dependientes del tenant previo
  if (liqStore) {
    try {
      liqStore.$reset()
    } catch {
      // Ignorar si el store no define reset
    }
  }

  // Redirigir a pantalla de login y limpiar configuracion previa
  filterStore.serverConfig = {}
  filterStore.serverConfigError = null
  router.push('/login')
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
          :prepend-icon="activeTenant.id === 'desarrollo' ? 'mdi-flask' : 'mdi-city-variant-outline'"
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
            <v-avatar size="32" class="me-2" rounded="sm" :color="tenant.id === 'desarrollo' ? 'deep-purple-darken-1' : undefined">
              <v-icon v-if="tenant.id === 'desarrollo'" icon="mdi-flask" color="white" size="small"></v-icon>
              <v-img
                v-else-if="tenant.logo && !logosFallidos[tenant.id]"
                :src="tenant.logo"
                alt="Logo"
                @error="logosFallidos[tenant.id] = true"
              />
              <v-icon v-else icon="mdi-city"></v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="font-weight-medium text-body-2 d-flex align-center">
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
