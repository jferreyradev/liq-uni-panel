<script setup>
import { ref, computed, onMounted } from "vue";
import { tipoLiq } from "@/utils/tipos";
import { getVto, getFechaToAPIFromMMYYYY, getVtoActual } from "@/utils/formatos";
import { rules } from "@/utils/reglasValidacion";
import { buildSearchValue } from "@/utils/query";
import { leerDatos, ejecutarSP_SinEspera } from "@/shared/services/apiService";
import { useFilterStore } from "@/stores/filterStore";
import { ConfirmacionDialog } from "@/shared/components";

const emit = defineEmits(["proceso-iniciado"]);

const filterStore = useFilterStore();
const repId = computed(() => Number(filterStore.serverIdRep || filterStore.serverConfig?.IDREP) || 0);
const repNombre = computed(
  () =>
    filterStore.serverDescripcion ||
    (repId.value ? `Repartición #${repId.value}` : "Todas las reparticiones")
);

const form = ref(null);
const formValido = ref(false);
const isRunning = ref(false);
const progresoMensaje = ref("");

const formasLiquidar = [
  { name: "Liquidación Masiva (Repartición Activa)", value: 1 },
  { name: "Por Persona (Individual o Múltiple)", value: 2 },
  { name: "Por Cargo (Individual o Múltiple)", value: 3 },
];
const formaLiquidarSelected = ref(formasLiquidar[0]);

const tipoLiqSelected = ref(tipoLiq[0]);
const periodo = ref("");
const adicional = ref(0);

// Bandeja de selección múltiple (personas o cargos)
const itemsSeleccionados = ref([]);

// Búsqueda facilitada
const busquedaPersonaTexto = ref("");
const buscandoPersonasLista = ref(false);
const resultadosPersonas = ref([]);

const busquedaCargoTexto = ref("");
const buscandoCargosLista = ref(false);
const resultadosCargos = ref([]);

// Persona (campos individuales compatibles con tests y entrada directa)
const dni = ref("");
const dniConsultado = ref("");
const personaId = ref(0);
const apeynom = ref("");
const buscandoPersona = ref(false);

// Cargo (campos individuales compatibles con tests y entrada directa)
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

// Métodos para bandeja de selección múltiple
function agregarPersonaALista(p) {
  const pId = p.PERSONAID ?? p.ID ?? p.Id;
  const doc = p.DOCUMENTO || p.Documento || "";
  const nom = p.APELLIDOYNOMBRE || [p.APELLIDO, p.NOMBRE].filter(Boolean).join(", ");
  if (!itemsSeleccionados.value.some((x) => x.tipo === "persona" && x.id === pId)) {
    itemsSeleccionados.value.push({
      tipo: "persona",
      id: pId,
      dni: doc,
      nombre: nom,
      detalle: `DNI: ${doc}`,
    });
  }
}

function agregarCargoALista(c) {
  const cId = c.ID || c.Id;
  const orden = c.ORDEN ?? c.Orden;
  const pId = c.PERSONAID || c.PersonaId || 0;
  const nom =
    c.PERSONAAPELLIDO || c.APELLIDO
      ? `${c.PERSONAAPELLIDO || c.APELLIDO}, ${c.PERSONANOMBRE || c.NOMBRE || ""}`.trim()
      : `Cargo #${cId}`;
  if (!itemsSeleccionados.value.some((x) => x.tipo === "cargo" && x.id === cId)) {
    itemsSeleccionados.value.push({
      tipo: "cargo",
      id: cId,
      orden,
      personaId: pId,
      nombre: nom,
      detalle: `Orden: ${orden ?? "—"} (Rep: ${c.REPARTICIONID ?? repId.value}, Cat: ${c.CATEGORIA ?? "—"})`,
    });
  }
}

function agregarTodasLasPersonas() {
  resultadosPersonas.value.forEach(agregarPersonaALista);
}

function agregarTodosLosCargos() {
  resultadosCargos.value.forEach(agregarCargoALista);
}

function quitarItem(idx) {
  itemsSeleccionados.value.splice(idx, 1);
}

