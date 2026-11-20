<script setup>
import { ref, onMounted } from "vue";
import { tipoLiq, reparticiones as reparticionesEstaticas } from "@/utils/tipos";
import { getVto, getFechaToAPIFromMMYYYY, getVtoActual } from "@/utils/formatos";
import { rules } from "@/utils/reglasValidacion";
import { leerDatos, ejecutarSP_SinEspera } from "@/shared/services/apiService";
import { ConfirmacionDialog } from "@/shared/components";

const emit = defineEmits(["proceso-iniciado"]);

const form = ref(null);
const formValido = ref(false);
const isRunning = ref(false);

const formasLiquidar = [
  { name: "Por Repartición / Grupo", value: 1 },
  { name: "Por Persona", value: 2 },
  { name: "Por Cargo", value: 3 },
];
const formaLiquidarSelected = ref(formasLiquidar[0]);

const gruposRep = [{ name: "Municipios", value: 1 }];
const grupoRepSelected = ref(gruposRep[0]);

const listaReparticiones = ref([
  { name: "Todas las reparticiones", value: 0 },
  ...reparticionesEstaticas,
]);
const repSelected = ref(listaReparticiones.value[0]);

const tipoLiqSelected = ref(tipoLiq[0]);
const periodo = ref("");
const adicional = ref(0);

// Persona
const dni = ref("");
const dniConsultado = ref("");
const personaId = ref(0);
const apeynom = ref("");
const buscandoPersona = ref(false);

// Cargo
const cargoId = ref(null);
const cargosAgente = ref([]);
const cargoSeleccionado = ref(null);
const cargandoCargos = ref(false);

// Alertas y Confirmación
const mostrarConfirmacion = ref(false);
const alertMensaje = ref("");
const alertTipo = ref("success");
const mostrarAlert = ref(false);

async function obtieneVtoActual() {
  try {
    const { datos, operacionOk } = await leerDatos("view/periodo", {
      query: { Activo: 1 },
    });
    if (operacionOk && Array.isArray(datos) && datos.length > 0) {
      return getVto(datos[0].PERIODO) || getVtoActual();
    }
  } catch {
    // Fallback a fecha del sistema
  }
  return getVtoActual();
}

onMounted(async () => {
  periodo.value = await obtieneVtoActual();
});

async function cargarCargosAgente(pId) {
  if (!pId) {
    cargosAgente.value = [];
    cargoSeleccionado.value = null;
    return;
  }
  cargandoCargos.value = true;
  try {
    const { datos, operacionOk } = await leerDatos("view/cargo", {
      query: { PersonaId: pId, EstadoCargoId: 1 },
    });
    if (operacionOk && Array.isArray(datos)) {
      cargosAgente.value = datos.map((c) => ({
        name: `Cargo #${c.ID || c.Id} — Orden ${c.ORDEN} (Rep: ${c.REPARTICIONID}, Cat: ${c.CATEGORIA})`,
        value: c.ID || c.Id,
        raw: c,
      }));
      if (cargosAgente.value.length > 0) {
        cargoSeleccionado.value = cargosAgente.value[0];
        cargoId.value = cargosAgente.value[0].value;
      }
    } else {
      cargosAgente.value = [];
    }
  } catch {
    cargosAgente.value = [];
  } finally {
    cargandoCargos.value = false;
  }
}

function onCargoSelectChange(item) {
  if (item) {
    cargoId.value = typeof item === "object" ? item.value : item;
  }
}

async function consultarPersona() {
  const doc = String(dni.value).trim();
  if (!doc) {
    personaId.value = 0;
    apeynom.value = "";
    cargosAgente.value = [];
    cargoSeleccionado.value = null;
    return;
  }
  if (doc === dniConsultado.value && personaId.value > 0) return;

  buscandoPersona.value = true;
  dniConsultado.value = doc;
  personaId.value = 0;
  apeynom.value = "";
  cargosAgente.value = [];
  cargoSeleccionado.value = null;

  try {
    const { datos, operacionOk } = await leerDatos("view/personaLista", {
      query: { Documento: doc },
    });

    if (operacionOk && Array.isArray(datos) && datos.length > 0) {
      const pers = datos[0];
      const pId = pers.PERSONAID ?? pers.ID ?? pers.Id ?? 0;
      personaId.value = pId;
      apeynom.value =
        pers.APELLIDOYNOMBRE ||
        [pers.APELLIDO, pers.NOMBRE].filter(Boolean).join(", ");

      if (formaLiquidarSelected.value.value === 3) {
        await cargarCargosAgente(pId);
      }
    } else {
      personaId.value = 0;
      apeynom.value = "No se encontró ningún agente con el DNI ingresado";
    }
  } catch (err) {
    personaId.value = 0;
    apeynom.value = "Error al consultar el agente";
  } finally {
    buscandoPersona.value = false;
  }
}

function onFormaLiquidarChange(val) {
  const valor = typeof val === "object" && val !== null ? val.value : val;
  if (valor === 3 && personaId.value > 0 && cargosAgente.value.length === 0) {
    cargarCargosAgente(personaId.value);
  }
}

