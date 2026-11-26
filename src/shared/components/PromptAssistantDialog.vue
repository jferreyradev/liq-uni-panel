<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useFilterStore } from '@/stores/filterStore'
import { useLogStore } from '@/stores/logStore'
import { useEndPoints } from '@/composables/useEndPoints'
import { descargarDesdeBlob } from '@/utils/descargas'

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
const { apiBase, activeEnvId } = useEndPoints()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// Pestañas basadas exactamente en docs/PLANTILLAS_DESARROLLO.md
const tipos = [
  { text: '1. Cambio / Función', value: 'cambio', icon: 'mdi-auto-fix' },
  { text: '2. Reporte de Error', value: 'error', icon: 'mdi-bug-outline' },
  { text: '3. Nuevo Módulo', value: 'modulo', icon: 'mdi-package-variant-closed' }
]

const tipoSeleccionado = ref('cambio')
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

// --- Campos Plantilla 1: Solicitud de Cambio / Nueva Función ---
const p1Modulo = ref('')
const p1Objetivo = ref('')
const p1UbicacionUI = ref('')
const p1SP = ref('')
const p1Endpoint = ref('')
const p1Parametros = ref('')
const p1Comportamiento = ref('')
const p1Accion = ref('build y deploy a main y api-rpi')

// --- Campos Plantilla 2: Reporte de Error (Bug) ---
const p2DondeOcurre = ref('')
const p2QueHacias = ref('')
const p2MensajeError = ref('')
const p2DatosPrueba = ref('')
const p2QueDeberiaPasar = ref('')
const p2Accion = ref('corregir, probar y desplegar')

// --- Campos Plantilla 3: Nuevo Módulo desde Cero ---
const p3NombreModulo = ref('')
const p3UbicacionMenu = ref('')
const p3Ruta = ref('')
const p3Vistas = ref('')
const p3Endpoints = ref('')
const p3Permisos = ref('General / Administradores')
const p3Accion = ref('crear módulo con rutas, vistas, tests unitarios y registrar en router')

// Auto-completar contexto al abrir o navegar
function actualizarContextoAuto() {
  const ruta = route.path || '/'
  const repNombre = filterStore.serverDescripcion || `Repartición #${filterStore.serverIdRep || 'General'}`
  const repId = filterStore.serverIdRep || 'N/A'
  const periodo = filterStore.periodoDMY || filterStore.periodoString || 'N/A'

  p1Modulo.value = `${moduloDetectado.value} (${ruta})`
  p1Parametros.value = `Periodo: ${periodo}, ReparticionId: ${repId}`

  p2DondeOcurre.value = `${ruta} (${moduloDetectado.value})`
  p2DatosPrueba.value = `Período: ${periodo}, Repartición: ${repNombre} (ID: ${repId})`

  if (logStore.hasErrors && logStore.lastError) {
    const err = logStore.lastError
    const errTexto = typeof err.error === 'object'
      ? JSON.stringify(err.error)
      : String(err.error || err.responseBody || err.statusText || 'Error')
    p2MensajeError.value = `[HTTP ${err.status || 500}] ${err.method || 'GET'} ${err.url || ''} -> ${errTexto}`
    tipoSeleccionado.value = 'error'
  }
}

watch(
  () => props.modelValue,
  (abierto) => {
    if (abierto) {
      actualizarContextoAuto()
    } else {
      copiado.value = false
    }
  },
  { immediate: true }
)

