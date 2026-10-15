<script setup>
import { ref, computed } from 'vue'
import RepoHeader from '@/shared/components/RepoHeader.vue'
import { useFilterStore } from '@/stores/filterStore'
import { useEndPoints } from '@/composables/useEndPoints'
import { useFetch } from '@/composables/useFetch'

const { apiBase, getBoletasHeaders, buildApiHeaders } = useEndPoints()
const store = useFilterStore()
const downloading = ref(false)

function useArchivoIPSST(getId) {
  const headersFn = buildApiHeaders || getBoletasHeaders || (() => ({}))
  return useFetch(
    () => `${apiBase.value}/api/view/archivoIPSST?${getId()}`,
    () => ({ headers: headersFn() })
  )
}

const { data, error, isPending } = useArchivoIPSST(() => store.filterPeriodoString)

const headers = [
  {
    title: 'Cadena de Registro (Formato Oficial IPSST)',
    align: 'start',
    key: 'CADENA'
  }
]

const nombreArchivo = computed(() => {
  if (data.value && data.value.length > 0 && data.value[0].NOMBREARCHIVO) {
    return data.value[0].NOMBREARCHIVO
  }
  const m = String(store.month || '').padStart(2, '0')
  return `AP001${store.year}.${m}`
})

async function downloadIpsst() {
  downloading.value = true
  const url = `${apiBase.value}/api/txt/archivoIPSST?${store.filterPeriodoString}`

  try {
    const headersFn = buildApiHeaders || getBoletasHeaders || (() => ({}))
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'text/plain',
        ...headersFn()
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const blob = await response.blob()
    // Si la respuesta vino vacía pero tenemos registros en memoria, activar fallback
    if (blob.size === 0 && data.value && data.value.length > 0) {
      throw new Error('Respuesta vacía del servidor, generando archivo desde los registros en pantalla')
    }

    const urlSalida = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = urlSalida
    a.download = nombreArchivo.value
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(urlSalida)
  } catch (err) {
    // Si la descarga directa falla, armar el blob desde los datos ya cargados
    if (data.value && data.value.length > 0) {
      let largeString = ''
      for (let i = 0; i < data.value.length; i++) {
        const item = data.value[i]
        const linea = item.CADENA || item.cadena || ''
        largeString += linea + '\n'
      }
      const archivo = new Blob([largeString], { type: 'text/plain;charset=utf-8' })
      const urlSalida = URL.createObjectURL(archivo)
      const a = document.createElement('a')
      a.href = urlSalida
      a.download = nombreArchivo.value
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(urlSalida)
    } else {
      console.error('Error al descargar archivo IPSST:', err)
    }
  } finally {
    downloading.value = false
  }
}

function cargarPeriodoAnterior() {
  store.month = '08'
  store.year = 2026
}
</script>

<template>
  <v-card flat class="border rounded-lg mb-4">
    <RepoHeader title="Archivo TXT - Presentación IPSST" :subtitle="store.periodoString">
      <div class="d-flex align-center flex-wrap ga-2">
        <v-chip
          v-if="data && data.length > 0"
          color="primary"
          variant="tonal"
          size="small"
          class="font-mono font-weight-bold"
        >
          <v-icon start icon="mdi-file-document-outline"></v-icon>
          {{ nombreArchivo }} ({{ data.length }} registros)
        </v-chip>
        <v-btn
          color="primary"
          prepend-icon="mdi-download"
          :loading="downloading"
          :disabled="!data || data.length === 0"
          @click="downloadIpsst"
        >
          Descargar TXT
        </v-btn>
      </div>
    </RepoHeader>

    <v-card-text>
      <div v-if="isPending" class="d-flex align-center pa-4 text-medium-emphasis">
        <v-progress-circular indeterminate color="primary" class="me-3" size="24"></v-progress-circular>
        Cargando datos del archivo IPSST...
      </div>

      <div v-else-if="error" class="text-error pa-4">
        <v-icon icon="mdi-alert-circle" class="me-1"></v-icon>
        No se pudo obtener el archivo IPSST para el período seleccionado.
      </div>

      <div v-else-if="data && data.length === 0" class="text-medium-emphasis text-center pa-6">
        <v-icon icon="mdi-information-outline" size="large" class="mb-2 text-warning"></v-icon>
        <div class="text-subtitle-1 font-weight-medium">
          No existen registros de archivo IPSST para {{ store.periodoString }}.
        </div>
        <div class="mt-1 text-caption text-grey">
          El período activo aún no cuenta con liquidaciones cerradas para la presentación del IPSST.
        </div>
        <v-btn
          color="primary"
          variant="tonal"
          size="small"
          class="mt-4"
          prepend-icon="mdi-history"
          @click="cargarPeriodoAnterior"
        >
          Cargar último período con datos (Agosto 2026)
        </v-btn>
      </div>

      <div v-else-if="data" style="overflow-x: auto;">
        <v-data-table
          class="text-caption font-mono"
          hover
          density="compact"
          :items="data"
          :headers="headers"
          :items-per-page="10"
        >
          <template v-slot:item="{ item }">
            <tr class="pa-0 ma-0">
              <td class="text-left font-mono py-1 text-no-wrap">{{ item.CADENA || item.cadena }}</td>
            </tr>
          </template>
        </v-data-table>
      </div>
    </v-card-text>
  </v-card>
</template>