async function solicitarConfirmacion() {
  const { valid } = await form.value.validate();
  if (!valid) return;

  if (formaLiquidarSelected.value.value === 2 && (!personaId.value || personaId.value === 0)) {
    alertTipo.value = "error";
    alertMensaje.value = "Debe buscar y validar una persona con DNI válido antes de liquidar.";
    mostrarAlert.value = true;
    return;
  }

  if (formaLiquidarSelected.value.value === 3 && (!cargoId.value || Number(cargoId.value) <= 0)) {
    alertTipo.value = "error";
    alertMensaje.value = "Debe seleccionar o ingresar un Cargo válido a liquidar.";
    mostrarAlert.value = true;
    return;
  }

  mostrarConfirmacion.value = true;
}

function generarMensajeConfirmacion() {
  if (formaLiquidarSelected.value.value === 2) {
    return `¿Desea ejecutar la liquidación por Persona para ${apeynom.value} (DNI ${dni.value}, todos sus cargos) en el período ${periodo.value} (${tipoLiqSelected.value.name})?`;
  }
  if (formaLiquidarSelected.value.value === 3) {
    const detalle = apeynom.value ? ` de ${apeynom.value}` : "";
    return `¿Desea ejecutar la liquidación del Cargo #${cargoId.value}${detalle} en el período ${periodo.value} (${tipoLiqSelected.value.name})?`;
  }
  const repNombre = repSelected.value.value === 0 ? "todas las reparticiones" : repSelected.value.name;
  return `¿Desea ejecutar la liquidación masiva para ${repNombre} en el período ${periodo.value} (${tipoLiqSelected.value.name})?`;
}

async function ejecutarLiquidacion() {
  mostrarConfirmacion.value = false;
  isRunning.value = true;
  mostrarAlert.value = false;

  let grupoRep = 0;
  let rep = 0;
  let idPers = 0;
  let idCargo = 0;

  if (formaLiquidarSelected.value.value === 1) {
    if (repSelected.value.value === 0) {
      grupoRep = grupoRepSelected.value.value;
    } else {
      rep = repSelected.value.value;
    }
  } else if (formaLiquidarSelected.value.value === 2) {
    idPers = personaId.value;
    idCargo = 0;
  } else if (formaLiquidarSelected.value.value === 3) {
    idPers = personaId.value || 0;
    idCargo = Number(cargoId.value) || 0;
  }

  const payload = {
    Periodo: getFechaToAPIFromMMYYYY(periodo.value),
    GrupoRep: grupoRep,
    Rep: rep,
    IdPersona: idPers,
    CargoId: idCargo,
    TipoLiq: tipoLiqSelected.value.value,
    GrupoAdicional: Number(adicional.value) || 0,
  };

  try {
    const { salida } = await ejecutarSP_SinEspera("sp/liq", payload);
    if (salida === 0) {
      alertTipo.value = "success";
      if (formaLiquidarSelected.value.value === 2) {
        alertMensaje.value = `Liquidación por persona enviada para ${apeynom.value} (Período: ${periodo.value}).`;
      } else if (formaLiquidarSelected.value.value === 3) {
        alertMensaje.value = `Liquidación del Cargo #${idCargo} enviada a procesar (Período: ${periodo.value}).`;
      } else {
        alertMensaje.value = `Liquidación masiva enviada a procesar para el período ${periodo.value}.`;
      }
      emit("proceso-iniciado", { tipo: "liquidacion", payload });
    } else {
      alertTipo.value = "error";
      alertMensaje.value = "No se pudo iniciar el proceso de liquidación en el servidor.";
    }
  } catch (err) {
    alertTipo.value = "error";
    alertMensaje.value = err.message || "Error al solicitar la liquidación.";
  } finally {
    isRunning.value = false;
    mostrarAlert.value = true;
  }
}
</script>

