<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useFilterStore } from '@/stores/filterStore'
import { useLogStore } from '@/stores/logStore'
import { useTenantStore } from '@/stores/tenantStore'
import { useEndPoints } from '@/composables/useEndPoints'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const route = useRoute()
const filterStore = useFilterStore()
const logStore = useLogStore()
const tenantStore = useTenantStore()
const { apiBase, activeEnvId } = useEndPoints()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// Tipos de requerimiento
const tipos = [
  { text: '✨ Cambio / Función', value: 'cambio', icon: 'mdi-auto-fix' },
  { text: '🐛 Reporte de Error', value: 'error', icon: 'mdi-bug-outline' },
  { text: '📦 Nuevo Módulo', value: 'modulo', icon: 'mdi-package-variant-closed' }
]

const tipoSeleccionado = ref('cambio')
const descripcion = ref('')
const comportamientoEsperado = ref('')
const incluirContextoTecnico = ref(true)
const incluirUltimoError = ref(false)
const accionFinal = ref('deploy') // 'deploy' | 'local' | 'plan'

const copiado = ref(false)

// Mapeo automático de ruta a nombre de módulo
const moduloDetectado = computed(() => {
  const p = (route.path || '').toLowerCase()
  if (p.includes('/operacion')) return 'Operaciones (Transformación, Liquidación, Boletas)'
  if (p.includes('/agente')) return 'Agentes y Legajos'
  if (p.includes('/hoja') || p.includes('/novedad')) return 'Novedades y Hojas de Haberes'
  if (p.includes('/concepto')) return 'Cargos y Conceptos de Liquidación'
  if (p.includes('/boleta')) return 'Boletas de Sueldo y Recibos'
  if (p.includes('/acredit')) return 'Acreditaciones Bancarias'
  if (p.includes('/ipsst')) return 'Obra Social IPSST'
  if (p.includes('/previs')) return 'Previsional'
  if (p.includes('/repo')) return 'Reportes y Planillas'
  if (p.includes('/usuario')) return 'Gestión de Usuarios'
  if (p.includes('/panel')) return 'Panel Principal'
  return route.name ? String(route.name) : 'General'
})

const ultimoError = computed(() => logStore.lastError)

// Auto-seleccionar modo error si el diálogo se abre y hay un error HTTP reciente
watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) {
      if (logStore.hasErrors && ultimoError.value) {
        tipoSeleccionado.value = 'error'
        incluirUltimoError.value = true
      }
    } else {
      copiado.value = false
    }
  },
  { immediate: true }
)

const textoAccionFinal = computed(() => {
  if (accionFinal.value === 'deploy') return 'Probar con tests unitarios, compilar y desplegar a main y api-rpi.'
  if (accionFinal.value === 'local') return 'Ejecutar pruebas unitarias y verificar en entorno local (sin desplegar todavía).'
  return 'Analizar la arquitectura, formular preguntas de diseño y proponer un plan antes de modificar código (/plan).'
})

// Generación del Prompt Markdown de Alta Eficiencia
const promptGenerado = computed(() => {
  const lineas = []

  if (tipoSeleccionado.value === 'error') {
    lineas.push('### 🐛 REPORTE DE ERROR / CORRECCIÓN TÉCNICA')
  } else if (tipoSeleccionado.value === 'modulo') {
    lineas.push('### 📦 REQUERIMIENTO DE NUEVO MÓDULO')
  } else {
    lineas.push('### 📋 SOLICITUD DE CAMBIO / NUEVA FUNCIÓN')
  }
  lineas.push('')

  lineas.push(`* **Módulo:** ${moduloDetectado.value}`)
  lineas.push(`* **Ruta UI:** \`${route.path || '/'}\``)

  if (incluirContextoTecnico.value) {
    const rep = filterStore.serverDescripcion
      ? `${filterStore.serverDescripcion} (ID: ${filterStore.serverIdRep || 'N/A'})`
      : `Repartición #${filterStore.serverIdRep || 'General'}`
    const per = filterStore.periodoDMY || filterStore.periodoString || 'No especificado'
    const env = apiBase.value || activeEnvId.value || 'api-desa'

    lineas.push('* **Contexto Operativo Activo:**')
    lineas.push(`  - Repartición activa: ${rep}`)
    lineas.push(`  - Período activo: ${per}`)
    lineas.push(`  - Backend / Ambiente: \`${env}\``)
  }

  if (incluirUltimoError.value && ultimoError.value) {
    lineas.push('* **Último Error Registrado en Consola HTTP:**')
    lineas.push(`  - Método y URL: \`${ultimoError.value.method || 'GET'} ${ultimoError.value.url || ''}\``)
    lineas.push(`  - Código HTTP: \`${ultimoError.value.status || 'Error'} ${ultimoError.value.statusText || ''}\``)
    if (ultimoError.value.error || ultimoError.value.responseBody) {
      const errTexto = typeof ultimoError.value.error === 'object'
        ? JSON.stringify(ultimoError.value.error)
        : String(ultimoError.value.error || ultimoError.value.responseBody)
      lineas.push(`  - Detalle Error: \`${errTexto.substring(0, 300)}\``)
    }
  }

  lineas.push('')
  lineas.push('* **Descripción de lo solicitado:**')
  if (descripcion.value.trim()) {
    lineas.push(`  ${descripcion.value.trim().replace(/\n/g, '\n  ')}`)
  } else {
    lineas.push('  [Describir aquí el cambio o requerimiento puntual]')
  }

  if (comportamientoEsperado.value.trim()) {
    lineas.push('')
    lineas.push('* **Comportamiento esperado:**')
    lineas.push(`  ${comportamientoEsperado.value.trim().replace(/\n/g, '\n  ')}`)
  }

  lineas.push('')
  lineas.push(`* **Acción requerida:** ${textoAccionFinal.value}`)

  return lineas.join('\n')
})

