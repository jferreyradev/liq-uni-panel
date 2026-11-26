<script setup>
import { ref, computed, watchEffect, onMounted, onUnmounted } from 'vue'
import { useTheme } from 'vuetify'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useItemsMenu } from '@/composables/useItemsMenu'
import { useFilterStore } from '@/stores/filterStore'
import { useTenantStore } from '@/stores/tenantStore'
import { useLogStore } from '@/stores/logStore'
import { TenantSelector, ApiEnvSelector, DiagnosticDialog, PromptAssistantDialog } from '@/shared/components'

const storeFilter = useFilterStore()
const tenantStore = useTenantStore()
const store = useUserStore()
const logStore = useLogStore()
const { itemsMenu, setItemsMenu } = useItemsMenu()

const mostrarPromptAssistant = ref(false)

// El logo del municipio es un recurso remoto: si no carga, se cae al ícono.
const logoFallo = ref(false)

const allModules = [
  { title: 'Panel Principal', route: '/panel', icon: 'mdi-view-dashboard' },
  { title: 'Boletas de Sueldo', route: '/boletas', icon: 'mdi-file-document-outline' },
  { title: 'Agentes y Legajos', route: '/agentes', icon: 'mdi-account-group' },
  { title: 'Cargos y conceptos a liq.', route: '/conceptos', icon: 'mdi-format-list-checks', isNew: true },
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
  if (p.includes('cargo') || p.includes('concepto') || d.includes('concepto') || d.includes('cargo')) return 'mdi-format-list-checks'
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

const currentModuleIcon = computed(() => {
  const currentPath = router.currentRoute.value.path
  if (currentPath === '/') return 'mdi-home'
  const found = allModules.find((m) => m.route === currentPath)
  return found ? found.icon : 'mdi-apps'
})

const navItems = computed(() => {
  const source = (itemsMenu.value && Array.isArray(itemsMenu.value) && itemsMenu.value.length > 0)
    ? itemsMenu.value
    : (store.rol && Array.isArray(store.rol) && store.rol.length > 0)
      ? store.rol
      : []

  const list = []
  const seenPaths = new Set()
  const seenTitles = new Set()

  for (const rawItem of source) {
    if (!rawItem) continue
    const item = { ...rawItem }
    let path = (item.PATH || '').toLowerCase().trim()
    let desc = (item.DESCRIPCION || '').trim()

    // Normalizar equivalencias de rutas y descripciones
    if (
      path === '/cargos' ||
      path === '/conceptos-cargo' ||
      path === '/conceptos' ||
      desc.toLowerCase().includes('concepto') ||
      desc.toLowerCase().includes('cargo')
    ) {
      path = '/conceptos'
      desc = 'Cargos y conceptos a liq.'
    } else if (
      path === '/procesos' ||
      path === '/operaciones' ||
      path === '/proceso' ||
      path === '/operacion' ||
      desc.toLowerCase() === 'procesos' ||
      desc.toLowerCase() === 'operaciones' ||
      desc.toLowerCase() === 'operación'
    ) {
      path = '/operaciones'
      desc = 'Operaciones'
    } else if (path === '/archivos' || path === '/ipsst' || desc.toLowerCase().includes('ipsst')) {
      path = '/ipsst'
      desc = 'Obra Social IPSST'
    }

    if (!path) continue
    const descKey = desc.toLowerCase()

    // Evitar duplicados tanto por ruta como por descripción
    if (seenPaths.has(path) || (descKey && seenTitles.has(descKey))) {
      continue
    }

    seenPaths.add(path)
    if (descKey) seenTitles.add(descKey)

    list.push({
      ...item,
      PATH: path,
      DESCRIPCION: desc
    })
  }

  // Asegurar que Operaciones y Conceptos existan exactamente una sola vez
  if (!seenPaths.has('/operaciones') && !seenTitles.has('operaciones')) {
    seenPaths.add('/operaciones')
    seenTitles.add('operaciones')
    list.push({ IDMENU: 8, DESCRIPCION: 'Operaciones', PATH: '/operaciones' })
  }

  if (!seenPaths.has('/conceptos') && !seenTitles.has('cargos y conceptos a liq.')) {
    seenPaths.add('/conceptos')
    seenTitles.add('cargos y conceptos a liq.')
    list.push({ IDMENU: 9, DESCRIPCION: 'Cargos y conceptos a liq.', PATH: '/conceptos' })
  }

  return list
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

// Si ya está autenticado, inicializar configuración y período activo del servidor
if (store.auth) {
  storeFilter.init()
}

function toggleTheme() {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
}

let inactivityTimer = null
let lastRecordedActivity = Date.now()

function handleUserActivity() {
  if (!store.auth) return
  const now = Date.now()
  if (now - lastRecordedActivity > 30000) {
    lastRecordedActivity = now
    store.recordActivity()
  }
}

function checkInactivity() {
  if (store.auth && store.checkSessionExpired()) {
    handleLogout(true)
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }))
    inactivityTimer = setInterval(checkInactivity, 60000)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((evt) => window.removeEventListener(evt, handleUserActivity))
    if (inactivityTimer) clearInterval(inactivityTimer)
  }
})