<template>
  <v-card class="elevation-1 border" rounded="lg">
    <v-card-title class="d-flex align-center py-3 px-4 bg-grey-lighten-4 border-b">
      <v-avatar color="primary" size="32" class="me-2 text-white">
        <v-icon icon="mdi-calculator-variant-outline" size="small"></v-icon>
      </v-avatar>
      <div>
        <div class="text-subtitle-1 font-weight-bold">Cálculo de Liquidación</div>
        <div class="text-caption text-medium-emphasis">
          Cálculo de haberes y retenciones: masivo por repartición, individual por persona o específico por cargo.
        </div>
      </div>
    </v-card-title>

    <v-card-text class="pa-4">
      <v-alert
        v-model="mostrarAlert"
        :type="alertTipo"
        variant="tonal"
        density="comfortable"
        closable
        class="mb-4"
      >
        {{ alertMensaje }}
      </v-alert>

      <v-form ref="form" v-model="formValido" @submit.prevent="solicitarConfirmacion">
        <v-row>
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="periodo"
              label="Período (MM/AAAA)"
              placeholder="MM/AAAA"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-calendar"
              :rules="[
                (v) => !!v || 'Período requerido',
                ...rules.mmyyyy,
                (val) => rules.longitudEntre(val, 6, 7),
              ]"
            ></v-text-field>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="tipoLiqSelected"
              label="Tipo de Liquidación"
              :items="tipoLiq"
              item-title="name"
              item-value="value"
              return-object
              variant="outlined"
              density="compact"
            ></v-select>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="adicional"
              label="Nro. Adicional"
              type="number"
              variant="outlined"
              density="compact"
              :rules="[
                ...rules.number,
                (val) => rules.longitudEntre(val, 1, 2),
              ]"
            ></v-text-field>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="formaLiquidarSelected"
              label="Alcance del Cálculo"
              :items="formasLiquidar"
              item-title="name"
              item-value="value"
              return-object
              variant="outlined"
              density="compact"
              @update:model-value="onFormaLiquidarChange"
            ></v-select>
          </v-col>
        </v-row>

        <!-- Alcance Masivo (1: Por Repartición / Grupo) -->
        <v-row v-if="formaLiquidarSelected.value === 1">
          <v-col cols="12" sm="6">
            <v-select
              v-model="grupoRepSelected"
              label="Grupo de Repartición"
              :items="gruposRep"
              item-title="name"
              item-value="value"
              return-object
              variant="outlined"
              density="compact"
            ></v-select>
          </v-col>

          <v-col cols="12" sm="6">
            <v-select
              v-model="repSelected"
              label="Repartición Específica"
              :items="listaReparticiones"
              item-title="name"
              item-value="value"
              return-object
              variant="outlined"
              density="compact"
            ></v-select>
          </v-col>
        </v-row>

        <!-- Alcance por Persona (2) o por Cargo (3) -->
        <v-row v-if="formaLiquidarSelected.value === 2 || formaLiquidarSelected.value === 3" align="center">
          <v-col cols="12" sm="4">
            <v-text-field
              v-model="dni"
              label="DNI del Agente"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-card-account-details-outline"
              append-inner-icon="mdi-magnify"
              :loading="buscandoPersona"
              :rules="[
                (v) => (formaLiquidarSelected.value === 3 && !v && Number(cargoId) > 0) ? true : (!!v || 'DNI requerido'),
                ...rules.number,
                (val) => rules.longitudEntreONull(val, 7, 9),
              ]"
              @click:append-inner="consultarPersona"
              @blur="consultarPersona"
              @keydown.enter="consultarPersona"
            ></v-text-field>
          </v-col>

          <v-col cols="12" sm="8">
            <v-text-field
              v-model="apeynom"
              label="Agente Seleccionado"
              variant="outlined"
              density="compact"
              readonly
              :color="personaId > 0 ? 'success' : undefined"
              :prepend-inner-icon="personaId > 0 ? 'mdi-check-circle' : 'mdi-account-alert'"
              :hint="formaLiquidarSelected.value === 2 ? 'Se liquidarán todos los cargos vigentes de la persona' : undefined"
              persistent-hint
            ></v-text-field>
          </v-col>
        </v-row>

        <!-- Selección específica de Cargo (3: Por Cargo) -->
        <v-row v-if="formaLiquidarSelected.value === 3">
          <v-col cols="12" sm="8">
            <v-select
              v-model="cargoSeleccionado"
              label="Seleccionar Cargo Vigente del Agente"
              :items="cargosAgente"
              item-title="name"
              item-value="value"
              return-object
              variant="outlined"
              density="compact"
              :loading="cargandoCargos"
              no-data-text="Ingrese el DNI para listar cargos, o ingrese el ID directamente a la derecha"
              clearable
              @update:model-value="onCargoSelectChange"
            ></v-select>
          </v-col>

          <v-col cols="12" sm="4">
            <v-text-field
              v-model="cargoId"
              label="ID de Cargo Específico"
              type="number"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-briefcase-check"
              :rules="[
                (v) => !!v || 'ID de Cargo requerido',
                (v) => Number(v) > 0 || 'Debe ser mayor a 0',
              ]"
            ></v-text-field>
          </v-col>
        </v-row>

        <v-divider class="my-3"></v-divider>

        <div class="d-flex justify-space-between align-center">
          <div class="text-caption text-medium-emphasis">
            <v-icon icon="mdi-information-outline" size="small" class="me-1"></v-icon>
            El cálculo corre como proceso batch (SP: <code>sp/liq</code>).
          </div>

          <v-btn
            color="primary"
            prepend-icon="mdi-play"
            :loading="isRunning"
            :disabled="isRunning"
            @click="solicitarConfirmacion"
          >
            {{ formaLiquidarSelected.value === 3 ? 'Liquidar Cargo' : formaLiquidarSelected.value === 2 ? 'Liquidar Persona' : 'Ejecutar Liquidación' }}
          </v-btn>
        </div>
      </v-form>
    </v-card-text>

    <!-- Diálogo de Confirmación -->
    <v-dialog v-model="mostrarConfirmacion" max-width="540px">
      <ConfirmacionDialog
        titulo="Confirmar Liquidación"
        :mensaje="generarMensajeConfirmacion()"
        :cerrar="() => (mostrarConfirmacion = false)"
        :aceptar="ejecutarLiquidacion"
      />
    </v-dialog>
  </v-card>
</template>
