<script setup>
import { ref, computed, watchEffect } from 'vue'
import { useTheme } from 'vuetify'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useItemsMenu } from '@/composables/useItemsMenu'
import { useFilterStore } from '@/stores/filterStore'
import { useTenantStore } from '@/stores/tenantStore'
import { useLogStore } from '@/stores/logStore'
import { TenantSelector, DiagnosticDialog } from '@/shared/components'

const storeFilter = useFilterStore()
const tenantStore = useTenantStore()
const store = useUserStore()
const logStore = useLogStore()
const { itemsMenu, setItemsMenu } = useItemsMenu()

// El logo del municipio es un recurso remoto: si no carga, se cae al ícono.
const logoFallo = ref(false)

const allModules = [
  { title: 'Panel Principal', route: '/panel', icon: 'mdi-view-dashboard' },
  { title: 'Boletas de Sueldo', route: '/boletas', icon: 'mdi-file-document-outline' },
  { title: 'Agentes y Legajos', route: '/agentes', icon: 'mdi-account-group' },
  { title: 'Cargos', route: '/cargos', icon: 'mdi-badge-account' },
  { title: 'Conceptos por Cargo', route: '/conceptos', icon: 'mdi-format-list-checks', isNew: true },
  { title: 'Novedades y Hojas', route: '/hojas', icon: 'mdi-notebook-edit-outline' },
  { title: 'Operaciones', route: '/operaciones', icon: 'mdi-cogs', isNew: true },
  { title: 'Acreditaciones', route: '/acredit', icon: 'mdi-bank-transfer' },
  { title: 'Previsional', route: '/prevision', icon: 'mdi-shield-check' },
  { title: 'Obra Social IPSST', route: '/ipsst', icon: 'mdi-hospital-box' },
  { title: 'Reportes y Planillas', route: '/repo', icon: 'mdi-chart-box-outline' }
]

function getMenuIcon(path, descripcion = '') {
  const p = (path || '').toLowerCase().trim()
  const d = (descripcion || '').toLowerCase().trim()
  const match = allModules.find((m) => m.route === p)
  if (match) return match.icon
  if (p === '/' || d.includes('inicio')) return 'mdi-home'
  if (p.includes('panel') || d.includes('panel')) return 'mdi-view-dashboard'
  if (p.includes('boleta') || d.includes('boleta')) return 'mdi-file-document-outline'
  if (p.includes('agente') || d.includes('agente')) return 'mdi-account-group'
  if (p.includes('cargo') && !p.includes('concepto') && !d.includes('concepto')) return 'mdi-badge-account'
  if (p.includes('concepto') || d.includes('concepto')) return 'mdi-format-list-checks'
  if (p.includes('hoja') || p.includes('novedad') || d.includes('novedad')) return 'mdi-notebook-edit-outline'
  if (p.includes('operacion') || p.includes('proceso') || d.includes('operacion') || d.includes('proceso')) return 'mdi-cogs'
  if (p.includes('acredit') || d.includes('acredit')) return 'mdi-bank-transfer'
  if (p.includes('previs') || d.includes('previs')) return 'mdi-shield-check'
  if (p.includes('ipsst') || p.includes('archivo') || d.includes('ipsst')) return 'mdi-hospital-box'
  if (p.includes('repo') || d.includes('reporte')) return 'mdi-chart-box-outline'
  return 'mdi-circle-small'
}

const currentModuleName = computed(() => {
  const currentPath = router.currentRoute.value.path
  if (currentPath === '/') return 'Inicio'
  const found = allModules.find((m) => m.route === currentPath)
  return found ? found.title : 'Navegación'
})

const navItems = computed(() => {
  const source = (itemsMenu.value && Array.isArray(itemsMenu.value) && itemsMenu.value.length > 0)
    ? itemsMenu.value
    : (store.rol && Array.isArray(store.rol) && store.rol.length > 0)
      ? store.rol
      : []

  const list = [...source]

  // Siempre asegurar /operaciones y /conceptos en la lista
  if (!list.some((i) => (i.PATH || '').toLowerCase().trim() === '/operaciones')) {
    list.push({ IDMENU: 8, DESCRIPCION: 'Operaciones', PATH: '/operaciones' })
  }
  if (!list.some((i) => {
    const p = (i.PATH || '').toLowerCase().trim()
    return p === '/conceptos' || p === '/conceptos-cargo'
  })) {
    list.push({ IDMENU: 9, DESCRIPCION: 'Conceptos por Cargo', PATH: '/conceptos' })
  }

  const seenPaths = new Set()
  return list.filter((item) => {
    let key = (item.PATH || '').toLowerCase().trim()
    if (key === '/procesos') {
      key = '/operaciones'
      item.PATH = '/operaciones'
      item.DESCRIPCION = 'Operaciones'
    }
    if (key === '/conceptos-cargo') {
      key = '/conceptos'
      item.PATH = '/conceptos'
    }
    if (!key || seenPaths.has(key)) return false
    seenPaths.add(key)
    return true
  })
})