function handleLogout(expired = false) {
  store.logout()
  storeFilter.serverConfig = {}
  storeFilter.serverConfigError = null
  if (expired) {
    router.push({ path: '/login', query: { expired: '1' } })
  } else {
    router.push('/login')
  }
}
</script>

<template>
  <v-layout class="rounded rounded-md d-flex flex-column min-h-screen">
    <v-app-bar color="primary" elevation="2" density="compact" class="px-2">
      <!-- Menú lateral (drawer de módulos) -->
      <v-app-bar-nav-icon
        v-if="store.auth"
        variant="text"
        density="compact"
        class="me-1"
        @click.stop="drawer = !drawer"
      >
        <v-tooltip activator="parent" location="bottom">Menú lateral</v-tooltip>
      </v-app-bar-nav-icon>

      <!-- Marca / Municipio (clic lleva a Inicio) -->
      <div
        class="d-flex align-center me-2 flex-shrink-0"
        style="cursor: pointer; max-width: 240px; min-width: 0;"
        @click="router.push('/')"
      >
        <v-avatar size="28" class="me-2 d-none d-sm-flex flex-shrink-0" rounded="sm">
          <v-img
            v-if="tenantStore.tenantLogo && !logoFallo"
            :src="tenantStore.tenantLogo"
            alt="Logo"
            @error="logoFallo = true"
          />
          <v-icon v-else icon="mdi-shield-account" size="small"></v-icon>
        </v-avatar>

        <div class="text-truncate">
          <span class="font-weight-bold text-caption text-sm-subtitle-2 text-truncate">
            {{ tenantStore.tenantShortName || tenantStore.tenantName }}
          </span>
        </div>
        <v-tooltip activator="parent" location="bottom">Ir a Inicio</v-tooltip>
      </div>

      <v-spacer></v-spacer>

      <!-- Bloque Central: Menú Desplegable con Icono + Selectores -->
      <div class="d-flex align-center ga-1 flex-shrink-1" style="min-width: 0;">
        <!-- Menú Desplegable de Módulos (con icono visible) -->
        <div v-if="store.auth" class="flex-shrink-1 me-1" style="min-width: 0;">
          <v-menu location="bottom end" transition="scale-transition">
            <template #activator="{ props: menuProps }">
              <v-btn
                v-bind="menuProps"
                variant="tonal"
                color="white"
                size="small"
                density="compact"
                class="text-none px-2 flex-shrink-1 text-truncate"
                style="max-width: 220px;"
                :prepend-icon="currentModuleIcon"
                append-icon="mdi-chevron-down"
              >
                <span class="text-truncate font-weight-medium">{{ currentModuleName }}</span>
                <v-tooltip activator="parent" location="bottom">Módulos del Sistema</v-tooltip>
              </v-btn>
            </template>

            <v-list density="compact" class="py-1" min-width="270">
              <v-list-subheader class="text-uppercase text-caption font-weight-bold">
                Módulos del Sistema
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

        <!-- Selector de Servidor API (node-apiliq) -->
        <div class="flex-shrink-0">
          <ApiEnvSelector density="compact" :show-label="false" />
        </div>

        <!-- Selector de Municipio / Tenant -->
        <div class="flex-shrink-0">
          <TenantSelector density="compact" />
        </div>

        <!-- Indicador de Base de Datos Conectada (view/configServer) -->
        <v-chip
          v-if="store.auth"
          size="small"
          density="compact"
          class="font-weight-medium flex-shrink-0 d-none d-md-inline-flex"
          :color="storeFilter.hasServerConfig ? 'white' : (storeFilter.serverConfigError ? 'error' : 'grey-lighten-2')"
          :variant="storeFilter.hasServerConfig ? 'outlined' : 'tonal'"
          style="cursor: pointer; max-width: 160px;"
          @click="logStore.openDialog"
        >
          <v-icon
            :icon="storeFilter.serverConfigLoading ? 'mdi-loading mdi-spin' : (storeFilter.hasServerConfig ? 'mdi-database-check' : (storeFilter.serverConfigError ? 'mdi-database-alert' : 'mdi-database-clock-outline'))"
            start
            size="x-small"
            :color="storeFilter.hasServerConfig ? 'light-green-accent-3' : undefined"
          ></v-icon>
          <span class="text-caption font-weight-bold text-truncate">
            BD: {{ storeFilter.serverAmbiente || storeFilter.serverDescripcion || (storeFilter.serverConfigLoading ? '...' : 'Sin BD') }}
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
      </div>

      <!-- Botones de la Derecha (Alineados, consistentes y sin duplicar iconos) -->
      <div class="d-flex align-center flex-shrink-0 ga-1 ms-2">
        <!-- Conmutador Tema Claro/Oscuro -->
        <v-btn
          icon="mdi-theme-light-dark"
          size="small"
          density="compact"
          variant="text"
          color="white"
          @click="toggleTheme"
        >
          <v-tooltip activator="parent" location="bottom">Cambiar tema</v-tooltip>
        </v-btn>

        <!-- Botón Diagnóstico y Logs -->
        <v-btn
          icon="mdi-bug-outline"
          size="small"
          density="compact"
          variant="text"
          :color="logStore.hasErrors ? 'amber-accent-2' : 'white'"
          @click="logStore.openDialog"
        >
          <v-tooltip activator="parent" location="bottom">Diagnóstico y Logs</v-tooltip>
        </v-btn>

        <!-- Botón Asistente de Prompts Antigravity -->
        <v-btn
          icon="mdi-robot-outline"
          size="small"
          density="compact"
          variant="text"
          color="white"
          @click="mostrarPromptAssistant = true"
        >
          <v-tooltip activator="parent" location="bottom">Asistente de Prompts (Antigravity)</v-tooltip>
        </v-btn>

        <!-- Botón Salir Rápido -->
        <v-btn
          v-if="store.isAuth"
          icon="mdi-logout"
          size="small"
          density="compact"
          variant="text"
          color="white"
          @click="handleLogout"
        >
          <v-tooltip activator="parent" location="bottom">Cerrar sesión</v-tooltip>
        </v-btn>

        <!-- Menú de Usuario -->
        <div v-if="store.auth">
          <v-menu location="bottom end">
            <template #activator="{ props: userProps }">
              <v-btn
                v-bind="userProps"
                icon="mdi-account-circle"
                size="small"
                density="compact"
                variant="text"
                color="white"
              >
                <v-tooltip activator="parent" location="bottom">
                  {{ store.user?.USERNAME || store.user?.NOMBRE || 'Usuario' }}
                </v-tooltip>
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
                color="error"
                @click="handleLogout"
              />
            </v-list>
          </v-menu>
        </div>
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
          <v-list-item prepend-icon="mdi-format-list-checks" title="Cargos y conceptos a liq." @click="router.push('/conceptos')" />
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
        <!-- Barra de navegación rápida: Volver al inicio -->
        <v-row v-if="store.auth && $route.path !== '/' && $route.path !== '/login'" justify="center" class="mb-2">
          <v-col cols="12" class="d-flex align-center justify-space-between py-1">
            <v-btn
              size="small"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-arrow-left"
              class="font-weight-medium text-none"
              @click="router.push('/')"
            >
              Volver al Inicio
            </v-btn>
            <div class="text-caption text-medium-emphasis d-none d-sm-flex align-center">
              <span style="cursor: pointer;" @click="router.push('/')">Inicio</span>
              <v-icon icon="mdi-chevron-right" size="x-small" class="mx-1"></v-icon>
              <strong>{{ currentModuleName }}</strong>
            </div>
          </v-col>
        </v-row>

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

    <!-- Asistente de Prompts y Requerimientos -->
    <PromptAssistantDialog v-model="mostrarPromptAssistant" />
  </v-layout>
</template>

<style scoped>
.min-h-screen {
  min-height: 100vh;
}
</style>
