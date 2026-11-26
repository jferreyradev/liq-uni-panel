<script setup>
import { ref, computed, watch } from "vue";
import { useFilterStore } from "@/stores/filterStore";
import { useEndPoints } from "@/composables/useEndPoints";
import { useFetch } from "@/composables/useFetch";
import { ejecutarSP, leerDatos } from "@/shared/services/apiService";

const { apiBase, getBoletasHeaders, buildApiHeaders } = useEndPoints();
const store = useFilterStore();
const refreshTrigger = ref(0);

// Búsqueda y Filtros en grilla de liquidaciones
const busquedaCargo = ref("");
const filtroReparticion = ref(null);

// Búsqueda directa alternativa en view/cargo (por si se busca un cargo puntual)
const busquedaDirectaTexto = ref("");
const buscandoCargoDirecto = ref(false);
const cargoDirectoEncontrado = ref(null);
const cargoDirectoMensaje = ref("");

// Modo de Bloqueo: 0 = Efectivo, 1 = Ley Especial, 2 = Ambos
const modoBloqueoEsLey = ref(store.ley ? 1 : 0);

// Sincronizar reactivamente con store.ley
watch(
  () => store.ley,
  (val) => {
    modoBloqueoEsLey.value = Number(val) === 1 ? 1 : 0;
  },
  { immediate: true }
);

function cambiarModoBloqueo(nuevoModo) {
  modoBloqueoEsLey.value = nuevoModo;
  if (nuevoModo === 0 || nuevoModo === 1) {
    store.ley = nuevoModo;
  }
}

const descripcionModoBloqueo = computed(() => {
  if (modoBloqueoEsLey.value === 1) return "Ley Especial (vESLEY = 1)";
  if (modoBloqueoEsLey.value === 2) return "Ambos (Efectivo y Ley)";
  return "Efectivo / General (vESLEY = 0)";
});

const colorModoBloqueo = computed(() => {
  if (modoBloqueoEsLey.value === 1) return "purple-darken-1";
  if (modoBloqueoEsLey.value === 2) return "indigo-darken-1";
  return "warning";
});

// Selección y Modal de Bloqueo
const seleccionados = ref([]);
const mostrarDialogoBloqueo = ref(false);
const itemsABloquear = ref([]);
const isBloqueando = ref(false);
const bloqueandoId = ref(null);

// Alertas de feedback
const mostrarAlert = ref(false);
const alertMensaje = ref("");
const alertTipo = ref("success");

// Consulta las liquidaciones calculadas antes de generar el archivo bancario (view/liq)
function useLiquidaciones() {
  const headersFn = buildApiHeaders || getBoletasHeaders || (() => ({}));
  return useFetch(
    () => {
      // Registrar dependencia reactiva para refrescar sin enviar campos extra a la API
      void refreshTrigger.value;
      return `${apiBase.value}/api/view/liq?${store.filterString}&sort={"Orden":"asc"}`;
    },
    () => ({ headers: headersFn() })
  );
}

const { data, error, isPending } = useLiquidaciones();

const getVto = (vto) => {
  if (vto) {
    const d = vto.split("-");
    if (d.length >= 2) {
      return `${d[1]}/${d[0]}`;
    }
    return vto;
  }
  return "-";
};

