<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTenantStore } from '@/stores/tenantStore'
import { useFilterStore } from '@/stores/filterStore'
import { useUserStore } from '@/stores/userStore'
import { useEndPoints } from '@/composables/useEndPoints'

const router = useRouter()
const tenantStore = useTenantStore()
const filterStore = useFilterStore()
const userStore = useUserStore()
const { env } = useEndPoints()

const activeTenant = computed(() => tenantStore.activeTenant)

const modules = [
  {
    title: 'Panel Principal',
    description: 'Consulta de liquidaciones e ítems liquidados por agente',
    icon: 'mdi-view-dashboard',
    color: 'primary',
    route: '/panel'
  },
  {
    title: 'Boletas de Sueldo',
    description: 'Listado y descarga individual o masiva de recibos en PDF',
    icon: 'mdi-file-document-outline',
    color: 'teal',
    route: '/boletas'
  },
  {
    title: 'Agentes y Legajos',
    description: 'Gestión de personal, familiares a cargo y conceptos asignados',
    icon: 'mdi-account-group',
    color: 'indigo',
    route: '/agentes'
  },
  {
    title: 'Novedades y Hojas',
    description: 'Carga de novedades mensuales, altas y haberes',
    icon: 'mdi-notebook-edit-outline',
    color: 'deep-orange',
    route: '/hojas'
  },
  {
    title: 'Procesos de Liquidación',
    description: 'Panel de control y ejecución de procesos de cálculo',
    icon: 'mdi-cogs',
    color: 'blue-grey',
    route: '/procesos'
  },
  {
    title: 'Acreditaciones',
    description: 'Generación de archivos bancarios TXT y control de cuentas',
    icon: 'mdi-bank-transfer',
    color: 'green-darken-2',
    route: '/acredit'
  },
  {
    title: 'Previsional',
    description: 'Declaraciones juradas previsionales y aportes jubilatorios',
    icon: 'mdi-shield-check',
    color: 'purple',
    route: '/prevision'
  },
  {
    title: 'Obra Social IPSST',
    description: 'Planilla de retenciones y archivos de exportación para IPSST',
    icon: 'mdi-hospital-box',
    color: 'teal-darken-2',
    route: '/ipsst'
  },
  {
    title: 'Reportes y Planillas',
    description: 'Planillas de ley, retenciones, aportes patronales y resúmenes',
    icon: 'mdi-chart-box-outline',
    color: 'cyan-darken-3',
    route: '/repo'
  }
]
</script>

<template>
  <v-container class="py-6">
    <!-- Banner de Bienvenida -->
    <v-card class="mb-6 elevation-2" rounded="lg" color="surface">
      <v-card-text class="pa-6">
        <v-row align="center">
          <v-col cols="12" md="8">
            <div class="d-flex align-center mb-2">
              <v-avatar size="48" class="me-3 elevation-1" rounded="sm">
                <v-img v-if="activeTenant.logo" :src="activeTenant.logo" alt="Logo" />
                <v-icon v-else icon="mdi-city" size="large" color="primary"></v-icon>
              </v-avatar>
              <div>
                <h1 class="text-h5 font-weight-bold mb-0">
                  {{ activeTenant.name }}
                </h1>
                <div class="text-subtitle-2 text-medium-emphasis">
                  {{ activeTenant.location }}
                </div>
              </div>
            </div>

            <p class="text-body-1 text-grey-darken-1 mt-3">
              Sistema unificado de liquidación de haberes, gestión de agentes, novedades y reportes oficiales.
            </p>

            <div class="d-flex flex-wrap gap-2 mt-4">
              <v-chip size="small" color="primary" variant="flat" class="me-2 mb-2">
                <v-icon icon="mdi-calendar-clock" start></v-icon>
                Período: {{ filterStore.periodoString || 'No establecido' }}
              </v-chip>
              <v-chip size="small" color="secondary" variant="outlined" class="me-2 mb-2">
                <v-icon icon="mdi-server-network" start></v-icon>
                Ambiente: {{ env }}
              </v-chip>
              <v-chip size="small" color="info" variant="outlined" class="me-2 mb-2">
                <v-icon icon="mdi-numeric" start></v-icon>
                Puerto: {{ activeTenant.projectPort }}
              </v-chip>
            </div>
          </v-col>

          <v-col cols="12" md="4" class="text-md-end text-center">
            <v-btn
              color="primary"
              size="large"
              prepend-icon="mdi-view-dashboard"
              @click="router.push('/panel')"
              class="elevation-2"
            >
              Ir al Panel Principal
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Grilla de Módulos -->
    <h2 class="text-h6 font-weight-bold mb-4 text-grey-darken-3">
      Módulos Disponibles
    </h2>

    <v-row>
      <v-col
        v-for="mod in modules"
        :key="mod.route"
        cols="12"
        sm="6"
        md="3"
      >
        <v-card
          class="h-100 module-card elevation-1"
          hover
          rounded="lg"
          @click="router.push(mod.route)"
        >
          <v-card-text class="d-flex flex-column h-100 pa-5">
            <div class="d-flex align-center justify-space-between mb-3">
              <v-avatar :color="mod.color" size="44" rounded="md" class="text-white">
                <v-icon :icon="mod.icon" size="24"></v-icon>
              </v-avatar>
              <v-icon icon="mdi-arrow-right" color="grey-lighten-1" size="small"></v-icon>
            </div>

            <div class="text-subtitle-1 font-weight-bold mb-1">
              {{ mod.title }}
            </div>
            <div class="text-caption text-medium-emphasis flex-grow-1">
              {{ mod.description }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.module-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid rgba(0, 0, 0, 0.06);
}
.module-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1) !important;
}
</style>