async function copiarPrompt() {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(promptGenerado.value)
    } else {
      // Fallback
      const input = document.createElement('textarea')
      input.value = promptGenerado.value
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    copiado.value = true
    setTimeout(() => {
      copiado.value = false
    }, 2500)
  } catch (e) {
    console.error('Error al copiar al portapapeles:', e)
  }
}
</script>

<template>
  <v-dialog v-model="isOpen" max-width="850px" scrollable>
    <v-card class="elevation-3" rounded="lg">
      <v-card-title class="d-flex align-center py-3 px-4 bg-primary text-white">
        <v-icon icon="mdi-robot-outline" class="me-2"></v-icon>
        <span class="text-h6 font-weight-bold">Asistente de Prompts para Antigravity</span>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" density="compact" color="white" @click="isOpen = false"></v-btn>
      </v-card-title>

      <v-card-text class="pa-4 bg-grey-lighten-5">
        <v-row dense>
          <!-- Columna Izquierda: Formulario -->
          <v-col cols="12" md="6">
            <div class="text-caption font-weight-bold text-medium-emphasis mb-1">
              1. TIPO DE REQUERIMIENTO
            </div>
            <v-btn-toggle
              v-model="tipoSeleccionado"
              color="primary"
              mandatory
              density="compact"
              class="w-100 mb-3"
            >
              <v-btn
                v-for="t in tipos"
                :key="t.value"
                :value="t.value"
                class="flex-grow-1 text-caption text-none"
                :prepend-icon="t.icon"
              >
                {{ t.text }}
              </v-btn>
            </v-btn-toggle>

            <!-- Contexto Auto-detectado -->
            <v-card variant="outlined" class="pa-2 mb-3 bg-white">
              <div class="d-flex justify-space-between align-center mb-1">
                <span class="text-caption font-weight-bold text-primary">Contexto Auto-detectado:</span>
                <v-chip size="x-small" color="primary" variant="tonal">
                  {{ moduloDetectado }}
                </v-chip>
              </div>
              <div class="text-caption text-medium-emphasis">
                Ruta: <code>{{ route.path || '/' }}</code> |
                Período: <strong>{{ filterStore.periodoDMY || 'N/A' }}</strong> |
                Rep: <strong>{{ filterStore.serverIdRep || 'General' }}</strong>
              </div>
              <div v-if="ultimoError" class="mt-2 pt-1 border-t d-flex align-center justify-space-between">
                <span class="text-caption text-error font-weight-bold">
                  ⚠️ Error HTTP detectado ({{ ultimoError.status }})
                </span>
                <v-checkbox-btn
                  v-model="incluirUltimoError"
                  label="Adjuntar error"
                  density="compact"
                  color="error"
                  class="ma-0 pa-0"
                ></v-checkbox-btn>
              </div>
            </v-card>

            <div class="text-caption font-weight-bold text-medium-emphasis mb-1">
              2. DESCRIPCIÓN DEL CAMBIO / ERROR
            </div>
            <v-textarea
              v-model="descripcion"
              rows="4"
              variant="outlined"
              density="compact"
              placeholder="¿Qué necesitas que haga el asistente? Ej: 'En la pestaña Transformación, al ejecutar el SP salta un 404...'"
              auto-grow
              class="mb-2"
            ></v-textarea>

            <div class="text-caption font-weight-bold text-medium-emphasis mb-1">
              3. COMPORTAMIENTO ESPERADO (OPCIONAL)
            </div>
            <v-text-field
              v-model="comportamientoEsperado"
              variant="outlined"
              density="compact"
              placeholder="Ej: Debe mostrar alerta verde de éxito y permitir descargar Excel"
              class="mb-2"
            ></v-text-field>

            <div class="text-caption font-weight-bold text-medium-emphasis mb-1">
              4. ACCIÓN REQUERIDA
            </div>
            <v-radio-group v-model="accionFinal" density="compact" inline class="mt-0">
              <v-radio label="Desplegar a producción" value="deploy" color="primary"></v-radio>
              <v-radio label="Solo local" value="local" color="primary"></v-radio>
              <v-radio label="Plan (/plan)" value="plan" color="primary"></v-radio>
            </v-radio-group>
          </v-col>

          <!-- Columna Derecha: Vista Previa y Botón Copiar -->
          <v-col cols="12" md="6" class="d-flex flex-column">
            <div class="d-flex justify-space-between align-center mb-1">
              <div class="text-caption font-weight-bold text-medium-emphasis">
                PREVISUALIZACIÓN DEL PROMPT
              </div>
              <v-chip size="x-small" color="success" variant="flat" v-if="copiado">
                <v-icon icon="mdi-check" start size="x-small"></v-icon>
                ¡Copiado!
              </v-chip>
            </div>

            <v-sheet
              class="pa-3 flex-grow-1 border rounded bg-white text-caption font-monospace overflow-y-auto"
              style="max-height: 420px; white-space: pre-wrap; font-family: monospace;"
            >
              {{ promptGenerado }}
            </v-sheet>

            <v-btn
              color="primary"
              size="large"
              class="mt-3 text-none font-weight-bold shadow-1"
              prepend-icon="mdi-content-copy"
              @click="copiarPrompt"
            >
              {{ copiado ? '¡Prompt Copiado al Portapapeles!' : 'Copiar Prompt para Antigravity' }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
