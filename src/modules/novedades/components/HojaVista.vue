<script setup>
import { ref } from "vue";
import {
  months,
  tipoCarga,
  tipoHoja,
  tipoLiq,
  getObjetList,
  getName,
  estadosHoja,
} from "@/utils/tipos";
import { rules } from "@/utils/reglasValidacion";

const props = defineProps(["Hoja", "cerrar", "funcion"]);
let hoja = props.Hoja;
let hojaActual = ref(hoja);

const fechaSplit = (vto) => {
  if (vto) {
    const d = vto.split("-");
    const f = {
      dia: d[2],
      mes: d[1],
      anio: d[0],
    };
    return f;
  }
  return null;
};

const fechaActual = new Date();
let mesActual = fechaActual.getMonth();
let anioActual = fechaActual.getFullYear();
let diaActual = fechaActual.getDate();
let fechaCreacionFormat =
  anioActual.toString() +
  "-" +
  (mesActual + 1).toString().padStart(2, "0") +
  "-" +
  diaActual.toString().padStart(2, "0");
const month = ref(months[fechaActual.getMonth()]);
const year = ref(fechaActual.getFullYear());
const tipoCargaSelected = ref(tipoCarga[0]);
const tipoHojaSelected = ref(tipoHoja[3]);
const liqSelected = ref(tipoLiq[0]);

if (hojaActual.value) {
  tipoCargaSelected.value = getObjetList(
    tipoCarga,
    hojaActual.value.TIPOCARGAID,
  );
  liqSelected.value = getObjetList(tipoLiq, hojaActual.value.TIPOLIQUIDACIONID);
  tipoHojaSelected.value = getObjetList(tipoHoja, hojaActual.value.TIPOHOJAID);
  let periodo = fechaSplit(hojaActual.value.PERIODOID);
  month.value = months[periodo.mes - 1];
  year.value = periodo.anio;
  fechaCreacionFormat = hojaActual.value.FECHACREACION.substring(0, 10);
} else {
  hojaActual.value = {
    ...hojaActual,
    ID: 0,
    GRUPOADICIONAL: 0,
    FECHACREACION: fechaCreacionFormat,
    ESTADOHOJAID: 1,
  };
}
const estadoHojaTxt = getName(estadosHoja, hojaActual.value.ESTADOHOJAID);

const mostrarAlert = ref(false);

const isSaving = ref(false);

async function grabaRegistro() {
  mostrarAlert.value = false;
  const mes = months.indexOf(month.value) + 1;
  const periodo =
    year.value.toString() +
    "-" +
    mes.toString().padStart(2, "0") +
    "-01" +
    "T03:00:00.000Z";

  const getVal = (item) => (typeof item === "object" && item !== null ? item.value : item);

  let registro = {
    vIDTIPOHOJA: getVal(tipoHojaSelected.value),
    vPERIODO: periodo,
    vIDTIPOLIQ: getVal(liqSelected.value),
    vIDGRUPOADI: hojaActual.value.GRUPOADICIONAL,
    vIDESTADOHOJA: hojaActual.value.ESTADOHOJAID,
    vIDTIPOCARGA: getVal(tipoCargaSelected.value),
  };
  if (hojaActual.value.ID && hojaActual.value.ID !== 0)
    registro = {
      vIDHOJANOV: hojaActual.value.ID,
      vFECHAALTA: hojaActual.value.FECHACREACION,
      ...registro,
    };

  isSaving.value = true;
  try {
    let grabarOk = await props.funcion(registro, hojaActual.value.ID || 0);

    if (grabarOk) {
      props.cerrar();
    } else {
      mostrarAlert.value = true;
    }
  } catch (err) {
    console.error("Error en grabaRegistro Hoja:", err);
    mostrarAlert.value = true;
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <v-container>
    <v-card :loading="isSaving">
      <v-progress-linear v-if="isSaving" indeterminate color="primary"></v-progress-linear>
      <v-card-title>Hojas</v-card-title>
      <v-card-subtitle>Agregar Nueva</v-card-subtitle>
      <v-alert
        v-model="mostrarAlert"
        border="start"
        close-label="Close Alert"
        color="error"
        icon="$error"
        closable
      >
        No se pudieron grabar los datos
      </v-alert>
      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="2">
              <v-text-field
                v-if="hojaActual.ID != 0"
                v-model="hojaActual.ID"
                hide-details="auto"
                label="Id"
                readonly=""
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="tipoHojaSelected"
                label="Tipo Hoja"
                :items="tipoHoja"
                item-title="name"
                item-value="value"
                return-object
              >
              </v-select>
            </v-col>

            <v-col cols="2">
              <v-select v-model="month" label="Mes" :items="months"></v-select>
            </v-col>
            <v-col cols="2">
              <v-text-field
                v-model="year"
                label="Año"
                required
                type="number"
                :rules="[
                  ...rules.number,
                  (val) => rules.longitudEntre(val, 4, 4),
                  (val) => rules.rango(val, 1990, 2200),
                ]"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="4">
              <v-select
                v-model="tipoCargaSelected"
                label="Tipo Carga"
                :items="tipoCarga"
                item-title="name"
                item-value="value"
                return-object
              >
              </v-select>
            </v-col>
            <v-col cols="4">
              <v-select
                v-model="liqSelected"
                label="Tipo Liq"
                :items="tipoLiq"
                item-title="name"
                item-value="value"
                return-object
              >
              </v-select>
            </v-col>
            <v-col cols="4">
              <v-text-field
                v-model="hojaActual.GRUPOADICIONAL"
                hide-details="auto"
                label="Grupo"
                :rules="[
                  ...rules.number,
                  (val) => rules.longitudEntre(val, 1, 2),
                  (val) => rules.rango(val, 0, 99),
                ]"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row v-if="hojaActual.ID != 0">
            <v-col cols="4">
              <v-text-field
                v-model="fechaCreacionFormat"
                hide-details="auto"
                label="Fecha Creación"
                readonly=""
              ></v-text-field>
            </v-col>
            <v-col v-if="hojaActual.ID !== 0" cols="4">
              <v-text-field
                v-model="estadoHojaTxt"
                hide-details="auto"
                label="Estado"
                readonly=""
              ></v-text-field>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>
      <v-card-actions class="d-flex justify-end">
        <v-btn
          color="primary"
          elevation="3"
          outlined
          :loading="isSaving"
          :disabled="isSaving"
          @click="grabaRegistro()"
          >Grabar</v-btn
        >
        <v-btn
          color="error"
          elevation="3"
          outlined
          :disabled="isSaving"
          @click="cerrar()"
          >Cancelar</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-container>
</template>
