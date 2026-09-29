<script setup>
import { ref } from 'vue'
import { leerDatos, ejecutarSP, descargaTXT } from './llamadaAPI'
import {
  financial,
  getFechaToAPIFromMMYYYY,
  getPeriodoFromMMYYYY,
  getFechaDMY
} from '@/utils/formatos'
import { utils, writeFileXLSX } from 'xlsx'

const props = defineProps(['periodo'])
console.log('periodo', props.periodo)
const d = props.periodo.split('/')
const periodoId = parseInt(d[1]) * 100 + parseInt(d[0])
console.log('PeriodoId', periodoId)

// lectura de registros
let isPending = ref(false)
const data = ref(null)
const error = null
const lecturaListaRegs = ref(true)
const registroDJ = ref(null)

// alerta de grabación o error
const mostrarAlert = ref(false)
const alertMensaje = ref(null)
const alertTipo = ref(null)

async function leerListaRegs() {
  isPending.value = true
  const { datos, operacionOk } = await leerDatos('en/djPrevResumenDJ?Id=' + periodoId)

  data.value = datos
  lecturaListaRegs.value = operacionOk
  isPending.value = false

  if (data.value !== null) {
    registroDJ.value = data.value[0]
  } else {
    registroDJ.value = null
  }
}

async function procesaDDJJ() {
  isPending.value = true
  let url = 'sp/djPrevCargaResumen'

  const item = { PeriodoDDJJ: getFechaToAPIFromMMYYYY(props.periodo) }
  console.log(item)
  let resultado = { valorError: 0, valorSalida: 0 }
  resultado = await ejecutarSP(url, item)
  console.log(resultado)
  if (resultado.valorSalida != 0) {
    mostrarAlert.value = true
    alertMensaje.value = 'No se pudo generar el resumen. No se actualizaron los datos'
    alertTipo.value = 'error'
    isPending.value = false
    return
  }
  url = 'sp/djPrevCargaDDJJ'
  resultado = await ejecutarSP(url, item)
  console.log(resultado)
  if (resultado.valorSalida != 0) {
    mostrarAlert.value = true
    alertMensaje.value = 'No se pudo generar la DDJJ. No se actualizaron los datos'
    alertTipo.value = 'error'
    isPending.value = false
    return
  }

  await leerListaRegs()
  mostrarAlert.value = true
  alertMensaje.value = 'Se actualizaron los datos de DDJJ'
  alertTipo.value = 'success'

  return 'OK'
}

// Método para descargar el archivo
async function DescargaDDJJTXT() {
  // Realiza la llamada a la API usando fetch (o axios si prefieres)

  //const url =
  //  'http://www.serverburru2.duckdns.org:3005/api/txt/djPrevTxtDDJJ?PeriodoDJ=' +
  //  getPeriodoFromMMYYYY(props.periodo)
  const url = 'txt/djPrevTxtDDJJ?PeriodoDJ=' + getPeriodoFromMMYYYY(props.periodo)

  const urlDescarga = await descargaTXT(url)

  if (urlDescarga == null) {
    mostrarAlert.value = true
    alertMensaje.value = 'No se pudo descargar el archivo'
    alertTipo.value = 'error'
    return
  }

  const a = document.createElement('a')
  a.href = urlDescarga
  a.download = 'ddjj_' + props.periodo + '.txt' // Nombre con el que se descargará el archivo
  document.body.appendChild(a)
  a.click() // Simula el clic para iniciar la descarga
  a.remove() // Elimina el enlace del DOM
  window.URL.revokeObjectURL(urlDescarga) // Limpia la URL creada
}