// Generación exacta del Markdown de acuerdo con docs/PLANTILLAS_DESARROLLO.md
const promptGenerado = computed(() => {
  if (tipoSeleccionado.value === 'cambio') {
    return [
      '### SOLICITUD DE CAMBIO / NUEVA FUNCIÓN',
      '',
      `* **Módulo o Pantalla:** ${p1Modulo.value || moduloDetectado.value}`,
      `* **Objetivo:** ${p1Objetivo.value.trim() || '(Describir objetivo o qué problema resuelve)'}`,
      `* **Dónde se ubica en la UI:** ${p1UbicacionUI.value.trim() || '(ej. botón en la barra / columna en tabla / nueva pestaña)'}`,
      '* **Datos / Backend involucrado:**',
      `  - Procedimiento (SP): ${p1SP.value.trim() || 'no aplica'}`,
      `  - Vista o Endpoint: ${p1Endpoint.value.trim() || 'no aplica'}`,
      `  - Parámetros clave: ${p1Parametros.value.trim() || 'Periodo, ReparticionId'}`,
      '* **Comportamiento esperado:**',
      p1Comportamiento.value.trim()
        ? `  ${p1Comportamiento.value.trim().replace(/\n/g, '\n  ')}`
        : '  1. El usuario hace clic en...\n  2. Se valida que...\n  3. Al confirmar, debe...',
      `* **Acción final:** ${p1Accion.value}`
    ].join('\n')
  }

  if (tipoSeleccionado.value === 'error') {
    return [
      '### REPORTE DE ERROR',
      '',
      `* **Dónde ocurre:** ${p2DondeOcurre.value || route.path || '/'}`,
      `* **Qué estabas haciendo:** ${p2QueHacias.value.trim() || '(ej. al hacer clic en Ejecutar después de cambiar los filtros)'}`,
      `* **Mensaje o Error exacto:** ${p2MensajeError.value.trim() || '(ej. error 404 en consola / ORA-06550... / se queda cargando)'}`,
      `* **Datos de prueba:** ${p2DatosPrueba.value.trim() || 'Período, Repartición, DNI'}`,
      `* **Qué debería haber pasado:** ${p2QueDeberiaPasar.value.trim() || '(ej. mostrar alerta verde de éxito y refrescar la tabla)'}`,
      `* **Acción final:** ${p2Accion.value}`
    ].join('\n')
  }

  // Nuevo Módulo
  return [
    '### NUEVO MÓDULO',
    '',
    `* **Nombre del Módulo:** ${p3NombreModulo.value.trim() || '(ej. embargos / licencias)'}`,
    `* **Ubicación en el Menú:** ${p3UbicacionMenu.value.trim() || '(ej. debajo de Liquidaciones en la barra lateral)'}`,
    `* **Ruta deseada:** ${p3Ruta.value.trim() || (p3NombreModulo.value ? `/${p3NombreModulo.value.toLowerCase().trim()}` : '/nuevo-modulo')}`,
    '* **Vistas principales:**',
    p3Vistas.value.trim()
      ? `  ${p3Vistas.value.trim().replace(/\n/g, '\n  ')}`
      : '  - Listado: tabla con búsqueda y filtros\n  - Formulario/Edición: diálogo modal para alta/modificación/baja',
    `* **Endpoints / SPs previstos:** ${p3Endpoints.value.trim() || 'view/... y sp/...' }`,
    `* **Permisos/Roles:** ${p3Permisos.value.trim() || 'General / Administradores'}`,
    `* **Acción final:** ${p3Accion.value}`
  ].join('\n')
})

async function copiarPrompt() {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(promptGenerado.value)
    } else {
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

function descargarPlantilla() {
  const blob = new Blob([promptGenerado.value], { type: 'text/markdown;charset=utf-8' })
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const tipo = tipoSeleccionado.value.toUpperCase()
  const slug = (moduloDetectado.value || 'requerimiento')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 20)
  const nombre = `PLANTILLA_${tipo}_${fecha}_${slug}.md`
  descargarDesdeBlob(blob, nombre)
}
</script>