const headers = [
  { title: "Acciones", key: "acciones", sortable: false, align: "center", width: "90px" },
  { title: "Orden / Cargo", key: "ORDEN", align: "end", sortable: true, width: "120px" },
  { title: "Documento", key: "DOCUMENTO", align: "start", sortable: true, width: "120px" },
  { title: "Apellido", key: "APELLIDO", align: "start", sortable: true },
  { title: "Nombre", key: "NOMBRE", align: "start", sortable: true },
  { title: "CUIL", key: "PERSONACUIL", align: "start", sortable: true },
  { title: "Tipo Liq.", key: "TIPOLIQUIDACIONDESCRIPCION", align: "start", sortable: true },
  { title: "Adicional", key: "GRUPOADICIONALID", align: "end", sortable: true, width: "100px" },
  { title: "Periodo", key: "PERIODO", align: "start", sortable: true, width: "110px" },
  { title: "Fecha Dev.", key: "FECHADEV", align: "start", sortable: true, width: "110px" },
  { title: "Liquidación Id", key: "LIQUIDACIONID", align: "end", sortable: true, width: "130px" },
  { title: "Repartición", key: "REPARTICIONID", align: "end", sortable: true, width: "110px" },
  { title: "Uni Org", key: "UNIORG", align: "end", sortable: true, width: "100px" },
];

const itemsLiquidacion = computed(() => {
  if (!data.value || !Array.isArray(data.value)) return [];
  if (filtroReparticion.value !== null && filtroReparticion.value !== "") {
    return data.value.filter(
      (item) => String(item.REPARTICIONID) === String(filtroReparticion.value)
    );
  }
  return data.value;
});

const listaReparticiones = computed(() => {
  if (!data.value || !Array.isArray(data.value)) return [];
  const setRep = new Set();
  for (const item of data.value) {
    if (item.REPARTICIONID !== undefined && item.REPARTICIONID !== null) {
      setRep.add(item.REPARTICIONID);
    }
  }
  return Array.from(setRep).sort((a, b) => Number(a) - Number(b));
});

function abrirConfirmacionIndividual(item) {
  itemsABloquear.value = [item];
  mostrarDialogoBloqueo.value = true;
}

function abrirConfirmacionMultiple() {
  if (seleccionados.value.length === 0) return;
  itemsABloquear.value = [...seleccionados.value];
  mostrarDialogoBloqueo.value = true;
}

// Búsqueda directa de cargo por Orden o DNI en view/cargo
async function buscarCargoDirecto() {
  const q = String(busquedaDirectaTexto.value || "").trim();
  if (!q) return;

  buscandoCargoDirecto.value = true;
  cargoDirectoEncontrado.value = null;
  cargoDirectoMensaje.value = "";

  try {
    const query = { EstadoCargoId: 1 };
    if (/^\d+$/.test(q)) {
      if (q.length <= 6) {
        query.Orden = q;
      } else {
        query.PersonaDocumento = q;
      }
    }

    const { datos, operacionOk } = await leerDatos("view/cargo", { query });
    if (operacionOk && Array.isArray(datos) && datos.length > 0) {
      const c = datos[0];
      cargoDirectoEncontrado.value = {
        LIQUIDACIONID: c.ID || c.Id || 0,
        DOCUMENTO: c.PERSONADOCUMENTO || c.Documento || "",
        APELLIDO: c.PERSONAAPELLIDO || c.APELLIDO || "",
        NOMBRE: c.PERSONANOMBRE || c.NOMBRE || "",
        REPARTICIONID: c.REPARTICIONID || store.serverIdRep || 400,
        ORDEN: c.ORDEN || c.Orden || q,
        TIPOLIQUIDACIONID: store.tipoliq || 1,
        TIPOLIQUIDACIONDESCRIPCION: "MENSUAL",
        PERIODO: store.periodoDMY,
        FECHADEV: store.periodoDMY,
        GRUPOADICIONALID: store.nroadi || 0,
        PERSONACUIL: c.CUIL || "",
      };
      cargoDirectoMensaje.value = `Cargo encontrado: Orden #${cargoDirectoEncontrado.value.ORDEN} - ${cargoDirectoEncontrado.value.APELLIDO} ${cargoDirectoEncontrado.value.NOMBRE}`;
    } else {
      cargoDirectoMensaje.value = `No se encontró ningún cargo activo con "${q}".`;
    }
  } catch {
    cargoDirectoMensaje.value = "Error al consultar el cargo en el servidor.";
  } finally {
    buscandoCargoDirecto.value = false;
  }
}

