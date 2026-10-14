<script setup>
import { ref } from 'vue'
import { useTheme } from 'vuetify'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useEndPoints } from '@/composables/useEndPoints'
import { useItemsMenu } from '@/composables/useItemsMenu'
import { useFilterStore } from '@/stores/filterStore'
import { useTenantStore } from '@/stores/tenantStore'
import { useLogStore } from '@/stores/logStore'
import TenantSelector from '@/components/TenantSelector.vue'
import DiagnosticDialog from '@/components/common/DiagnosticDialog.vue'

const { setDesa, setProd, env } = useEndPoints()
const storeFilter = useFilterStore()
const tenantStore = useTenantStore()
const store = useUserStore()
const logStore = useLogStore()
const { itemsMenu, setItemsMenu } = useItemsMenu()

const theme = useTheme()
const router = useRouter()
const drawer = ref(false)

// setProd() se eliminó para respetar el ambiente guardado en localStorage
storeFilter.setConfig()

function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
}

function handleLogout() {
  store.$reset()
  router.push('/login')
}

async function changeEnv() {
  if (env.value === 'Desa') {
    setProd()
  } else {
    setDesa()
  }
  // Si estaba autenticado, cerramos la sesión para evitar cruce de credenciales
  if (store.auth) {
    store.$reset()
    router.push('/login')
  }
  await storeFilter.setConfig()
}
</script>