<template>
  <v-dialog v-model="isOpen" max-width="920px" scrollable>
    <v-card class="elevation-3" rounded="lg">
      <v-card-title class="d-flex align-center py-3 px-4 bg-primary text-white">
        <v-icon icon="mdi-file-document-edit-outline" class="me-2"></v-icon>
        <span class="text-h6 font-weight-bold">Generador de Prompts (Basado en Plantillas)</span>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" density="compact" color="white" @click="isOpen = false"></v-btn>
      </v-card-title>

      <v-card-text class="pa-4 bg-grey-lighten-5">
        <!-- Selector de Plantilla Estándar -->
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="text-caption font-weight-bold text-medium-emphasis">SELECCIONAR PLANTILLA ESTÁNDAR:</span>
          <span class="text-caption text-primary">Fuente: <code>docs/PLANTILLAS_DESARROLLO.md</code></span>
        </div>

        <v-btn-toggle
          v-model="tipoSeleccionado"
          color="primary"
          mandatory
          density="comfortable"
          class="w-100 mb-3"
        >
          <v-btn
            v-for="t in tipos"
            :key="t.value"
            :value="t.value"
            class="flex-grow-1 text-body-2 text-none font-weight-medium"
            :prepend-icon="t.icon"
          >
            {{ t.text }}
          </v-btn>
        </v-btn-toggle>

        <v-row dense>
          <!-- Columna Izquierda: Formulario según la Plantilla Activa -->
          <v-col cols="12" md="6">
            <!-- PLANTILLA 1: CAMBIO / NUEVA FUNCIÓN -->
            <div v-if="tipoSeleccionado === 'cambio'">
              <v-text-field
                v-model="p1Modulo"
                label="Módulo o Pantalla"
                density="compact"
                variant="outlined"
                class="mb-1"
              ></v-text-field>

              <v-textarea
                v-model="p1Objetivo"
                label="Objetivo (¿Qué debe hacer o resolver?)"
                placeholder="Ej: Agregar botón de exportación Excel a la grilla de novedades..."
                density="compact"
                variant="outlined"
                rows="2"
                auto-grow
                class="mb-1"
              ></v-textarea>

              <v-text-field
                v-model="p1UbicacionUI"
                label="Dónde se ubica en la UI"
                placeholder="Ej: Botón en barra superior / nueva columna / diálogo modal"
                density="compact"
                variant="outlined"
                class="mb-1"
              ></v-text-field>

              <v-row dense>
                <v-col cols="6">
                  <v-text-field
                    v-model="p1SP"
                    label="Procedimiento (SP)"
                    placeholder="Ej: sp/transform o no aplica"
                    density="compact"
                    variant="outlined"
                  ></v-text-field>
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    v-model="p1Endpoint"
                    label="Vista o Endpoint"
                    placeholder="Ej: view/novhaberes"
                    density="compact"
                    variant="outlined"
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-text-field
                v-model="p1Parametros"
                label="Parámetros clave"
                density="compact"
                variant="outlined"
                class="mb-1"
              ></v-text-field>

              <v-textarea
                v-model="p1Comportamiento"
                label="Comportamiento esperado (Pasos)"
                placeholder="1. El usuario hace clic en...&#10;2. Se valida que...&#10;3. Al confirmar, debe..."
                density="compact"
                variant="outlined"
                rows="3"
                auto-grow
                class="mb-1"
              ></v-textarea>

              <v-select
                v-model="p1Accion"
                label="Acción final requerida"
                :items="[
                  'build y deploy a main y api-rpi',
                  'solo probar en local con tests unitarios',
                  'analizar y presentar plan de diseño (/plan)'
                ]"
                density="compact"
                variant="outlined"
              ></v-select>
            </div>

            <!-- PLANTILLA 2: REPORTE DE ERROR -->
            <div v-else-if="tipoSeleccionado === 'error'">
              <v-text-field
                v-model="p2DondeOcurre"
                label="Dónde ocurre (URL o pantalla)"
                density="compact"
                variant="outlined"
                class="mb-1"
              ></v-text-field>

              <v-textarea
                v-model="p2QueHacias"
                label="Qué estabas haciendo"
                placeholder="Ej: Al hacer clic en 'Ejecutar Transformación' luego de cambiar el período..."
                density="compact"
                variant="outlined"
                rows="2"
                auto-grow
                class="mb-1"
              ></v-textarea>

              <v-textarea
                v-model="p2MensajeError"
                label="Mensaje o Error exacto (Consola / Red / Oracle)"
                placeholder="Ej: ORA-06550 / Failed to load resource: 404 / Error 500..."
                density="compact"
                variant="outlined"
                rows="3"
                auto-grow
                class="mb-1 text-error font-monospace"
              ></v-textarea>

              <v-text-field
                v-model="p2DatosPrueba"
                label="Datos de prueba (DNI, Período, Repartición)"
                density="compact"
                variant="outlined"
                class="mb-1"
              ></v-text-field>

              <v-text-field
                v-model="p2QueDeberiaPasar"
                label="Qué debería haber pasado"
                placeholder="Ej: Mostrar alerta verde de éxito y refrescar la tabla"
                density="compact"
                variant="outlined"
                class="mb-1"
              ></v-text-field>

              <v-select
                v-model="p2Accion"
                label="Acción final requerida"
                :items="[
                  'corregir, probar y desplegar',
                  'solo corregir y probar en local',
                  'investigar causa raíz e informar (/plan)'
                ]"
                density="compact"
                variant="outlined"
              ></v-select>
            </div>

            <!-- PLANTILLA 3: NUEVO MÓDULO -->
            <div v-else>
              <v-text-field
                v-model="p3NombreModulo"
                label="Nombre del Módulo"
                placeholder="Ej: embargos, licencias, ganancias"
                density="compact"
                variant="outlined"
                class="mb-1"
              ></v-text-field>

              <v-row dense>
                <v-col cols="6">
                  <v-text-field
                    v-model="p3UbicacionMenu"
                    label="Ubicación en el Menú"
                    placeholder="Ej: debajo de Liquidaciones"
                    density="compact"
                    variant="outlined"
                  ></v-text-field>
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    v-model="p3Ruta"
                    label="Ruta deseada"
                    placeholder="Ej: /embargos"
                    density="compact"
                    variant="outlined"
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-textarea
                v-model="p3Vistas"
                label="Vistas principales"
                placeholder="- Listado: tabla con búsqueda por DNI y filtros&#10;- Formulario: diálogo modal para alta/edición"
                density="compact"
                variant="outlined"
                rows="3"
                auto-grow
                class="mb-1"
              ></v-textarea>

              <v-text-field
                v-model="p3Endpoints"
                label="Endpoints / SPs previstos"
                placeholder="Lectura: view/embargos | Grabación: sp/embargos_spi"
                density="compact"
                variant="outlined"
                class="mb-1"
              ></v-text-field>

              <v-text-field
                v-model="p3Permisos"
                label="Permisos / Roles"
                density="compact"
                variant="outlined"
                class="mb-1"
              ></v-text-field>

              <v-select
                v-model="p3Accion"
                label="Acción final requerida"
                :items="[
                  'crear módulo con rutas, vistas, tests unitarios y registrar en router',
                  'diseñar arquitectura y presentar plan (/plan)'
                ]"
                density="compact"
                variant="outlined"
              ></v-select>
            </div>
          </v-col>

          <!-- Columna Derecha: Previsualización Markdown en vivo -->
          <v-col cols="12" md="6" class="d-flex flex-column">
            <div class="d-flex justify-space-between align-center mb-1">
              <span class="text-caption font-weight-bold text-medium-emphasis">
                PREVISUALIZACIÓN DE LA PLANTILLA EN MARKDOWN
              </span>
              <v-chip size="x-small" color="success" variant="flat" v-if="copiado">
                <v-icon icon="mdi-check" start size="x-small"></v-icon>
                ¡Plantilla Copiada!
              </v-chip>
            </div>

            <v-sheet
              class="pa-3 flex-grow-1 border rounded bg-white text-caption font-monospace overflow-y-auto"
              style="max-height: 480px; min-height: 380px; white-space: pre-wrap; font-family: monospace;"
            >
              {{ promptGenerado }}
            </v-sheet>

            <div class="d-flex ga-2 mt-3">
              <v-btn
                variant="outlined"
                color="primary"
                size="large"
                class="flex-grow-1 text-none font-weight-bold"
                prepend-icon="mdi-download"
                @click="descargarPlantilla"
              >
                Descargar Plantilla (.md)
              </v-btn>

              <v-btn
                color="primary"
                size="large"
                class="flex-grow-1 text-none font-weight-bold shadow-1"
                prepend-icon="mdi-content-copy"
                @click="copiarPrompt"
              >
                {{ copiado ? '¡Copiado!' : 'Copiar Plantilla' }}
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
