<script setup>
import { computed } from 'vue'
import RepoHeader from '@/shared/components/RepoHeader.vue'
import { useFilterStore } from '@/stores/filterStore'
import { useEndPoints } from '@/composables/useEndPoints'
import { useFetch } from '@/composables/useFetch'
import { financial, agregaTitulosExcel } from '@/utils/reportes.js'
import { utils, writeFileXLSX } from 'xlsx'

const { apiBase, getBoletasHeaders, buildApiHeaders } = useEndPoints()
const store = useFilterStore()

function useResumenIPSST(getId) {
  const headersFn = buildApiHeaders || getBoletasHeaders || (() => ({}))
  return useFetch(
    () => `${apiBase.value}/api/view/resumenIPSST?${getId()}`,
    () => ({ headers: headersFn() })
  )
}

const { data, error, isPending } = useResumenIPSST(() => store.filterPeriodoString)

const getVto = (vto) => {
  if (vto) {
    const d = vto.split('-')
    return `${d[1]}/${d[0]}`
  }
  return null
}

const totalImporte = computed(() => {
  if (!data.value || !Array.isArray(data.value)) return 0
  return data.value.reduce((sum, item) => sum + (Number(item.IMPORTE) || 0), 0)
})

const headers = [
  {
    title: 'Fecha Devengado',
    align: 'start',
    key: 'FECHADEV'
  },
  {
    title: 'Código',
    align: 'end',
    key: 'CODIGO'
  },
  {
    title: 'Subcódigo',
    align: 'end',
    key: 'SUBCOD'
  },
  {
    title: 'Descripción en Boleta',
    align: 'start',
    key: 'DESCBOLETA'
  },
  {
    title: 'Importe Retenido',
    align: 'end',
    key: 'IMPORTE'
  }
]

function exportFile() {
  if (!data.value || data.value.length === 0) return

  const map1 = data.value.map((x) => {
    return [getVto(x.FECHADEV), x.CODIGO, x.SUBCOD, x.DESCBOLETA, Number(x.IMPORTE || 0)]
  })

  // Fila de totales
  map1.push([null, null, null, 'TOTAL RETENCIONES IPSST', totalImporte.value])

  const titulosTabla = [
    'Fecha Dev.',
    'Código',
    'Subcódigo',
    'Descripción Boleta',
    'Importe'
  ]
  const filtros = store.periodoString
  const tituloReporte = 'Resumen de Retenciones IPSST'
  agregaTitulosExcel(map1, tituloReporte, filtros, titulosTabla)
  const ws = utils.aoa_to_sheet(map1)

  ws['!cols'] = [
    { wch: 15 },
    { wch: 10 },
    { wch: 12 },
    { wch: 35 },
    { wch: 18 }
  ]
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'IPSST')

  const mesStr = String(store.month || '').padStart(2, '0')
  writeFileXLSX(wb, `ResumenIPSST_${store.year}_${mesStr}.xlsx`, {
    compression: true
  })
}

function cargarPeriodoAnterior() {
  store.month = '08'
  store.year = 2026
}
</script>

<template>
  <v-card flat class="border rounded-lg mb-4">
    <RepoHeader title="Resumen de Retenciones - Obra Social IPSST" :subtitle="store.periodoString">
      <v-btn
        color="primary"
        prepend-icon="mdi-file-excel"
        :disabled="!data || data.length === 0"
        @click="exportFile"
      >
        Exportar Excel
      </v-btn>
    </RepoHeader>

    <v-card-text>
      <div v-if="isPending" class="d-flex align-center pa-4 text-medium-emphasis">
        <v-progress-circular indeterminate color="primary" class="me-3" size="24"></v-progress-circular>
        Cargando resumen IPSST...
      </div>

      <div v-else-if="error" class="text-error pa-4">
        <v-icon icon="mdi-alert-circle" class="me-1"></v-icon>
        No se pudo obtener el resumen de retenciones IPSST.
      </div>

      <div v-else-if="data && data.length === 0" class="text-medium-emphasis text-center pa-6">
        <v-icon icon="mdi-information-outline" size="large" class="mb-2 text-warning"></v-icon>
        <div class="text-subtitle-1 font-weight-medium">
          No existen retenciones IPSST registradas para {{ store.periodoString }}.
        </div>
        <div class="mt-1 text-caption text-grey">
          El período activo aún no cuenta con liquidaciones cerradas para IPSST.
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

      <v-data-table
        v-else-if="data"
        class="text-caption"
        hover
        density="compact"
        :items="data"
        :headers="headers"
        :items-per-page="15"
      >
        <template v-slot:item="{ item }">
          <tr class="pa-0 ma-0">
            <td class="text-left py-1">{{ getVto(item.FECHADEV) }}</td>
            <td class="text-right py-1 font-weight-medium">{{ item.CODIGO }}</td>
            <td class="text-right py-1">{{ item.SUBCOD }}</td>
            <td class="text-left py-1">{{ item.DESCBOLETA }}</td>
            <td class="text-right py-1 font-weight-medium">{{ financial(item.IMPORTE) }}</td>
          </tr>
        </template>

        <template v-slot:body.append>
          <tr class="bg-blue-lighten-5 font-weight-bold">
            <td colspan="4" class="text-right py-2">Total Retenciones IPSST:</td>
            <td class="text-right py-2 text-primary font-weight-bold">{{ financial(totalImporte) }}</td>
          </tr>
        </template>
      </v-data-table>
    </v-card-text>
  </v-card>
</template>