function limpiarSeleccionados() {
  itemsSeleccionados.value = [];
}

// Búsqueda facilitada de personas (por DNI o Apellido) filtrando por Tipo de Liquidación activo
async function buscarPersonasAvanzada() {
  const q = String(busquedaPersonaTexto.value || "").trim();
  if (!q) {
    resultadosPersonas.value = [];
    return;
  }
  buscandoPersonasLista.value = true;
  resultadosPersonas.value = [];
  try {
    // 1. Intentar buscar en view/cargo para acotar a la repartición y al Tipo de Liquidación activo
    const queryCargo = { EstadoCargoId: 1 };
    if (repId.value) {
      queryCargo.ReparticionId = repId.value;
    }
    if (tipoLiqSelected.value?.value && tipoLiqSelected.value.value !== -1) {
      queryCargo.TipoLiquidacionId = tipoLiqSelected.value.value;
    }
    if (/^\d+$/.test(q)) {
      queryCargo.PersonaDocumento = q;
    } else {
      const val = buildSearchValue("PersonaApellido", q);
      if (val) queryCargo.search = val;
    }
    const { datos, operacionOk } = await leerDatos("view/cargo", { query: queryCargo });
    if (operacionOk && Array.isArray(datos) && datos.length > 0) {
      const map = new Map();
      for (const c of datos) {
        const pId = c.PERSONAID ?? c.PersonaId;
        if (pId && !map.has(pId)) {
          const doc = c.PERSONADOCUMENTO || c.Documento;
          const nom =
            c.PERSONAAPELLIDO || c.APELLIDO
              ? `${c.PERSONAAPELLIDO || c.APELLIDO}, ${c.PERSONANOMBRE || c.NOMBRE || ""}`.trim()
              : `Persona #${pId}`;
          map.set(pId, {
            PERSONAID: pId,
            DOCUMENTO: doc,
            APELLIDOYNOMBRE: nom,
          });
        }
      }
      resultadosPersonas.value = Array.from(map.values());
      if (resultadosPersonas.value.length === 1) {
        seleccionarPersonaResultado(resultadosPersonas.value[0]);
      }
    } else {
      // Fallback a view/personaLista si no trajo cargos
      const query = {};
      if (/^\d+$/.test(q)) {
        query.Documento = q;
      } else {
        const val = buildSearchValue("Apellido", q);
        if (val) query.search = val;
      }
      const resP = await leerDatos("view/personaLista", { query });
      if (resP.operacionOk && Array.isArray(resP.datos)) {
        resultadosPersonas.value = resP.datos;
        if (resP.datos.length === 1) {
          seleccionarPersonaResultado(resP.datos[0]);
        }
      }
    }
  } catch {
    resultadosPersonas.value = [];
  } finally {
    buscandoPersonasLista.value = false;
  }
}

function seleccionarPersonaResultado(p) {
  const pId = p.PERSONAID ?? p.ID ?? p.Id ?? 0;
  personaId.value = pId;
  dni.value = String(p.DOCUMENTO || p.Documento || "");
  dniConsultado.value = dni.value;
  apeynom.value =
    p.APELLIDOYNOMBRE ||
    [p.APELLIDO, p.NOMBRE].filter(Boolean).join(", ");
  if (formaLiquidarSelected.value.value === 3) {
    cargarCargosAgente(pId);
  }
}

