<script setup>
import { ref, computed } from 'vue'
import { useLogStore } from '@/stores/logStore'
import { useEndPoints } from '@/composables/useEndPoints'
import { testConnection } from '@/shared/services/httpClient'
import { useTenantStore } from '@/stores/tenantStore'
import { useFilterStore } from '@/stores/filterStore'

const logStore = useLogStore()
const filterStore = useFilterStore()
const {
  env,
  isDesa,
  apiBase,
  apiBoletas,
  apiSp,
  setDesaOverrides,
  resetDesaOverrides,
  getDesaOverrides
} = useEndPoints()
const tenantStore = useTenantStore()

const activeTab = ref('logs')
const logFilter = ref('all') // 'all' | 'error' | 'http'
const pingLoading = ref(false)
const pingResult = ref(null)

// Campos editables de endpoints para Desarrollo
const overrides = getDesaOverrides()
const editBase = ref(overrides.base || '')
const editBoletas = ref(overrides.boletas || '')
const editSp = ref(overrides.sp || '')
const editKey = ref(overrides.key || 'desarrollo')
const editPort = ref(overrides.port || '3005')
const saveSuccess = ref(false)

const filteredLogs = computed(() => {
  if (logFilter.value === 'error') {
    return logStore.logs.filter((l) => l.type === 'error')
  }
  if (logFilter.value === 'http') {
    return logStore.logs.filter((l) => l.category === 'HTTP')
  }
  return logStore.logs
})

function applyPreset(preset) {
  if (preset === 'deno-proxy') {
    editBase.value = 'https://dno-mid-api-22.jferreyradev.deno.net'
    editBoletas.value = 'https://dno-mid-boletas.jferreyradev.deno.net'
    editSp.value = 'https://dno-mid-boletas.jferreyradev.deno.net'
    editKey.value = 'desarrollo'
    editPort.value = '3005'
  } else if (preset === 'local-3005') {
    editBase.value = 'http://localhost:3005'
    editBoletas.value = 'http://localhost:3005'
    editSp.value = 'http://localhost:3005'
    editKey.value = 'desarrollo'
    editPort.value = '3005'
  } else if (preset === 'local-8000') {
    editBase.value = 'http://localhost:8000'
    editBoletas.value = 'http://localhost:8000'
    editSp.value = 'http://localhost:8000'
    editKey.value = 'desarrollo'
    editPort.value = '3005'
  }
}

function handleSaveEndpoints() {
  setDesaOverrides({
    base: editBase.value.trim(),
    boletas: editBoletas.value.trim(),
    sp: editSp.value.trim(),
    key: editKey.value.trim(),
    port: editPort.value.trim()
  })
  saveSuccess.value = true
  setTimeout(() => {
    saveSuccess.value = false
  }, 3000)
}

function handleResetEndpoints() {
  resetDesaOverrides()
  const fresh = getDesaOverrides()
  editBase.value = fresh.base || ''
  editBoletas.value = fresh.boletas || ''
  editSp.value = fresh.sp || ''
  editKey.value = fresh.key || 'desarrollo'
  editPort.value = fresh.port || '3005'
  saveSuccess.value = true
  setTimeout(() => {
    saveSuccess.value = false
  }, 3000)
}

async function runPing() {
  pingLoading.value = true
  pingResult.value = null
  try {
    const url = `${apiBase.value}/api/view/periodo?Activo=1`
    const res = await testConnection(url)
    pingResult.value = {
      url,
      ...res
    }
    logStore.addLog({
      type: res.ok ? 'success' : 'error',
      category: 'PING',
      method: 'GET',
      url,
      status: res.status,
      statusText: res.statusText,
      durationMs: res.durationMs,
      error: res.error,
      responseBody: res.body,
      tenant: tenantStore.tenantKey,
      env: env.value
    })
  } finally {
    pingLoading.value = false
  }
}

function copyLogsToClipboard() {
  const jsonStr = JSON.stringify(logStore.logs, null, 2)
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(jsonStr)
  }
}
</script>