<template>
  <v-layout class="rounded rounded-md d-flex flex-column min-h-screen">
    <v-app-bar color="primary" prominent elevation="2">
      <v-app-bar-nav-icon
        v-if="store.auth"
        variant="text"
        @click.stop="drawer = !drawer"
      ></v-app-bar-nav-icon>

      <v-avatar size="36" class="me-2 d-none d-md-flex" rounded="sm">
        <v-img v-if="tenantStore.tenantLogo" :src="tenantStore.tenantLogo" alt="Logo" />
        <v-icon v-else icon="mdi-shield-account"></v-icon>
      </v-avatar>

      <v-app-bar-title class="font-weight-bold text-truncate">
        Liquidación — {{ tenantStore.tenantName }}
      </v-app-bar-title>

      <v-spacer></v-spacer>

      <!-- Selector de Municipio / Tenant -->
      <div class="me-2">
        <TenantSelector />
      </div>

      <!-- Conmutador de Ambiente (Producción / Desarrollo) -->
      <v-btn
        class="text-caption me-1 font-weight-bold"
        :color="env === 'Desa' ? 'warning' : 'white'"
        :variant="env === 'Desa' ? 'flat' : 'tonal'"
        @click="changeEnv"
        size="small"
      >
        <v-icon :icon="env === 'Desa' ? 'mdi-flask' : 'mdi-server'" start size="small"></v-icon>
        {{ env === 'Desa' ? 'Desarrollo' : 'Producción' }}
        <v-tooltip activator="parent" location="bottom">
          {{ env === 'Desa' ? 'Ambiente de pruebas activo. Clic para cambiar a Producción.' : 'Ambiente de producción activo. Clic para cambiar a Desarrollo.' }}
        </v-tooltip>
      </v-btn>

      <!-- Conmutador Tema Claro/Oscuro -->
      <v-btn @click="toggleTheme" icon="mdi-theme-light-dark" size="small" class="me-1">
        <v-tooltip activator="parent" location="bottom">Cambiar tema</v-tooltip>
        <v-icon icon="mdi-theme-light-dark"></v-icon>
      </v-btn>

      <!-- Botón Diagnóstico y Logs -->
      <v-btn
        icon="mdi-bug-outline"
        size="small"
        class="me-1"
        :color="logStore.hasErrors ? 'error' : undefined"
        @click="logStore.openDialog"
      >
        <v-tooltip activator="parent" location="bottom">Diagnóstico y Logs del Sistema</v-tooltip>
        <v-icon icon="mdi-bug-outline"></v-icon>
      </v-btn>

      <!-- Botón Salir Rápido -->
      <v-btn v-if="store.isAuth" icon="mdi-logout" size="small" class="me-1" @click="handleLogout">
        <v-tooltip activator="parent" location="bottom">Cerrar sesión</v-tooltip>
        <v-icon icon="mdi-logout"></v-icon>
      </v-btn>

      <!-- Menú de Usuario -->
      <div v-if="store.auth">
        <v-menu location="bottom end">
          <template v-slot:activator="{ props }">
            <v-btn icon="mdi-account-circle" v-bind="props" size="small">
              <v-icon icon="mdi-account-circle"></v-icon>
            </v-btn>
          </template>

          <v-list density="compact" min-width="220">
            <v-list-item
              :subtitle="store.user?.EMAIL || ''"
              :title="store.user?.USERNAME || store.user?.NOMBRE || 'Usuario'"
            >
              <template v-slot:prepend>
                <v-icon icon="mdi-account"></v-icon>
              </template>
            </v-list-item>

            <v-divider></v-divider>
            <v-list-item
              prepend-icon="mdi-lock-reset"
              title="Cambiar contraseña"
              @click="router.push('/passchange')"
            />
            <v-list-item
              prepend-icon="mdi-logout"
              title="Cerrar sesión"
              @click="handleLogout"
            />
          </v-list>
        </v-menu>
      </div>
    </v-app-bar>

    <!-- Drawer de Navegación -->
    <v-navigation-drawer
      v-model="drawer"
      :location="$vuetify.display.mobile ? 'bottom' : undefined"
      temporary
      width="280"
    >
      <div class="pa-4 bg-primary text-white">
        <div class="text-subtitle-1 font-weight-bold">{{ tenantStore.tenantShortName }}</div>
        <div class="text-caption opacity-80">{{ tenantStore.tenantLocation }}</div>
      </div>

      <v-divider></v-divider>

      <v-list density="comfortable" nav>
        <v-list-item
          prepend-icon="mdi-home"
          title="Inicio"
          @click="router.push('/')"
          :active="$route.path === '/'"
        />

        <template v-if="itemsMenu && itemsMenu.length > 0">
          <v-list-item
            v-for="item in itemsMenu"
            :key="item.IDMENU"
            :title="item.DESCRIPCION"
            @click="router.push(item.PATH)"
            :active="$route.path === item.PATH"
          />
        </template>

        <!-- Enlaces rápidos directos si el menú por rol aún no cargó -->
        <template v-else>
          <v-list-subheader>Módulos</v-list-subheader>
          <v-list-item prepend-icon="mdi-view-dashboard" title="Panel Principal" @click="router.push('/panel')" />
          <v-list-item prepend-icon="mdi-file-document-outline" title="Boletas" @click="router.push('/boletas')" />
          <v-list-item prepend-icon="mdi-account-group" title="Agentes" @click="router.push('/agentes')" />
          <v-list-item prepend-icon="mdi-badge-account" title="Cargos" @click="router.push('/cargos')" />
          <v-list-item prepend-icon="mdi-notebook-edit-outline" title="Novedades" @click="router.push('/hojas')" />
          <v-list-item prepend-icon="mdi-cogs" title="Procesos" @click="router.push('/procesos')" />
          <v-list-item prepend-icon="mdi-bank-transfer" title="Acreditaciones" @click="router.push('/acredit')" />
          <v-list-item prepend-icon="mdi-shield-check" title="Previsional" @click="router.push('/prevision')" />
          <v-list-item prepend-icon="mdi-chart-box-outline" title="Reportes" @click="router.push('/repo')" />
          <v-list-item prepend-icon="mdi-folder" title="Archivos" @click="router.push('/archivos')" />
        </template>

        <v-divider class="my-2"></v-divider>
        <v-list-item
          prepend-icon="mdi-logout"
          title="Cerrar sesión"
          @click="handleLogout"
          color="error"
        />
      </v-list>
    </v-navigation-drawer>

    <!-- Contenido Principal -->
    <v-main class="bg-grey-lighten-4 min-h-screen">
      <v-container fluid class="pa-4">
        <v-row justify="center">
          <v-col cols="12">
            <RouterView />
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <!-- Pie de Página -->
    <v-footer class="bg-grey-lighten-3 border-t">
      <v-row justify="center" no-gutters>
        <v-col class="text-center py-2 text-caption text-grey-darken-1" cols="12">
          {{ new Date().getFullYear() }} —
          <strong>{{ tenantStore.tenantName }}</strong> &bull;
          <span>{{ tenantStore.tenantLocation }}</span>
        </v-col>
      </v-row>
    </v-footer>

    <!-- Componente Global de Diagnóstico -->
    <DiagnosticDialog />
  </v-layout>
</template>

<style scoped>
.min-h-screen {
  min-height: 100vh;
}
</style>