// Búsqueda facilitada de cargos (por Orden, DNI o Apellido) filtrando por Tipo de Liquidación activo
async function buscarCargosAvanzada() {
  const q = String(busquedaCargoTexto.value || "").trim();
  if (!q) {
    resultadosCargos.value = [];
    return;
  }
  buscandoCargosLista.value = true;
  resultadosCargos.value = [];
  try {
    const query = { EstadoCargoId: 1 };
    if (repId.value) {
      query.ReparticionId = repId.value;
    }
    if (tipoLiqSelected.value?.value && tipoLiqSelected.value.value !== -1) {
      query.TipoLiquidacionId = tipoLiqSelected.value.value;
    }
    if (/^\d+$/.test(q)) {
      if (q.length <= 6) {
        query.Orden = q;
      } else {
        query.PersonaDocumento = q;
      }
    } else {
      const val = buildSearchValue("PersonaApellido", q);
      if (val) query.search = val;
    }
    const { datos, operacionOk } = await leerDatos("view/cargo", { query });
    if (operacionOk && Array.isArray(datos)) {
      resultadosCargos.value = datos;
      if (datos.length === 1) {
        const c = datos[0];
        cargoId.value = c.ID || c.Id;
        personaId.value = c.PERSONAID || c.PersonaId || 0;
        apeynom.value =
          c.PERSONAAPELLIDO || c.APELLIDO
            ? `${c.PERSONAAPELLIDO || c.APELLIDO}, ${c.PERSONANOMBRE || c.NOMBRE || ""}`.trim()
            : "";
      }
    }
  } catch {
    resultadosCargos.value = [];
  } finally {
    buscandoCargosLista.value = false;
  }
}