<template>
  <v-dialog v-model="logStore.isDialogOpen" max-width="850" scrollable>
    <v-card class="rounded-lg">
      <!-- Toolbar del Diálogo -->
      <v-toolbar color="primary" density="compact">
        <v-icon icon="mdi-bug-outline" class="ms-3 me-2"></v-icon>
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          Diagnóstico del Sistema y Logs de Conexión
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" size="small" @click="logStore.closeDialog"></v-btn>
      </v-toolbar>

      <!-- Estado Rápido Superior -->
      <div class="pa-3 bg-grey-lighten-4 border-b d-flex flex-wrap align-center justify-space-between gap-2">
        <div class="d-flex align-center">
          <v-chip
            size="small"
            :color="tenantStore.activeTenantId === 'desarrollo' ? 'warning' : 'primary'"
            variant="flat"
            class="me-2 font-weight-bold"
          >
            {{ tenantStore.activeTenantId === 'desarrollo' ? 'Entorno: DESARROLLO' : 'Entorno: PRODUCCIÓN' }}
          </v-chip>
          <span class="text-caption text-medium-emphasis">
            Entorno Activo: <strong>{{ tenantStore.tenantName }}</strong> (Key: {{ tenantStore.tenantKey }}, Puerto: {{ tenantStore.tenantPort }})
          </span>
        </div>

        <div class="d-flex align-center gap-2">
          <v-btn
            size="x-small"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-wifi"
            :loading="pingLoading"
            @click="runPing"
          >
            Probar Conexión (Ping)
          </v-btn>
        </div>
      </div>

      <!-- Resultado del Ping si se ejecutó -->
      <v-alert
        v-if="pingResult"
        :type="pingResult.ok ? 'success' : 'error'"
        variant="tonal"
        density="compact"
        class="ma-3 mb-0 text-caption"
        closable
        @click:close="pingResult = null"
      >
        <strong>{{ pingResult.ok ? 'Conexión Exitosa' : 'Fallo de Conexión' }}:</strong>
        {{ pingResult.url }} — Status: {{ pingResult.status }} ({{ pingResult.statusText }})
        en {{ pingResult.durationMs }}ms.
        <div v-if="pingResult.error" class="text-caption text-red mt-1">
          Detalle: {{ pingResult.error }}
        </div>
      </v-alert>

      <!-- Pestañas -->
      <v-tabs v-model="activeTab" density="compact" color="primary">
        <v-tab value="logs">
          <v-icon start icon="mdi-format-list-bulleted"></v-icon>
          Logs Recientes ({{ logStore.logs.length }})
        </v-tab>
        <v-tab value="database">
          <v-icon start icon="mdi-database-eye-outline"></v-icon>
          Base de Datos (configServer)
        </v-tab>
        <v-tab value="config">
          <v-icon start icon="mdi-cog-outline"></v-icon>
          Configuración de Endpoints
        </v-tab>
      </v-tabs>

      <v-card-text class="pa-4" style="max-height: 520px;">
        <!-- TAB 1: LOGS -->
        <div v-if="activeTab === 'logs'">
          <div class="d-flex align-center justify-space-between mb-3">
            <v-btn-toggle v-model="logFilter" mandatory density="compact" variant="outlined" size="x-small">
              <v-btn value="all">Todos ({{ logStore.logs.length }})</v-btn>
              <v-btn value="error" color="error">Solo Errores</v-btn>
              <v-btn value="http">Solo HTTP</v-btn>
            </v-btn-toggle>

            <div>
              <v-btn size="x-small" variant="text" prepend-icon="mdi-content-copy" class="me-1" @click="copyLogsToClipboard">
                Copiar Logs
              </v-btn>
              <v-btn size="x-small" variant="text" color="error" prepend-icon="mdi-delete-outline" @click="logStore.clearLogs">
                Limpiar
              </v-btn>
            </div>
          </div>

          <div v-if="filteredLogs.length === 0" class="text-center pa-6 text-medium-emphasis text-caption">
            <v-icon icon="mdi-information-outline" size="large" class="mb-2"></v-icon>
            <div>No hay logs registrados con el filtro actual.</div>
          </div>

          <v-expansion-panels v-else variant="accordion">
            <v-expansion-panel
              v-for="log in filteredLogs"
              :key="log.id"
              class="mb-2 border rounded"
            >
              <v-expansion-panel-title class="py-2 px-3">
                <div class="d-flex align-center justify-space-between w-100 me-2 text-caption">
                  <div class="d-flex align-center text-truncate">
                    <v-chip
                      size="x-small"
                      :color="log.type === 'error' ? 'error' : log.type === 'warn' ? 'warning' : 'success'"
                      variant="flat"
                      class="me-2 font-weight-bold"
                    >
                      {{ log.status ? log.status : log.type.toUpperCase() }}
                    </v-chip>
                    <strong class="me-2 text-primary">{{ log.method }}</strong>
                    <span class="text-truncate font-mono">{{ log.url }}</span>
                  </div>
                  <div class="text-no-wrap text-medium-emphasis ms-2">
                    <span v-if="log.durationMs !== null" class="me-2">{{ log.durationMs }}ms</span>
                    <span>{{ log.timestamp }}</span>
                  </div>
                </div>
              </v-expansion-panel-title>

              <v-expansion-panel-text class="bg-grey-lighten-5 text-caption font-mono">
                <div class="mb-2"><strong>Ambiente:</strong> {{ log.env || 'N/A' }} | <strong>Municipio:</strong> {{ log.tenant || 'N/A' }}</div>
                <div class="mb-2"><strong>URL Completa:</strong> {{ log.url }}</div>
                
                <div v-if="log.params && Object.keys(log.params).length > 0" class="mb-2">
                  <strong>Parámetros (Query):</strong>
                  <pre class="bg-white pa-2 rounded border mt-1 text-caption">{{ JSON.stringify(log.params, null, 2) }}</pre>
                </div>

                <div class="mb-2">
                  <strong>Headers Enviados:</strong>
                  <pre class="bg-white pa-2 rounded border mt-1 text-caption">{{ JSON.stringify(log.headers, null, 2) }}</pre>
                </div>

                <div v-if="log.error" class="mb-2 text-red font-weight-bold">
                  <strong>Error:</strong> {{ log.error }}
                </div>

                <div v-if="log.requestBody" class="mb-2">
                  <strong>Payload Enviado:</strong>
                  <pre class="bg-white pa-2 rounded border mt-1 text-caption">{{ JSON.stringify(log.requestBody, null, 2) }}</pre>
                </div>

                <div v-if="log.responseBody">
                  <strong>Cuerpo de Respuesta:</strong>
                  <pre class="bg-white pa-2 rounded border mt-1 text-caption" style="max-height: 200px; overflow-y: auto;">{{ typeof log.responseBody === 'object' ? JSON.stringify(log.responseBody, null, 2) : log.responseBody }}</pre>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>

        <!-- TAB 2: CONFIGURACIÓN DE ENDPOINTS -->
        <div v-if="activeTab === 'config'">
          <v-alert type="info" variant="tonal" density="compact" class="mb-4 text-caption">
            Aquí puedes personalizar la URL a la que se conectará el sistema en el ambiente de <strong>Desarrollo</strong> (por ejemplo para apuntar a tu servidor local de pruebas o a un proxy Deno).
          </v-alert>

          <div class="mb-3">
            <div class="text-caption font-weight-bold mb-1">Cargar Presets Rápidos para Desarrollo:</div>
            <div class="d-flex flex-wrap gap-2">
              <v-btn size="x-small" variant="outlined" color="primary" class="me-2 mb-2" @click="applyPreset('deno-proxy')">
                Proxy Deno Cloud (dno-mid-api-22)
              </v-btn>
              <v-btn size="x-small" variant="outlined" color="teal" class="me-2 mb-2" @click="applyPreset('local-3005')">
                Localhost :3005 (Node API / api_liquid)
              </v-btn>
              <v-btn size="x-small" variant="outlined" color="indigo" class="me-2 mb-2" @click="applyPreset('local-8000')">
                Localhost :8000 (Deno Proxy)
              </v-btn>
            </div>
          </div>

          <v-divider class="my-3"></v-divider>

          <v-text-field
            v-model="editBase"
            label="API Base (Consultas / Periodos / Vistas)"
            density="compact"
            variant="outlined"
            placeholder="https://... o http://localhost:3005"
            hint="URL para /api/view/* y consultas generales"
            persistent-hint
            class="mb-3"
          ></v-text-field>

          <v-text-field
            v-model="editBoletas"
            label="API Boletas (Recibos / Usuarios / Config)"
            density="compact"
            variant="outlined"
            placeholder="https://... o http://localhost:3005"
            hint="URL para /api/boleta y gestión de usuarios"
            persistent-hint
            class="mb-3"
          ></v-text-field>

          <v-text-field
            v-model="editSp"
            label="API SP (Stored Procedures)"
            density="compact"
            variant="outlined"
            placeholder="https://... o http://localhost:3005"
            hint="URL para ejecución de procesos"
            persistent-hint
            class="mb-3"
          ></v-text-field>

          <v-divider class="my-3"></v-divider>

          <div class="text-caption font-weight-bold mb-2">Encabezados HTTP para Desarrollo:</div>
          <v-row dense class="mb-2">
            <v-col cols="6">
              <v-text-field
                v-model="editKey"
                label="x-project-key"
                density="compact"
                variant="outlined"
                placeholder="desarrollo"
                hint="Identificador del backend de desarrollo"
                persistent-hint
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="editPort"
                label="x-project-port"
                density="compact"
                variant="outlined"
                placeholder="3005"
                hint="Puerto del backend de desarrollo"
                persistent-hint
              ></v-text-field>
            </v-col>
          </v-row>

          <v-alert v-if="saveSuccess" type="success" density="compact" variant="tonal" class="mb-3 text-caption">
            Configuración de endpoints y headers de desarrollo guardada correctamente en localStorage.
          </v-alert>

          <div class="d-flex justify-space-between mt-4">
            <v-btn size="small" variant="text" color="grey-darken-1" @click="handleResetEndpoints">
              Restaurar Valores por Defecto
            </v-btn>
            <v-btn size="small" color="primary" prepend-icon="mdi-content-save" @click="handleSaveEndpoints">
              Guardar Configuración
            </v-btn>
          </div>
        </div>

        <!-- TAB 3: BASE DE DATOS / configServer -->
        <div v-if="activeTab === 'database'">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-caption">
              Consulta en tiempo real a <code>/api/view/configServer</code>:
            </div>
            <v-btn
              size="small"
              color="primary"
              variant="tonal"
              prepend-icon="mdi-refresh"
              :loading="filterStore.serverConfigLoading"
              @click="filterStore.setConfig()"
            >
              Consultar Ahora
            </v-btn>
          </div>

          <v-alert
            v-if="filterStore.hasServerConfig"
            type="success"
            variant="tonal"
            density="compact"
            class="mb-3 text-caption"
            icon="mdi-check-circle-outline"
          >
            <strong>Conexión con Base de Datos Exitosa:</strong> La API devolvió la configuración del servidor Oracle correctamente.
          </v-alert>

          <v-alert
            v-else-if="filterStore.serverConfigError"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-3 text-caption"
            icon="mdi-alert-circle-outline"
          >
            <strong>Error al consultar la Base de Datos:</strong>
            <div class="mt-1 font-mono text-truncate">{{ filterStore.serverConfigError }}</div>
          </v-alert>

          <v-card variant="outlined" class="mb-3">
            <v-card-text class="pa-3">
              <v-table density="compact">
                <tbody>
                  <tr>
                    <td class="font-weight-bold" style="width: 200px;">Servidor / Descripción:</td>
                    <td>
                      <v-chip size="small" color="primary" variant="flat" class="font-weight-bold">
                        {{ filterStore.serverDescripcion || 'Sin datos' }}
                      </v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold">Ambiente (BD):</td>
                    <td>
                      <v-chip
                        size="small"
                        :color="filterStore.serverAmbiente.toUpperCase().includes('DESA') ? 'warning' : 'success'"
                        variant="tonal"
                        class="font-weight-bold"
                      >
                        {{ filterStore.serverAmbiente || 'Sin datos' }}
                      </v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold">CELA:</td>
                    <td>{{ filterStore.serverCela || 'No especificado' }}</td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold">ID Configuración (IdConf):</td>
                    <td>{{ filterStore.serverIdConf || 'N/A' }}</td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold">Repartición (IdRep):</td>
                    <td>{{ filterStore.serverIdRep || 'N/A' }}</td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold">Endpoint API Consultado:</td>
                    <td class="text-caption font-mono">{{ apiBase }}/api/view/configServer</td>
                  </tr>
                  <tr>
                    <td class="font-weight-bold">Headers Enviados:</td>
                    <td class="text-caption font-mono">x-project-key: {{ tenantStore.tenantKey }} &bull; x-project-port: {{ tenantStore.tenantPort }}</td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>

          <div class="text-caption font-weight-bold mb-1">Respuesta JSON Cruda de configServer:</div>
          <pre class="bg-grey-darken-4 text-green-accent-2 pa-3 rounded text-caption overflow-x-auto">{{ JSON.stringify(filterStore.serverConfig, null, 2) }}</pre>
        </div>
      </v-card-text>

      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="text" size="small" @click="logStore.closeDialog">
          Cerrar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.font-mono {
  font-family: monospace;
}
.gap-2 {
  gap: 8px;
}
</style>