function bloquearCargoDirecto() {
  if (!cargoDirectoEncontrado.value) return;
  abrirConfirmacionIndividual(cargoDirectoEncontrado.value);
}

// Ejecución del procedimiento de bloqueo en Oracle (sp/acred_bloquearCtaBco)
async function ejecutarBloqueoCtaBco() {
  if (itemsABloquear.value.length === 0) return;

  isBloqueando.value = true;
  mostrarAlert.value = false;
  let exitosos = 0;
  let fallidos = 0;
  let ultimoError = "";

  // Valores de vESLEY a enviar: 0 (Efectivo), 1 (Ley), o ambos si modoBloqueoEsLey === 2
  const valoresEsLey = modoBloqueoEsLey.value === 2 ? [0, 1] : [modoBloqueoEsLey.value];

  for (const item of itemsABloquear.value) {
    bloqueandoId.value = item.LIQUIDACIONID;

    for (const esLeyVal of valoresEsLey) {
      const payload = {
        vIDREP: item.REPARTICIONID || Number(store.serverIdRep) || 400,
        vORDEN: item.ORDEN,
        vTIPOLIQ: item.TIPOLIQUIDACIONID || Number(store.tipoliq) || 1,
        vNROADI: item.GRUPOADICIONALID !== undefined ? Number(item.GRUPOADICIONALID) : (Number(store.nroadi) || 0),
        vPERIODO: item.PERIODO || store.periodoDMY,
        vVTO: item.FECHADEV || item.PERIODO || store.periodoDMY,
        vESLEY: esLeyVal,
      };

      try {
        const res = await ejecutarSP("sp/acred_bloquearCtaBco", payload);
        if (res && (res.operacionOk || res.salida === 0 || res.estado === 200)) {
          exitosos++;
        } else {
          fallidos++;
          ultimoError = res?.errmsg || "Error al ejecutar el procedimiento";
        }
      } catch (err) {
        fallidos++;
        ultimoError = err.message || "Error al procesar";
      }
    }
  }

  bloqueandoId.value = null;
  isBloqueando.value = false;
  mostrarDialogoBloqueo.value = false;

  const descTipo = modoBloqueoEsLey.value === 1 ? "Ley Especial (vESLEY: 1)" : modoBloqueoEsLey.value === 2 ? "Efectivo y Ley (vESLEY: 0 y 1)" : "Efectivo (vESLEY: 0)";

  if (exitosos > 0) {
    alertTipo.value = fallidos > 0 ? "warning" : "success";
    alertMensaje.value = fallidos > 0
      ? `Se aplicó bloqueo a ${exitosos} operaciones (${descTipo}), pero fallaron ${fallidos}: ${ultimoError}`
      : `Se bloqueó exitosamente la acreditación bancaria para ${itemsABloquear.value.length} liquidación(es) en modalidad: ${descTipo}.`;
    mostrarAlert.value = true;
    seleccionados.value = [];
    itemsABloquear.value = [];
    refreshTrigger.value++;
    cargoDirectoEncontrado.value = null;
    busquedaDirectaTexto.value = "";
  } else {
    alertTipo.value = "error";
    alertMensaje.value = `No se pudo bloquear la cuenta bancaria: ${ultimoError}`;
    mostrarAlert.value = true;
  }
}
</script>