const theme = useTheme()
const router = useRouter()
const drawer = ref(false)

watchEffect(() => {
  const shortName = tenantStore?.tenantShortName
  document.title = shortName ? `Liq Panel — ${shortName}` : 'Liq Panel'
})

// Sincronizar items de menú si ya está logueado pero el composable no se inicializó
if (store.auth && (!itemsMenu.value || itemsMenu.value.length === 0)) {
  if (store.rol && store.rol.length > 0) {
    setItemsMenu(store.rol)
  } else {
    store.fetchRol().then(() => {
      setItemsMenu(store.rol)
    })
  }
}

// configServer solo se consulta una vez que el usuario está logueado
if (store.auth) {
  storeFilter.setConfig()
}

function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
}

function handleLogout() {
  store.$reset()
  storeFilter.serverConfig = {}
  storeFilter.serverConfigError = null
  router.push('/login')
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
        <v-img
          v-if="tenantStore.tenantLogo && !logoFallo"
          :src="tenantStore.tenantLogo"
          alt="Logo"
          @error="logoFallo = true"
        />
        <v-icon v-else icon="mdi-shield-account"></v-icon>
      </v-avatar>

      <v-app-bar-title class="font-weight-bold text-truncate">
        Liquidación — {{ tenantStore.tenantName }}
      </v-app-bar-title>

      <v-spacer></v-spacer>

      <!-- Selector de Módulo -->
      <div v-if="store.auth" class="me-2">
        <v-menu location="bottom end" transition="scale-transition">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              variant="tonal"
              color="white"
              class="text-none px-3"
              prepend-icon="mdi-apps"
              append-icon="mdi-chevron-down"
            >
              <span class="d-none d-sm-inline font-weight-medium me-1">Módulo:</span>
              <strong>{{ currentModuleName }}</strong>
            </v-btn>
          </template>

          <v-list density="compact" class="py-1" min-width="260">
            <v-list-subheader class="text-uppercase text-caption font-weight-bold">
              Seleccionar Módulo
            </v-list-subheader>

            <v-list-item
              v-for="mod in allModules"
              :key="mod.route"
              :active="$route.path === mod.route"
              :prepend-icon="mod.icon"
              :title="mod.title"
              color="primary"
              class="py-1"
              @click="router.push(mod.route)"
            >
              <template v-if="mod.isNew" #append>
                <v-chip size="x-small" color="primary" variant="flat" class="font-weight-bold">
                  NUEVO
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>

      <!-- Selector de Municipio / Tenant -->
      <div class="me-2">
        <TenantSelector />
      </div>

      <!-- Indicador de Base de Datos Conectada (view/configServer) - solo visible una vez logueado -->
      <v-chip
        v-if="store.auth"
        size="small"
        class="me-1 font-weight-medium"
        :color="storeFilter.hasServerConfig ? 'white' : (storeFilter.serverConfigError ? 'error' : 'grey-lighten-2')"
        :variant="storeFilter.hasServerConfig ? 'outlined' : 'tonal'"
        style="cursor: pointer;"
        @click="logStore.openDialog"
      >
        <v-icon
          :icon="storeFilter.serverConfigLoading ? 'mdi-loading mdi-spin' : (storeFilter.hasServerConfig ? 'mdi-database-check' : (storeFilter.serverConfigError ? 'mdi-database-alert' : 'mdi-database-clock-outline'))"
          start
          size="x-small"
          :color="storeFilter.hasServerConfig ? 'light-green-accent-3' : undefined"
        ></v-icon>
        <span class="text-caption font-weight-bold">
          BD: {{ storeFilter.serverDescripcion || storeFilter.serverAmbiente || (storeFilter.serverConfigLoading ? 'Conectando...' : 'Sin BD') }}
        </span>
        <v-tooltip activator="parent" location="bottom">
          <div class="text-caption">
            <div><strong>Base de Datos Conectada (view/configServer):</strong></div>
            <div>&bull; Descripción: <strong>{{ storeFilter.serverDescripcion || 'Pendiente' }}</strong></div>
            <div>&bull; Ambiente: <strong>{{ storeFilter.serverAmbiente || 'Pendiente' }}</strong></div>
            <div v-if="storeFilter.serverCela">&bull; CELA: {{ storeFilter.serverCela }}</div>
            <div v-if="storeFilter.serverIdConf">&bull; ID Config: {{ storeFilter.serverIdConf }} (Rep: {{ storeFilter.serverIdRep }})</div>
            <div v-if="storeFilter.serverConfigError" class="text-red-accent-2 mt-1">
              Error al consultar configServer: {{ storeFilter.serverConfigError }}
            </div>
            <div class="mt-1 text-grey-lighten-2">Clic para abrir Diagnóstico y Logs.</div>
          </div>
        </v-tooltip>
      </v-chip>

      <!-- Conmutador Tema Claro/Oscuro -->
      <v-btn icon="mdi-theme-light-dark" size="small" class="me-1" @click="toggleTheme">
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
          <template #activator="{ props }">
            <v-btn icon="mdi-account-circle" v-bind="props" size="small">
              <v-icon icon="mdi-account-circle"></v-icon>
            </v-btn>
          </template>

          <v-list density="compact" min-width="220">
            <v-list-item
              :subtitle="store.user?.EMAIL || ''"
              :title="store.user?.USERNAME || store.user?.NOMBRE || 'Usuario'"
            >
              <template #prepend>
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
          :active="$route.path === '/'"
          @click="router.push('/')"
        />

        <template v-if="navItems && navItems.length > 0">
          <v-list-item
            v-for="item in navItems"
            :key="item.IDMENU || item.PATH"
            :prepend-icon="getMenuIcon(item.PATH, item.DESCRIPCION)"
            :title="item.DESCRIPCION"
            :active="$route.path === item.PATH"
            @click="router.push(item.PATH)"
          >
            <template v-if="item.PATH === '/operaciones' || item.PATH === '/conceptos' || item.PATH === '/conceptos-cargo'" #append>
              <v-chip size="x-small" color="primary" variant="flat" class="font-weight-bold">
                NUEVO
              </v-chip>
            </template>
          </v-list-item>
        </template>

        <!-- Enlaces rápidos directos si el menú por rol aún no cargó -->
        <template v-else>
          <v-list-subheader>Módulos</v-list-subheader>
          <v-list-item prepend-icon="mdi-view-dashboard" title="Panel Principal" @click="router.push('/panel')" />
          <v-list-item prepend-icon="mdi-file-document-outline" title="Boletas" @click="router.push('/boletas')" />
          <v-list-item prepend-icon="mdi-account-group" title="Agentes" @click="router.push('/agentes')" />
          <v-list-item prepend-icon="mdi-badge-account" title="Cargos" @click="router.push('/cargos')" />
          <v-list-item prepend-icon="mdi-format-list-checks" title="Conceptos por Cargo" @click="router.push('/conceptos')" />
          <v-list-item prepend-icon="mdi-notebook-edit-outline" title="Novedades" @click="router.push('/hojas')" />
          <v-list-item prepend-icon="mdi-cogs" title="Operaciones" @click="router.push('/operaciones')" />
          <v-list-item prepend-icon="mdi-bank-transfer" title="Acreditaciones" @click="router.push('/acredit')" />
          <v-list-item prepend-icon="mdi-shield-check" title="Previsional" @click="router.push('/prevision')" />
          <v-list-item prepend-icon="mdi-hospital-box" title="Obra Social IPSST" @click="router.push('/ipsst')" />
          <v-list-item prepend-icon="mdi-chart-box-outline" title="Reportes" @click="router.push('/repo')" />
        </template>

        <v-divider class="my-2"></v-divider>
        <v-list-item
          prepend-icon="mdi-logout"
          title="Cerrar sesión"
          color="error"
          @click="handleLogout"
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
          <template v-if="store.auth">
            <span class="mx-2 text-grey-lighten-1">|</span>
            <v-icon
              :icon="storeFilter.hasServerConfig ? 'mdi-database-check' : (storeFilter.serverConfigError ? 'mdi-database-alert' : 'mdi-database-clock-outline')"
              size="14"
              :color="storeFilter.hasServerConfig ? 'success' : (storeFilter.serverConfigError ? 'error' : 'warning')"
              class="me-1"
            ></v-icon>
            <span>
              BD Conectada:
              <strong :class="storeFilter.hasServerConfig ? 'text-success' : (storeFilter.serverConfigError ? 'text-error' : '')">
                {{ storeFilter.serverDescripcion || storeFilter.serverAmbiente || (storeFilter.serverConfigLoading ? 'Consultando BD...' : 'Sin conexión a BD') }}
              </strong>
              <span v-if="storeFilter.serverAmbiente && storeFilter.serverDescripcion !== storeFilter.serverAmbiente"> ({{ storeFilter.serverAmbiente }})</span>
              <span v-if="storeFilter.serverCela" class="text-medium-emphasis"> &bull; CELA: {{ storeFilter.serverCela }}</span>
            </span>
          </template>
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
