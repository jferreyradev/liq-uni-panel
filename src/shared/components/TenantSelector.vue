<script setup>
import { ref, computed, reactive } from 'vue'
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
const isPredetermined = computed(() => Boolean(tenantStore.isPredeterminedByServer && filterStore.hasServerConfig))

const dialogBloqueado = ref(false)

// Los logos son recursos remotos: si alguno no carga, se marca para
// mostrar el ícono por defecto en lugar de una imagen rota.
const logosFallidos = reactive({})

async function selectTenant(tenantId) {
  if (tenantStore.activeTenantId === tenantId) return

  // Si el municipio ya está predeterminado por configServer, no permitir mezclar reparticiones
  if (isPredetermined.value) {
    dialogBloqueado.value = true
    return
  }

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
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          variant="tonal"
          color="white"
          class="tenant-btn text-none px-3"
          :prepend-icon="activeTenant.id === 'desarrollo' ? 'mdi-flask' : (isPredetermined ? 'mdi-database-check' : 'mdi-city-variant-outline')"
          append-icon="mdi-chevron-down"
        >
          <span class="d-none d-sm-inline font-weight-medium me-1">Municipio:</span>
          <strong>{{ activeTenant.shortName }}</strong>
          <v-chip
            v-if="isPredetermined"
            size="x-small"
            color="light-green-accent-3"
            variant="flat"
            class="ms-2 font-weight-bold text-black"
          >
            BD
          </v-chip>
        </v-btn>
      </template>

      <v-list density="compact" class="py-1 tenant-dropdown" min-width="280">
        <div v-if="isPredetermined" class="pa-3 bg-blue-grey-lighten-5 border-b">
          <div class="d-flex align-center font-weight-bold text-caption text-primary">
            <v-icon icon="mdi-database-check" size="small" class="me-1" color="primary"></v-icon>
            Predeterminado por base de datos
          </div>
          <div class="text-caption text-medium-emphasis mt-1">
            Fijado por <code>configServer</code> (IDREP: {{ filterStore.serverIdRep }}{{ filterStore.serverCela ? ` - CELA: ${filterStore.serverCela}` : '' }}) para evitar mezclar reparticiones.
          </div>
        </div>

        <v-list-subheader class="text-uppercase text-caption font-weight-bold">
          {{ isPredetermined ? 'Municipio Conectado' : 'Seleccionar Municipio' }}
        </v-list-subheader>

        <v-list-item
          v-for="tenant in tenants"
          :key="tenant.id"
          :value="tenant.id"
          :active="tenant.id === activeTenant.id"
          :disabled="isPredetermined && tenant.id !== activeTenant.id"
          color="primary"
          class="py-2"
          @click="selectTenant(tenant.id)"
        >
          <template #prepend>
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

          <template #append>
            <v-icon
              v-if="tenant.id === activeTenant.id"
              icon="mdi-check"
              color="primary"
              size="small"
            ></v-icon>
            <v-icon
              v-else-if="isPredetermined"
              icon="mdi-lock-outline"
              color="grey"
              size="x-small"
            ></v-icon>
          </template>
        </v-list-item>
      </v-list>
    </v-menu>

    <!-- Dialogo explicativo si intenta cambiar mientras esta predeterminado por el servidor -->
    <v-dialog v-model="dialogBloqueado" max-width="480">
      <v-card>
        <v-card-title class="d-flex align-center bg-blue-grey-lighten-5 py-3">
          <v-icon icon="mdi-shield-lock" color="primary" class="me-2"></v-icon>
          <span class="text-subtitle-1 font-weight-bold">Municipio Predeterminado</span>
        </v-card-title>
        <v-card-text class="pa-4 text-body-2">
          El servidor conectado pertenece a <strong>{{ activeTenant.name }}</strong> según la vista
          <code>view/configServer</code> (IDREP: <strong>{{ filterStore.serverIdRep }}</strong>{{ filterStore.serverCela ? `, CELA: ${filterStore.serverCela}` : '' }}).
          <br /><br />
          Para evitar mezclar reparticiones o inconsistencias de liquidación, el municipio está bloqueado al asignado por la base de datos actual.
          <br /><br />
          Si desea operar con otra repartición o municipio, utilice el menú <strong>Servidor API</strong> para conectar con el servidor correspondiente.
        </v-card-text>
        <v-card-actions class="px-4 pb-3 justify-end">
          <v-btn color="primary" variant="flat" @click="dialogBloqueado = false">Entendido</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