async function cargarCargosAgente(pId) {
  if (!pId) {
    cargosAgente.value = [];
    cargoSeleccionado.value = null;
    return;
  }
  cargandoCargos.value = true;
  try {
    const query = { PersonaId: pId, EstadoCargoId: 1 };
    if (tipoLiqSelected.value?.value && tipoLiqSelected.value.value !== -1) {
      query.TipoLiquidacionId = tipoLiqSelected.value.value;
    }
    const { datos, operacionOk } = await leerDatos("view/cargo", { query });
    if (operacionOk && Array.isArray(datos)) {
      cargosAgente.value = datos.map((c) => ({
        name: `Cargo #${c.ID || c.Id} — Orden ${c.ORDEN} (Rep: ${c.REPARTICIONID}, Cat: ${c.CATEGORIA})`,
        value: c.ID || c.Id,
        raw: c,
      }));
      if (cargosAgente.value.length > 0) {
        cargoSeleccionado.value = cargosAgente.value[0];
        cargoId.value = cargosAgente.value[0].value;
      } else {
        cargoSeleccionado.value = null;
        cargoId.value = null;
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
  itemsSeleccionados.value = [];
  resultadosPersonas.value = [];
  resultadosCargos.value = [];
  if (valor === 3 && personaId.value > 0 && cargosAgente.value.length === 0) {
    cargarCargosAgente(personaId.value);
  }
}

function onTipoLiqChange() {
  if (busquedaCargoTexto.value) {
    buscarCargosAvanzada();
  }
  if (busquedaPersonaTexto.value) {
    buscarPersonasAvanzada();
  }
  if (personaId.value > 0 && formaLiquidarSelected.value.value === 3) {
    cargarCargosAgente(personaId.value);
  }
}

async function solicitarConfirmacion() {
  const { valid } = await form.value.validate();
  if (!valid) return;

  if (
    formaLiquidarSelected.value.value === 2 &&
    itemsSeleccionados.value.length === 0 &&
    (!personaId.value || personaId.value === 0)
  ) {
    alertTipo.value = "error";
    alertMensaje.value = "Debe buscar y seleccionar al menos una persona con DNI válido antes de liquidar.";
    mostrarAlert.value = true;
    return;
  }

  if (
    formaLiquidarSelected.value.value === 3 &&
    itemsSeleccionados.value.length === 0 &&
    (!cargoId.value || Number(cargoId.value) <= 0)
  ) {
    alertTipo.value = "error";
    alertMensaje.value = "Debe buscar o seleccionar al menos un Cargo válido a liquidar.";
    mostrarAlert.value = true;
    return;
  }

  mostrarConfirmacion.value = true;
}

function generarMensajeConfirmacion() {
  if (formaLiquidarSelected.value.value === 2) {
    if (itemsSeleccionados.value.length > 0) {
      return `¿Desea ejecutar la liquidación por Persona para los ${itemsSeleccionados.value.length} agentes seleccionados en el período ${periodo.value} (${tipoLiqSelected.value.name})?`;
    }
    return `¿Desea ejecutar la liquidación por Persona para ${apeynom.value} (DNI ${dni.value}, todos sus cargos) en el período ${periodo.value} (${tipoLiqSelected.value.name})?`;
  }
  if (formaLiquidarSelected.value.value === 3) {
    if (itemsSeleccionados.value.length > 0) {
      return `¿Desea ejecutar la liquidación para los ${itemsSeleccionados.value.length} cargos seleccionados en el período ${periodo.value} (${tipoLiqSelected.value.name})?`;
    }
    const detalle = apeynom.value ? ` de ${apeynom.value}` : "";
    return `¿Desea ejecutar la liquidación del Cargo #${cargoId.value}${detalle} en el período ${periodo.value} (${tipoLiqSelected.value.name})?`;
  }
  return `¿Desea ejecutar la liquidación masiva para ${repNombre.value} en el período ${periodo.value} (${tipoLiqSelected.value.name})?`;
}

async function ejecutarLiquidacion() {
  mostrarConfirmacion.value = false;
  isRunning.value = true;
  mostrarAlert.value = false;
  progresoMensaje.value = "";

  const repActual = repId.value;
  const grupoRepActual = repActual ? 0 : 1;
  const fechaPeriodo = getFechaToAPIFromMMYYYY(periodo.value);
  const tipoLiqVal = tipoLiqSelected.value.value;
  const grupoAdicionalVal = Number(adicional.value) || 0;

  try {
    // 1. MODO MASIVO
    if (formaLiquidarSelected.value.value === 1) {
      const payload = {
        Periodo: fechaPeriodo,
        GrupoRep: grupoRepActual,
        Rep: repActual,
        IdPersona: 0,
        CargoId: 0,
        TipoLiq: tipoLiqVal,
        GrupoAdicional: grupoAdicionalVal,
      };
      const { salida } = await ejecutarSP_SinEspera("sp/liq", payload);
      if (salida === 0) {
        alertTipo.value = "success";
        alertMensaje.value = `Liquidación masiva enviada a procesar para el período ${periodo.value}.`;
        emit("proceso-iniciado", { tipo: "liquidacion", payload });
      } else {
        alertTipo.value = "error";
        alertMensaje.value = "No se pudo iniciar el proceso de liquidación en el servidor.";
      }
    }
    // 2. MODO POR PERSONA
    else if (formaLiquidarSelected.value.value === 2) {
      if (itemsSeleccionados.value.length > 0) {
        const total = itemsSeleccionados.value.length;
        let procesados = 0;
        for (let i = 0; i < total; i++) {
          const item = itemsSeleccionados.value[i];
          progresoMensaje.value = `Liquidando persona ${i + 1} de ${total}: ${item.nombre}...`;
          const payload = {
            Periodo: fechaPeriodo,
            GrupoRep: 0,
            Rep: repActual,
            IdPersona: item.id,
            CargoId: 0,
            TipoLiq: tipoLiqVal,
            GrupoAdicional: grupoAdicionalVal,
          };
          await ejecutarSP_SinEspera("sp/liq", payload);
          procesados++;
        }
        alertTipo.value = "success";
        alertMensaje.value = `Se enviaron a procesar ${procesados} personas seleccionadas para el período ${periodo.value}.`;
        emit("proceso-iniciado", { tipo: "liquidacion", total: procesados });
      } else {
        const payload = {
          Periodo: fechaPeriodo,
          GrupoRep: 0,
          Rep: repActual,
          IdPersona: personaId.value,
          CargoId: 0,
          TipoLiq: tipoLiqVal,
          GrupoAdicional: grupoAdicionalVal,
        };
        const { salida } = await ejecutarSP_SinEspera("sp/liq", payload);
        if (salida === 0) {
          alertTipo.value = "success";
          alertMensaje.value = `Liquidación por persona enviada para ${apeynom.value} (Período: ${periodo.value}).`;
          emit("proceso-iniciado", { tipo: "liquidacion", payload });
        } else {
          alertTipo.value = "error";
          alertMensaje.value = "No se pudo iniciar el proceso de liquidación en el servidor.";
        }
      }
    }
    // 3. MODO POR CARGO
    else if (formaLiquidarSelected.value.value === 3) {
      if (itemsSeleccionados.value.length > 0) {
        const total = itemsSeleccionados.value.length;
        let procesados = 0;
        for (let i = 0; i < total; i++) {
          const item = itemsSeleccionados.value[i];
          progresoMensaje.value = `Liquidando cargo ${i + 1} de ${total} (Orden ${item.orden || item.id}): ${item.nombre}...`;
          const payload = {
            Periodo: fechaPeriodo,
            GrupoRep: 0,
            Rep: repActual,
            IdPersona: item.personaId || 0,
            CargoId: Number(item.id),
            TipoLiq: tipoLiqVal,
            GrupoAdicional: grupoAdicionalVal,
          };
          await ejecutarSP_SinEspera("sp/liq", payload);
          procesados++;
        }
        alertTipo.value = "success";
        alertMensaje.value = `Se enviaron a procesar ${procesados} cargos seleccionados para el período ${periodo.value}.`;
        emit("proceso-iniciado", { tipo: "liquidacion", total: procesados });
      } else {
        let finalCargoId = Number(cargoId.value) || 0;
        let finalPersonaId = personaId.value || 0;

        // Si el valor ingresado corresponde a un Nro de Orden/Boleta, resolver su ID real en la base de datos
        if (finalCargoId > 0 && finalCargoId <= 99999) {
          try {
            const queryOrd = {
              ...(repActual ? { ReparticionId: repActual } : {}),
              Orden: finalCargoId,
              ...(tipoLiqVal && tipoLiqVal !== -1 ? { TipoLiquidacionId: tipoLiqVal } : {}),
            };
            const resCargo = await leerDatos("view/cargo", { query: queryOrd });
            if (resCargo.operacionOk && Array.isArray(resCargo.datos) && resCargo.datos.length > 0) {
              const matched = resCargo.datos[0];
              finalCargoId = Number(matched.ID ?? matched.Id ?? finalCargoId);
              if (!finalPersonaId) {
                finalPersonaId = Number(matched.PERSONAID ?? matched.PersonaId ?? 0);
              }
            }
          } catch {
            // fallback al ID ingresado
          }
        }

        const payload = {
          Periodo: fechaPeriodo,
          GrupoRep: 0,
          Rep: repActual,
          IdPersona: finalPersonaId,
          CargoId: finalCargoId,
          TipoLiq: tipoLiqVal,
          GrupoAdicional: grupoAdicionalVal,
        };
        const { salida } = await ejecutarSP_SinEspera("sp/liq", payload);
        if (salida === 0) {
          alertTipo.value = "success";
          alertMensaje.value = `Liquidación del Cargo (ID #${finalCargoId}) enviada a procesar (Período: ${periodo.value}).`;
          emit("proceso-iniciado", { tipo: "liquidacion", payload });
        } else {
          alertTipo.value = "error";
          alertMensaje.value = "No se pudo iniciar el proceso de liquidación en el servidor.";
        }
      }
    }
  } catch (err) {
    alertTipo.value = "error";
    alertMensaje.value = err.message || "Error al solicitar la liquidación.";
  } finally {
    isRunning.value = false;
    progresoMensaje.value = "";
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
          Cálculo de haberes y retenciones: masivo por repartición, o específico para múltiples personas o cargos.
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

      <div v-if="isRunning && progresoMensaje" class="mb-4 pa-3 bg-blue-lighten-5 border rounded d-flex align-center">
        <v-progress-circular indeterminate color="primary" size="24" class="me-3" />
        <span class="text-caption font-weight-medium text-primary">{{ progresoMensaje }}</span>
      </div>

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
              @update:model-value="onTipoLiqChange"
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

        <!-- Alcance Masivo (1: Por Repartición Activa de Sesión) -->
        <v-row v-if="formaLiquidarSelected.value === 1">
          <v-col cols="12">
            <div class="border rounded px-4 py-3 bg-grey-lighten-5 d-flex align-center justify-space-between flex-wrap ga-2">
              <div class="d-flex align-center">
                <v-icon icon="mdi-domain" color="primary" class="me-2"></v-icon>
                <div>
                  <div class="text-caption text-medium-emphasis">Repartición fijada por sesión</div>
                  <div class="text-body-1 font-weight-bold text-primary">{{ repNombre }}</div>
                </div>
              </div>
              <v-chip color="primary" variant="tonal" size="small" class="font-weight-medium">
                ID Rep: {{ repId || 'General' }}
              </v-chip>
            </div>
          </v-col>
        </v-row>

        <!-- Bandeja de Selección Múltiple (visible si hay items en modo 2 o 3) -->
        <div
          v-if="(formaLiquidarSelected.value === 2 || formaLiquidarSelected.value === 3) && itemsSeleccionados.length > 0"
          class="border rounded pa-3 mb-4 bg-grey-lighten-5"
        >
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="font-weight-bold text-caption text-uppercase text-primary d-flex align-center">
              <v-icon icon="mdi-format-list-checks" size="small" class="me-1"></v-icon>
              Bandeja de Selección ({{ itemsSeleccionados.length }} {{ formaLiquidarSelected.value === 2 ? 'personas' : 'cargos' }})
            </div>
            <v-btn
              size="x-small"
              variant="text"
              color="error"
              prepend-icon="mdi-delete-sweep"
              @click="limpiarSeleccionados"
            >
              Vaciar bandeja
            </v-btn>
          </div>
          <div class="d-flex flex-wrap ga-2">
            <v-chip
              v-for="(item, idx) in itemsSeleccionados"
              :key="item.id + '-' + idx"
              closable
              size="small"
              color="primary"
              variant="flat"
              @click:close="quitarItem(idx)"
            >
              <strong>{{ item.nombre }}</strong>
              <span class="ms-1 opacity-80 text-caption">({{ item.detalle }})</span>
            </v-chip>
          </div>
        </div>

        <!-- MODO 2: Búsqueda y Selección por Persona -->
        <template v-if="formaLiquidarSelected.value === 2">
          <!-- Búsqueda rápida por Apellido o DNI con lista -->
          <v-card variant="outlined" class="mb-4 pa-3 bg-white">
            <div class="text-subtitle-2 font-weight-bold mb-2 d-flex align-center justify-space-between flex-wrap ga-2">
              <div class="d-flex align-center">
                <v-icon icon="mdi-account-search" size="small" class="me-1 text-primary" />
                Buscar Agentes para Liquidar
              </div>
              <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-medium">
                Filtrado por: {{ tipoLiqSelected.name }}
              </v-chip>
            </div>
            <v-row dense align="center">
              <v-col cols="12" sm="8" md="9">
                <v-text-field
                  v-model="busquedaPersonaTexto"
                  label="Buscar por Apellido o DNI"
                  placeholder="Ej: PEREZ o 28920504"
                  variant="outlined"
                  density="compact"
                  prepend-inner-icon="mdi-magnify"
                  hide-details
                  clearable
                  :loading="buscandoPersonasLista"
                  @keydown.enter="buscarPersonasAvanzada"
                />
              </v-col>
              <v-col cols="12" sm="4" md="3" class="d-flex ga-2">
                <v-btn
                  color="primary"
                  variant="flat"
                  size="small"
                  prepend-icon="mdi-magnify"
                  :loading="buscandoPersonasLista"
                  @click="buscarPersonasAvanzada"
                >
                  Buscar
                </v-btn>
                <v-btn
                  v-if="resultadosPersonas.length > 1"
                  color="secondary"
                  variant="tonal"
                  size="small"
                  prepend-icon="mdi-playlist-plus"
                  @click="agregarTodasLasPersonas"
                >
                  Agregar Todos
                </v-btn>
              </v-col>
            </v-row>

            <!-- Resultados de Búsqueda de Personas -->
            <div
              v-if="resultadosPersonas.length > 0"
              class="border rounded mt-3 overflow-y-auto"
              style="max-height: 200px"
            >
              <v-table density="compact" hover>
                <thead>
                  <tr class="bg-grey-lighten-4">
                    <th class="text-left font-weight-bold">DNI</th>
                    <th class="text-left font-weight-bold">Apellido y Nombre</th>
                    <th class="text-center font-weight-bold" style="width: 140px">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in resultadosPersonas" :key="p.PERSONAID ?? p.ID ?? p.Id">
                    <td>{{ p.DOCUMENTO || p.Documento }}</td>
                    <td class="font-weight-medium">
                      {{ p.APELLIDOYNOMBRE || [p.APELLIDO, p.NOMBRE].filter(Boolean).join(", ") }}
                    </td>
                    <td class="text-center">
                      <v-btn
                        size="x-small"
                        color="primary"
                        variant="tonal"
                        prepend-icon="mdi-plus"
                        @click="agregarPersonaALista(p)"
                      >
                        Agregar
                      </v-btn>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </v-card>

          <!-- Entrada directa por DNI (compatibilidad total con pruebas y flujo rápido) -->
          <v-row align="center">
            <v-col cols="12" sm="4">
              <v-text-field
                v-model="dni"
                label="DNI del Agente (Entrada Directa)"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-card-account-details-outline"
                append-inner-icon="mdi-magnify"
                :loading="buscandoPersona"
                :rules="[
                  (v) => (itemsSeleccionados.length > 0 ? true : (!!v || 'DNI requerido o agregue agentes a la bandeja')),
                  ...rules.number,
                  (val) => rules.longitudEntreONull(val, 7, 9),
                ]"
                @click:append-inner="consultarPersona"
                @blur="consultarPersona"
                @keydown.enter="consultarPersona"
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="6">
              <v-text-field
                v-model="apeynom"
                label="Agente Seleccionado"
                variant="outlined"
                density="compact"
                readonly
                :color="personaId > 0 ? 'success' : undefined"
                :prepend-inner-icon="personaId > 0 ? 'mdi-check-circle' : 'mdi-account-alert'"
                hint="Se liquidarán todos los cargos vigentes de la persona"
                persistent-hint
              ></v-text-field>
            </v-col>

            <v-col cols="12" sm="2">
              <v-btn
                v-if="personaId > 0"
                size="small"
                variant="tonal"
                color="primary"
                prepend-icon="mdi-plus"
                class="w-100"
                @click="agregarPersonaALista({ PERSONAID: personaId, DOCUMENTO: dni, APELLIDOYNOMBRE: apeynom })"
              >
                A la bandeja
              </v-btn>
            </v-col>
          </v-row>
        </template>

        <!-- MODO 3: Búsqueda y Selección por Cargo -->
        <template v-if="formaLiquidarSelected.value === 3">
          <!-- Búsqueda avanzada de cargos por Orden, DNI o Apellido -->
          <v-card variant="outlined" class="mb-4 pa-3 bg-white">
            <div class="text-subtitle-2 font-weight-bold mb-2 d-flex align-center justify-space-between flex-wrap ga-2">
              <div class="d-flex align-center">
                <v-icon icon="mdi-briefcase-search" size="small" class="me-1 text-primary" />
                Buscar Cargos para Liquidar (por Orden, Apellido o DNI)
              </div>
              <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-medium">
                Filtrado por: {{ tipoLiqSelected.name }}
              </v-chip>
            </div>
            <v-row dense align="center">
              <v-col cols="12" sm="8" md="9">
                <v-text-field
                  v-model="busquedaCargoTexto"
                  label="Buscar por Orden del Cargo, Apellido o DNI"
                  placeholder="Ej: 63, MATIUSSI o 28920504"
                  variant="outlined"
                  density="compact"
                  prepend-inner-icon="mdi-magnify"
                  hide-details
                  clearable
                  :loading="buscandoCargosLista"
                  @keydown.enter="buscarCargosAvanzada"
                />
              </v-col>
              <v-col cols="12" sm="4" md="3" class="d-flex ga-2">
                <v-btn
                  color="primary"
                  variant="flat"
                  size="small"
                  prepend-icon="mdi-magnify"
                  :loading="buscandoCargosLista"
                  @click="buscarCargosAvanzada"
                >
                  Buscar
                </v-btn>
                <v-btn
                  v-if="resultadosCargos.length > 1"
                  color="secondary"
                  variant="tonal"
                  size="small"
                  prepend-icon="mdi-playlist-plus"
                  @click="agregarTodosLosCargos"
                >
                  Agregar Todos
                </v-btn>
              </v-col>
            </v-row>

            <!-- Resultados de Búsqueda de Cargos -->
            <div
              v-if="resultadosCargos.length > 0"
              class="border rounded mt-3 overflow-y-auto"
              style="max-height: 200px"
            >
              <v-table density="compact" hover>
                <thead>
                  <tr class="bg-grey-lighten-4">
                    <th class="text-center font-weight-bold">Orden</th>
                    <th class="text-left font-weight-bold">Agente</th>
                    <th class="text-center font-weight-bold">DNI</th>
                    <th class="text-center font-weight-bold">Cat</th>
                    <th class="text-center font-weight-bold">Tipo Liq</th>
                    <th class="text-center font-weight-bold" style="width: 140px">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in resultadosCargos" :key="c.ID || c.Id">
                    <td class="text-center font-weight-bold text-primary">{{ c.ORDEN ?? c.Orden }}</td>
                    <td class="font-weight-medium">
                      {{ c.PERSONAAPELLIDO || c.APELLIDO ? `${c.PERSONAAPELLIDO || c.APELLIDO}, ${c.PERSONANOMBRE || c.NOMBRE || ''}` : `Cargo #${c.ID || c.Id}` }}
                    </td>
                    <td class="text-center">{{ c.PERSONADOCUMENTO || c.DOCUMENTO || '—' }}</td>
                    <td class="text-center font-weight-bold">{{ c.CATEGORIA || '—' }}</td>
                    <td class="text-center">
                      <v-chip size="x-small" variant="tonal" color="primary">
                        {{ c.TIPOLIQUIDACIONDESCRIPCION || tipoLiqSelected.name }}
                      </v-chip>
                    </td>
                    <td class="text-center">
                      <v-btn
                        size="x-small"
                        color="primary"
                        variant="tonal"
                        prepend-icon="mdi-plus"
                        @click="agregarCargoALista(c)"
                      >
                        Agregar
                      </v-btn>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </v-card>

          <!-- Selección directa por Cargo / DNI (compatibilidad total con pruebas y entrada directa) -->
          <v-row>
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
                no-data-text="Busque por Orden/DNI arriba o ingrese el ID directamente a la derecha"
                clearable
                @update:model-value="onCargoSelectChange"
              ></v-select>
            </v-col>

            <v-col cols="12" sm="4">
              <v-text-field
                v-model="cargoId"
                label="Cargo (ID o N° Boleta/Orden)"
                type="number"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-briefcase-check"
                hint="Ingrese el N° de Boleta/Orden (ej: 63) o el ID del cargo"
                persistent-hint
                :rules="[
                  (v) => (itemsSeleccionados.length > 0 ? true : (!!v || 'ID de Cargo o N° Boleta requerido o agregue cargos a la bandeja')),
                  (v) => (!v || Number(v) > 0 || 'Debe ser mayor a 0'),
                ]"
              ></v-text-field>
            </v-col>
          </v-row>
        </template>

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
            {{
              formaLiquidarSelected.value === 3
                ? itemsSeleccionados.length > 1
                  ? `Liquidar ${itemsSeleccionados.length} Cargos`
                  : 'Liquidar Cargo'
                : formaLiquidarSelected.value === 2
                  ? itemsSeleccionados.length > 1
                    ? `Liquidar ${itemsSeleccionados.length} Personas`
                    : 'Liquidar Persona'
                  : 'Ejecutar Liquidación'
            }}
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