<template>
  <v-card class="elevation-1 border" rounded="lg">
    <!-- Encabezado de la Sección -->
    <v-card-title class="d-flex align-center py-3 px-4 bg-amber-lighten-5 border-b text-amber-darken-4">
      <v-avatar color="warning" size="36" class="me-3 text-white">
        <v-icon icon="mdi-shield-lock" size="small"></v-icon>
      </v-avatar>
      <div class="flex-grow-1">
        <div class="text-h6 font-weight-bold">Bloqueo de Liquidaciones para Acreditación Bancaria</div>
        <div class="text-caption text-medium-emphasis">
          Seleccione liquidaciones para bloquear su acreditación bancaria <strong>antes de generar el archivo del banco</strong>. Procedimiento: <code>sp/acred_bloquearCtaBco</code>.
        </div>
      </div>
      <v-chip :color="colorModoBloqueo" variant="flat" class="font-weight-bold text-caption ms-2">
        Modo actual: {{ descripcionModoBloqueo }}
      </v-chip>
    </v-card-title>

    <v-card-text class="pa-4">
      <!-- Alerta de Operación -->
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

      <!-- Panel de Control: Selección de Modo (Efectivo/Ley), Búsqueda y Acciones -->
      <v-card class="mb-4 border" rounded="lg" variant="outlined">
        <v-card-text class="py-3 px-3 bg-grey-lighten-5">
          <v-row align="center" dense>
            <!-- Selector Destacado de Modo de Bloqueo (Efectivo vs Ley) -->
            <v-col cols="12" md="6" class="d-flex align-center flex-wrap ga-2">
              <span class="text-caption font-weight-bold text-medium-emphasis me-1">
                Bloquear como:
              </span>
              <v-btn-toggle
                :model-value="modoBloqueoEsLey"
                mandatory
                density="compact"
                color="warning"
                variant="outlined"
                divided
                @update:model-value="cambiarModoBloqueo"
              >
                <v-btn :value="0" size="small" prepend-icon="mdi-cash">
                  Efectivo (0)
                </v-btn>
                <v-btn :value="1" size="small" prepend-icon="mdi-scale-balance">
                  Ley (1)
                </v-btn>
                <v-btn :value="2" size="small" prepend-icon="mdi-checkbox-multiple-marked">
                  Ambos (0 y 1)
                </v-btn>
              </v-btn-toggle>
            </v-col>

            <!-- Total de Liquidaciones Disponibles -->
            <v-col cols="12" sm="6" md="3" class="d-flex align-center">
              <v-chip color="primary" variant="tonal" class="font-weight-medium">
                <v-icon start icon="mdi-calculator-variant" size="small" />
                {{ itemsLiquidacion.length }} liquidaciones
              </v-chip>
            </v-col>

            <!-- Botón Acción Masiva Bloquear -->
            <v-col cols="12" sm="6" md="3" class="d-flex justify-end align-center ga-2">
              <v-btn
                :color="colorModoBloqueo"
                variant="flat"
                prepend-icon="mdi-lock-outline"
                :disabled="seleccionados.length === 0 || isBloqueando"
                :loading="isBloqueando"
                @click="abrirConfirmacionMultiple"
              >
                Bloquear ({{ seleccionados.length }})
              </v-btn>
            </v-col>

            <!-- Filtros de Búsqueda y Repartición -->
            <v-col cols="12" sm="8" md="9" class="mt-2">
              <v-text-field
                v-model="busquedaCargo"
                prepend-inner-icon="mdi-magnify"
                label="Buscar cargo (N° Orden, DNI, Apellido o Nombre)..."
                placeholder="Ej: 914, MOLINA, 14039193..."
                variant="outlined"
                density="compact"
                hide-details
                clearable
              />
            </v-col>

            <v-col v-if="listaReparticiones.length > 1" cols="12" sm="4" md="3" class="mt-2">
              <v-select
                v-model="filtroReparticion"
                :items="['', ...listaReparticiones]"
                label="Repartición"
                variant="outlined"
                density="compact"
                hide-details
                clearable
              >
                <template #item="{ item, props }">
                  <v-list-item v-bind="props" :title="item.raw ? `Repartición ${item.raw}` : 'Todas'" />
                </template>
                <template #selection="{ item }">
                  <span>{{ item.raw ? `Rep. ${item.raw}` : 'Todas' }}</span>
                </template>
              </v-select>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Tabla de Liquidaciones (view/liq) -->
      <div v-if="isPending" class="py-6 text-center text-medium-emphasis">
        <v-progress-circular indeterminate color="warning" size="28" class="me-2" />
        Consultando liquidaciones calculadas del período (view/liq)...
      </div>

      <div v-else-if="error" class="text-error py-4 text-center">
        No se pudieron cargar las liquidaciones. Verifique los filtros o el período seleccionado.
      </div>

      <div v-else>
        <v-data-table
          v-model="seleccionados"
          show-select
          return-object
          item-value="LIQUIDACIONID"
          class="text-caption border rounded elevation-1"
          hover
          density="compact"
          :items="itemsLiquidacion"
          :headers="headers"
          :search="busquedaCargo"
          no-data-text="No hay liquidaciones disponibles en view/liq para el período y tipo seleccionados."
        >
          <!-- Acciones individuales -->
          <template #[`item.acciones`]="{ item }">
            <v-tooltip :text="`Bloquear cuenta bancaria (${descripcionModoBloqueo})`" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  icon="mdi-lock"
                  size="x-small"
                  :color="colorModoBloqueo"
                  variant="text"
                  :loading="bloqueandoId === item.LIQUIDACIONID"
                  @click.stop="abrirConfirmacionIndividual(item)"
                />
              </template>
            </v-tooltip>
          </template>

          <!-- Orden / Cargo -->
          <template #[`item.ORDEN`]="{ item }">
            <span class="font-weight-bold text-primary">#{{ item.ORDEN }}</span>
          </template>

          <!-- Documento -->
          <template #[`item.DOCUMENTO`]="{ item }">
            <span class="font-weight-medium">{{ item.DOCUMENTO }}</span>
          </template>

          <!-- Periodo -->
          <template #[`item.PERIODO`]="{ item }">
            <span>{{ getVto(item.PERIODO) }}</span>
          </template>

          <!-- Fecha dev -->
          <template #[`item.FECHADEV`]="{ item }">
            <span>{{ getVto(item.FECHADEV) }}</span>
          </template>
        </v-data-table>
      </div>

      <!-- Búsqueda Directa Alternativa de Cargo en view/cargo -->
      <v-expansion-panels class="mt-4" variant="accordion">
        <v-expansion-panel elevation="0" class="border rounded">
          <v-expansion-panel-title class="text-caption text-medium-emphasis py-2">
            <v-icon icon="mdi-account-search" size="small" class="me-2" />
            ¿Desea buscar un cargo puntual por N° de Orden o DNI que no figura arriba?
          </v-expansion-panel-title>
          <v-expansion-panel-text class="pt-2">
            <v-row dense align="center">
              <v-col cols="12" sm="6" md="4">
                <v-text-field
                  v-model="busquedaDirectaTexto"
                  label="N° de Orden o DNI del cargo"
                  placeholder="Ej: 914"
                  variant="outlined"
                  density="compact"
                  hide-details
                  @keyup.enter="buscarCargoDirecto"
                />
              </v-col>
              <v-col cols="12" sm="6" md="3">
                <v-btn
                  color="primary"
                  variant="outlined"
                  prepend-icon="mdi-magnify"
                  :loading="buscandoCargoDirecto"
                  @click="buscarCargoDirecto"
                >
                  Buscar Cargo
                </v-btn>
              </v-col>
            </v-row>

            <div v-if="cargoDirectoMensaje" class="text-caption mt-2 text-medium-emphasis">
              {{ cargoDirectoMensaje }}
            </div>

            <v-card v-if="cargoDirectoEncontrado" class="mt-3 border bg-grey-lighten-5" rounded="lg">
              <v-card-text class="py-2 px-3 d-flex justify-space-between align-center">
                <div>
                  <div class="text-subtitle-2 font-weight-bold text-primary">
                    Orden #{{ cargoDirectoEncontrado.ORDEN }} — {{ cargoDirectoEncontrado.APELLIDO }} {{ cargoDirectoEncontrado.NOMBRE }}
                  </div>
                  <div class="text-caption">
                    DNI: {{ cargoDirectoEncontrado.DOCUMENTO }} | Repartición: {{ cargoDirectoEncontrado.REPARTICIONID }} | Tipo Liq: {{ cargoDirectoEncontrado.TIPOLIQUIDACIONDESCRIPCION }}
                  </div>
                </div>
                <v-btn
                  :color="colorModoBloqueo"
                  size="small"
                  prepend-icon="mdi-lock"
                  @click="bloquearCargoDirecto"
                >
                  Bloquear este Cargo
                </v-btn>
              </v-card-text>
            </v-card>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>

    <!-- Diálogo de Confirmación para Bloqueo de Cuenta Banco -->
    <v-dialog v-model="mostrarDialogoBloqueo" max-width="580px" persistent>
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center bg-warning-lighten-5 text-warning-darken-3 py-3 px-4">
          <v-icon icon="mdi-shield-lock" class="me-2" color="warning" />
          <span class="text-h6 font-weight-bold">Confirmar Bloqueo de Cuenta Bancaria</span>
        </v-card-title>

        <v-card-text class="pa-4">
          <p class="text-body-2 mb-3">
            ¿Está seguro de bloquear la cuenta bancaria para
            <strong>{{ itemsABloquear.length }} liquidación(es)</strong>
            correspondiente(s) al período <strong>{{ store.periodoString }}</strong>?
          </p>

          <v-alert type="info" variant="tonal" density="compact" class="mb-3 text-caption">
            Procedimiento: <code>sp/acred_bloquearCtaBco</code>. Las liquidaciones bloqueadas no serán incluidas cuando se genere el archivo bancario.
          </v-alert>

          <!-- Selector de Modo de Bloqueo (Ley vs Efectivo) -->
          <div class="border rounded pa-3 mb-3 bg-grey-lighten-5">
            <div class="text-caption font-weight-bold text-medium-emphasis mb-2">
              Especificar medio de acreditación a bloquear:
            </div>
            <v-radio-group v-model="modoBloqueoEsLey" density="compact" hide-details>
              <v-radio label="Liquidación General / Efectivo (vESLEY = 0)" :value="0" />
              <v-radio label="Cobra Ley Especial (vESLEY = 1)" :value="1" />
              <v-radio label="Bloquear Ambos (Efectivo y Ley Especial)" :value="2" />
            </v-radio-group>
          </div>

          <!-- Resumen de Cargos a Bloquear -->
          <div v-if="itemsABloquear.length > 0" class="text-caption text-medium-emphasis mb-1">
            Liquidaciones a procesar:
          </div>
          <v-list density="compact" class="border rounded pa-0 overflow-y-auto" style="max-height: 180px;">
            <v-list-item
              v-for="item in itemsABloquear"
              :key="item.LIQUIDACIONID"
              density="compact"
              class="border-b"
            >
              <template #prepend>
                <v-icon icon="mdi-account" size="small" class="me-2 text-medium-emphasis" />
              </template>
              <v-list-item-title class="text-caption font-weight-bold">
                Orden #{{ item.ORDEN }} — {{ item.APELLIDO }} {{ item.NOMBRE }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                DNI: {{ item.DOCUMENTO }} | Tipo Liq: {{ item.TIPOLIQUIDACIONDESCRIPCION || store.tipoliq }} | Rep: {{ item.REPARTICIONID }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-3 d-flex justify-end ga-2">
          <v-btn
            variant="outlined"
            color="grey-darken-1"
            :disabled="isBloqueando"
            @click="mostrarDialogoBloqueo = false"
          >
            Cancelar
          </v-btn>
          <v-btn
            :color="colorModoBloqueo"
            variant="flat"
            :loading="isBloqueando"
            prepend-icon="mdi-lock"
            @click="ejecutarBloqueoCtaBco"
          >
            Confirmar Bloqueo
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>
