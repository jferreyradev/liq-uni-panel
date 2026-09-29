<script setup>
import { ref } from 'vue'
import Confirmacion from '../utils/Confirmacion.vue'
import { leerDatos, ejecutarSP } from './llamadaAPI'
import botonTooltip from '../utils/botonTooltip.vue'
import { getVto } from '@/utils/formatos'
import { getPeriodoFromMMYYYY, getFechaToAPIFromMMYYYY } from '@/utils/formatos.js'
import LiqDDJJAgrega from './LiqDDJJAgrega.vue'

const props = defineProps(['periodo'])
const periodoActivo = getPeriodoFromMMYYYY(props.periodo)

const listaHeaders = [
  { title: '', key: '' },
  { title: 'TipoLiq', key: 'TIPOLIQUIDACIONDESCRIPCION' },
  { title: 'Grupo Adic.', key: 'GRUPOADICIONALID' },
  { title: 'Período Liq.', key: 'PERIODOLIQ' }
]

// lectura de registros
let isPending = ref(false)
const data = ref(null)
const error = null
const lecturaListaRegs = ref(true)

// alerta de grabación o error
const mostrarAlert = ref(false)
const alertMensaje = ref(null)
const alertTipo = ref(null)

async function leerListaRegs() {
  isPending.value = true
  const { datos, operacionOk } = await leerDatos(
    'view/djPrevLiqsPeriodoDJ?PeriodoDJ=' + periodoActivo
  )
  data.value = datos
  lecturaListaRegs.value = operacionOk
  isPending.value = false
}

const muestraRegistro = ref(false)

function agregaRegistro() {
  muestraRegistro.value = true
}

function cierraForm() {
  muestraRegistro.value = false
}

// funciones de agregado, modificación y eliminación
async function grabarSP(item) {
  let url = ''
  console.log(item)
  url = 'sp/djPrevIncluyeLiqs'

  const { valorError, valorSalida } = await ejecutarSP(url, item)
  if (valorSalida == 0) {
    await leerListaRegs()
    alertMensaje.value = 'Se agregó la liquidación'
    alertTipo.value = 'success'
    mostrarAlert.value = true
    return 'OK'
  }

  return valorError
}

const muestraConfirmacion = ref(false)

async function eliminar(item) {
  muestraConfirmacion.value = false
  let url = 'sp/djPrevExcluyeLiqs'

  const { valorError, valorSalida } = await ejecutarSP(url, item)

  if (valorSalida == 0) {
    await leerListaRegs()
    alertMensaje.value = 'Se excluyó la liquidación'
    alertTipo.value = 'success'
    mostrarAlert.value = true
    return true
  } else {
    alertMensaje.value = 'No se pudo eliminar la liquidación'
    alertTipo.value = 'error'
    mostrarAlert.value = true
  }
  return false
}

leerListaRegs()

const itemEliminar = ref({})
function handleEliminar(itemid) {
  mostrarAlert.value = false
  itemEliminar.value = itemid
  muestraConfirmacion.value = true
}
function cierraConfirmacion() {
  muestraConfirmacion.value = false
}
</script>

<template>
  <v-container>
    <v-row>
      <h3>Lista de liquidaciones</h3>
    </v-row>
    <v-row>
      <v-btn color="primary" prepend-icon="mdi-plus" elevation="3" @click="agregaRegistro()"
        >Agregar Liquidación</v-btn
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
    <v-row>
      <div v-if="isPending">loading...</div>
      <div v-else-if="!lecturaListaRegs">Sin datos para mostrar</div>
      <div v-else-if="data">
        <v-data-table
          class="text-caption"
          hover
          density="compact"
          :items="data"
          :headers="listaHeaders"
        >
          <template v-slot:item="{ item }">
            <tr class="pa-0 ma-0">
              <td class="text-center m-0 p-0 sticky">
                <botonTooltip
                  :icono="'mdi-delete'"
                  :toolMsg="'Eliminar'"
                  :funcion="handleEliminar"
                  :itemid="{
                    PERIODODDJJ: getFechaToAPIFromMMYYYY(props.periodo),
                    TIPOLIQUIDACIONID: item.TIPOLIQUIDACIONID,
                    GRUPOADICIONALID: item.GRUPOADICIONALID,
                    REPARTICIONID: -1,
                    PERIODOLIQ: item.PERIODOLIQ
                  }"
                ></botonTooltip>
              </td>
              <td class="text-left m-0 p-0">{{ item.TIPOLIQUIDACIONDESCRIPCION }}</td>
              <td class="text-left m-0 p-0">{{ item.GRUPOADICIONALID }}</td>
              <td class="text-left m-0 p-0">{{ getVto(item.PERIODOLIQ) }}</td>
            </tr>
          </template>
        </v-data-table>
      </div>
      <div v-else-if="error">No se puede obtener los datos solicitados.</div>
    </v-row>
  </v-container>
  <v-dialog v-model="muestraRegistro" max-width="80%" persistent="">
    <LiqDDJJAgrega
      :periodoActivo="props.periodo"
      :cerrar="cierraForm"
      :funcion="grabarSP"
    ></LiqDDJJAgrega>
  </v-dialog>
  <v-dialog v-model="muestraConfirmacion" max-width="80%" persistent="">
    <confirmacion
      :titulo="'Quitar Liquidación'"
      :mensaje="'Seguro que desea Quitar la liquidación de la DDJJ?'"
      :cerrar="cierraConfirmacion"
      :aceptar="eliminar"
      :parametro="itemEliminar"
    ></confirmacion>
  </v-dialog>
</template>
