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
  <v-container class="px-0">
    <RepoHeader title="Archivo IPSST" :subtitle="store.periodoString">
      <div class="d-flex align-center ga-2">
        <span v-if="data && data.length > 0" class="text-caption text-grey-darken-1 font-weight-medium me-2">
          {{ nombreArchivo }} ({{ data.length }} reg.)
        </span>
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

    <div v-if="isPending" class="py-2 text-center text-medium-emphasis">
      <v-progress-circular indeterminate color="primary" size="20" class="me-2" />
      Cargando archivo IPSST...
    </div>

    <div v-else-if="error" class="text-error py-2">
      No se pudo obtener el archivo IPSST.
    </div>

    <div v-else-if="!data || data.length === 0" class="py-2 text-medium-emphasis">
      No existen registros de archivo para {{ store.periodoString }}.
    </div>

    <div v-else style="overflow-x: auto;">
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
  </v-container>
</template>