// genera el archivo excel
function descargaExcel() {
  let map1 = [['Declaración Jurada Previsional', '', '', 'Período', props.periodo]]
  let linea = [null, null, null, null, null]
  map1.push(linea)
  linea = ['Totales de cálculo', '', '', 'Valores para DDJJ', '']
  map1.push(linea)
  linea = ['Item', 'Valor', '', 'Item', 'Valor']
  map1.push(linea)
  linea = [
    'Cant. Agentes',
    registroDJ.value.CANTAGENTES,
    null,
    'Cant. Agentes',
    registroDJ.value.CANTAGENTES
  ]
  map1.push(linea)
  linea = [
    'Haberes C/Aporte',
    registroDJ.value.HABCONAPORTE,
    null,
    'Rem. Total',
    registroDJ.value.REMTOTAL
  ]
  map1.push(linea)
  linea = [
    'Remuneración Actual',
    registroDJ.value.REMACTUAL,
    null,
    'Rem. SS',
    registroDJ.value.REMSS
  ]
  map1.push(linea)
  linea = [
    'Remuneración Atrasada',
    registroDJ.value.REMATRASADA,
    null,
    'Rem. 02',
    registroDJ.value.REM02
  ]
  map1.push(linea)
  linea = [
    'Remuneración Excedente',
    registroDJ.value.REMEXCEDENTE,
    null,
    'Rem. 03',
    registroDJ.value.REM03
  ]
  map1.push(linea)
  linea = [
    'Aporte Jub.',
    registroDJ.value.APORTEJUBILATORIO,
    null,
    'Rem. 04',
    registroDJ.value.REM04
  ]
  map1.push(linea)
  linea = [
    'Patronal Jub.',
    registroDJ.value.PATRONALJUBILATORIO,
    null,
    'Rem. 05',
    registroDJ.value.REM05
  ]
  map1.push(linea)
  linea = [
    'Fecha de proceso',
    getFechaDMY(registroDJ.value.FECHARESUMEN),
    null,
    'Rem. 06',
    registroDJ.value.REM06
  ]
  map1.push(linea)
  linea = [null, null, null, 'Rem. 07', registroDJ.value.REM07]
  map1.push(linea)
  linea = [null, null, null, 'Rem. 08', registroDJ.value.REM08]
  map1.push(linea)
  linea = [null, null, null, 'Rem. 09', registroDJ.value.REM09]
  map1.push(linea)
  linea = [null, null, null, 'Sdo + Adi', registroDJ.value.SUELDOYADI]
  map1.push(linea)
  linea = [null, null, null, 'SAC', registroDJ.value.SAC]
  map1.push(linea)
  linea = [null, null, null, 'Asig. Fam', registroDJ.value.ASIGFAMILIAR]
  map1.push(linea)

  const ws = utils.aoa_to_sheet(map1)

  ws['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 10 }, { wch: 35 }, { wch: 15 }]
  /* create workbook and append worksheet */
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Data')

  /* export to XLSX */
  writeFileXLSX(wb, props.fileName || `${periodoId}_DDJJ.xlsx`, {
    compression: true
  })
}

leerListaRegs()
</script>

<template>
  <v-container>
    <v-row>
      <v-btn color="primary" elevation="3" class="mx-2" @click="procesaDDJJ()">Procesar DDJJ</v-btn>
      <v-btn
        v-if="registroDJ != null"
        color="primary"
        elevation="3"
        class="mx-2"
        @click="DescargaDDJJTXT()"
        >Genera TXT</v-btn
      >
      <v-btn
        v-if="registroDJ != null"
        color="primary"
        elevation="3"
        class="mx-2"
        @click="descargaExcel()"
        >Genera Planilla</v-btn
      >
    </v-row>
    <v-row>
      <v-alert
        v-model="mostrarAlert"
        border="start"
        close-label="Close Alert"
        :color="alertTipo"
        :icon="'$' + alertTipo"
        closable
      >
        {{ alertMensaje }}
      </v-alert>
    </v-row>
  </v-container>
  <v-container>
    <div v-if="isPending">loading...</div>
    <div v-else-if="!lecturaListaRegs">Sin datos para mostrar</div>
    <div v-else-if="data">
      <v-table density="compact">
        <thead>
          <tr>
            <th class="text-left text-h6" colspan="2">Totales de cálculo</th>
            <th style="width: 30px"></th>
            <th class="text-left text-h6" colspan="2">Valores para DDJJ</th>
          </tr>
          <tr>
            <th class="text-left">Item</th>
            <th class="text-left">Valor</th>
            <th></th>
            <th class="text-left">Item</th>
            <th class="text-left">Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cant. Agentes</td>
            <td class="text-right">{{ registroDJ.CANTAGENTES }}</td>
            <td></td>
            <td>Cant. Agentes</td>
            <td class="text-right">{{ registroDJ.CANTAGENTES }}</td>
          </tr>
          <tr>
            <td>Haberes C/Aporte</td>
            <td class="text-right">{{ financial(registroDJ.HABCONAPORTE) }}</td>
            <td></td>
            <td>Rem. Total</td>
            <td class="text-right">{{ financial(registroDJ.REMTOTAL) }}</td>
          </tr>
          <tr>
            <td>Remuneración Actual</td>
            <td class="text-right">{{ financial(registroDJ.REMACTUAL) }}</td>
            <td></td>
            <td>Rem SS</td>
            <td class="text-right">{{ financial(registroDJ.REMSS) }}</td>
          </tr>
          <tr>
            <td>Remuneración Atrasada</td>
            <td class="text-right">{{ financial(registroDJ.REMATRASADA) }}</td>
            <td></td>
            <td>Rem 02</td>
            <td class="text-right">{{ financial(registroDJ.REM02) }}</td>
          </tr>
          <tr>
            <td>Remuneración Excedente</td>
            <td class="text-right">{{ financial(registroDJ.REMEXCEDENTE) }}</td>
            <td></td>
            <td>Rem 03</td>
            <td class="text-right">{{ financial(registroDJ.REM03) }}</td>
          </tr>
          <tr>
            <td>Aporte Jub.</td>
            <td class="text-right">{{ financial(registroDJ.APORTEJUBILATORIO) }}</td>
            <td></td>
            <td>Rem 04</td>
            <td class="text-right">{{ financial(registroDJ.REM04) }}</td>
          </tr>
          <tr>
            <td>Patronal Jub.</td>
            <td class="text-right">{{ financial(registroDJ.PATRONALJUBILATORIO) }}</td>
            <td></td>
            <td>Rem 05</td>
            <td class="text-right">{{ financial(registroDJ.REM05) }}</td>
          </tr>
          <tr>
            <td>Fecha de Proceso</td>
            <td class="text-right">{{ getFechaDMY(registroDJ.FECHARESUMEN) }}</td>
            <td></td>
            <td>Rem 06</td>
            <td class="text-right">{{ financial(registroDJ.REM06) }}</td>
          </tr>
          <tr>
            <td></td>
            <td></td>
            <td></td>
            <td>Rem 07</td>
            <td class="text-right">{{ financial(registroDJ.REM07) }}</td>
          </tr>
          <tr>
            <td></td>
            <td></td>
            <td></td>
            <td>Rem 08</td>
            <td class="text-right">{{ financial(registroDJ.REM08) }}</td>
          </tr>
          <tr>
            <td></td>
            <td></td>
            <td></td>
            <td>Rem 09</td>
            <td class="text-right">{{ financial(registroDJ.REM09) }}</td>
          </tr>
          <tr>
            <td></td>
            <td></td>
            <td></td>
            <td>Sdo + Adi</td>
            <td class="text-right">{{ financial(registroDJ.SUELDOYADI) }}</td>
          </tr>
          <tr>
            <td></td>
            <td></td>
            <td></td>
            <td>SAC</td>
            <td class="text-right">{{ financial(registroDJ.SAC) }}</td>
          </tr>
          <tr>
            <td></td>
            <td></td>
            <td></td>
            <td>Asig. Fam.</td>
            <td class="text-right">{{ financial(registroDJ.ASIGFAMILIAR) }}</td>
          </tr>
        </tbody>
      </v-table>
    </div>
    <div v-else-if="error">No se puede obtener los datos solicitados.</div>
  </v-container>
</template>
