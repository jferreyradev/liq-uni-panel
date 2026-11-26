<script setup>
import { ref, computed } from "vue";
import { useFilterStore } from "@/stores/filterStore";
import { useEndPoints } from "@/composables/useEndPoints";
import { useFetch } from "@/composables/useFetch";
import { financial } from "@/utils/reportes.js";
import { ejecutarSP, leerDatos } from "@/shared/services/apiService";

const { apiBase, getBoletasHeaders, buildApiHeaders } = useEndPoints();
const store = useFilterStore();
const refreshTrigger = ref(0);

// Búsqueda en grilla y filtros de estado
const busquedaCargo = ref("");
const filtroEstado = ref("todos"); // "todos" | "activos" | "bloqueados"
const filtroTipo = ref("todos"); // "todos" | "efectivo" | "ley"

// Búsqueda directa alternativa en view/cargo (por si el usuario busca un cargo puntual)
const busquedaDirectaTexto = ref("");
const buscandoCargoDirecto = ref(false);
const cargoDirectoEncontrado = ref(null);
const cargoDirectoMensaje = ref("");

// Selección y Modal de Bloqueo
const seleccionados = ref([]);
const mostrarDialogoBloqueo = ref(false);
const itemsABloquear = ref([]);
const modoBloqueoEsLey = ref(store.ley ? 1 : 0);
const isBloqueando = ref(false);
const bloqueandoId = ref(null);

// Alertas de feedback
const mostrarAlert = ref(false);
const alertMensaje = ref("");
const alertTipo = ref("success");

// Consulta de liquidaciones para acreditación (sin forzar filtro estricto de Ley para mostrar ambas)
function useDetalleAcred() {
  const headersFn = buildApiHeaders || getBoletasHeaders || (() => ({}));
  return useFetch(
    () => {
      const m = String(Number(store.month) || (new Date().getMonth() + 1)).padStart(2, "0");
      const y = store.year || new Date().getFullYear();
      const per = `01/${m}/${y}`;
      return `${apiBase.value}/api/view/detalleAcred?TipoLiquidacionId=${store.tipoliq}&GrupoAdicionalId=${store.nroadi}&Periodo=${per}&_r=${refreshTrigger.value}`;
    },
    () => ({ headers: headersFn() })
  );
}

const { data, error, isPending } = useDetalleAcred();

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
  { title: "Bloqueo", key: "BLOQ", align: "center", width: "115px", sortable: true },
  { title: "Tipo", key: "ESLEY", align: "center", width: "105px", sortable: true },
  { title: "Orden", key: "ORDEN", align: "end", sortable: true },
  { title: "Documento", key: "DOCUMENTO", align: "start", sortable: true },
  { title: "Apellido", key: "APELLIDO", align: "start", sortable: true },
  { title: "Nombre", key: "NOMBRE", align: "start", sortable: true },
  { title: "Neto", key: "NETO", align: "end", sortable: true },
  { title: "CBU", key: "CBU", align: "start", sortable: true },
  { title: "Haberes", key: "HABERES", align: "end", sortable: true },
  { title: "Retenciones", key: "RETENCIONES", align: "end", sortable: true },
  { title: "Liquidación Id", key: "LIQUIDACIONID", align: "end", sortable: true },
  { title: "Adicional", key: "GRUPOADICIONALID", align: "end", sortable: true },
  { title: "Periodo", key: "PERIODO", align: "start", sortable: true },
  { title: "Fecha dev", key: "FECHADEV", align: "start", sortable: true },
  { title: "Repartición", key: "REPARTICIONID", align: "end", sortable: true },
  { title: "Afiliado", key: "AFILIADO", align: "end", sortable: true },
  { title: "CUIL", key: "CUIL", align: "start", sortable: true },
  { title: "Uni Org", key: "UNIORG", align: "end", sortable: true },
];

const itemsFiltrados = computed(() => {
  if (!data.value || !Array.isArray(data.value)) return [];
  let lista = data.value;

  // Filtro por Estado
  if (filtroEstado.value === "activos") {
    lista = lista.filter((x) => Number(x.BLOQ) === 0);
  } else if (filtroEstado.value === "bloqueados") {
    lista = lista.filter((x) => Number(x.BLOQ) === 1);
  }

  // Filtro por Tipo (Ley vs Efectivo)
  if (filtroTipo.value === "efectivo") {
    lista = lista.filter((x) => Number(x.ESLEY) === 0);
  } else if (filtroTipo.value === "ley") {
    lista = lista.filter((x) => Number(x.ESLEY) === 1);
  }

  return lista;
});

const totalActivos = computed(() => {
  if (!data.value || !Array.isArray(data.value)) return 0;
  return data.value.filter((x) => Number(x.BLOQ) === 0).length;
});

const totalBloqueados = computed(() => {
  if (!data.value || !Array.isArray(data.value)) return 0;
  return data.value.filter((x) => Number(x.BLOQ) === 1).length;
});

function abrirConfirmacionIndividual(item) {
  itemsABloquear.value = [item];
  modoBloqueoEsLey.value = item.ESLEY !== undefined ? Number(item.ESLEY) : (store.ley ? 1 : 0);
  mostrarDialogoBloqueo.value = true;
}

function abrirConfirmacionMultiple() {
  if (seleccionados.value.length === 0) return;
  itemsABloquear.value = [...seleccionados.value];
  modoBloqueoEsLey.value = store.ley ? 1 : 0;
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
    if (store.serverIdRep) {
      query.ReparticionId = store.serverIdRep;
    }
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
        CBU: c.CBU || "",
        HABERES: 0,
        RETENCIONES: 0,
        NETO: 0,
        BLOQ: 0,
        ESLEY: store.ley ? 1 : 0,
        PERIODO: store.periodoDMY,
        FECHADEV: store.periodoDMY,
        GRUPOADICIONALID: store.nroadi || 0,
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

// Ejecución del procedimiento de bloqueo
async function ejecutarBloqueoCtaBco() {
  if (itemsABloquear.value.length === 0) return;

  isBloqueando.value = true;
  mostrarAlert.value = false;
  let exitosos = 0;
  let fallidos = 0;
  let ultimoError = "";

  for (const item of itemsABloquear.value) {
    bloqueandoId.value = item.LIQUIDACIONID;

    let esLeyVal = item.ESLEY !== undefined ? Number(item.ESLEY) : (store.ley ? 1 : 0);
    if (modoBloqueoEsLey.value === 0) esLeyVal = 0;
    else if (modoBloqueoEsLey.value === 1) esLeyVal = 1;

    const payload = {
      vIDREP: item.REPARTICIONID || Number(store.serverIdRep) || 400,
      vORDEN: item.ORDEN,
      vTIPOLIQ: Number(store.tipoliq) || 1,
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

  bloqueandoId.value = null;
  isBloqueando.value = false;
  mostrarDialogoBloqueo.value = false;

  if (exitosos > 0) {
    alertTipo.value = fallidos > 0 ? "warning" : "success";
    alertMensaje.value = fallidos > 0
      ? `Se procesaron ${exitosos} liquidaciones, pero fallaron ${fallidos}: ${ultimoError}`
      : `Se bloqueó exitosamente la cuenta bancaria para ${exitosos} liquidación(es).`;
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
      <div>
        <div class="text-h6 font-weight-bold">Bloqueo de Liquidaciones / Cuentas Bancarias</div>
        <div class="text-caption text-medium-emphasis">
          Seleccione liquidaciones para bloquear su acreditación bancaria (por Ley o por Efectivo). Procedimiento: <code>sp/acred_bloquearCtaBco</code>.
        </div>
      </div>
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

      <!-- Panel de Búsqueda Rápida de Cargo y Filtros -->
      <v-card class="mb-4 border" rounded="lg" variant="outlined">
        <v-card-text class="py-3 px-3 bg-grey-lighten-5">
          <v-row align="center" dense>
            <!-- Buscador en Grilla de Liquidaciones -->
            <v-col cols="12" md="4">
              <v-text-field
                v-model="busquedaCargo"
                prepend-inner-icon="mdi-magnify"
                label="Buscar cargo en la lista (Orden, DNI, Apellido)..."
                placeholder="Ej: 261, 12414451, DIAZ..."
                variant="outlined"
                density="compact"
                hide-details
                clearable
              />
            </v-col>

            <!-- Filtros de Estado y Tipo -->
            <v-col cols="12" sm="7" md="5" class="d-flex flex-wrap align-center ga-1">
              <v-btn-toggle
                v-model="filtroEstado"
                mandatory
                density="compact"
                color="primary"
                variant="outlined"
              >
                <v-btn value="todos" size="small">Todos ({{ data?.length || 0 }})</v-btn>
                <v-btn value="activos" size="small" color="success">Activos ({{ totalActivos }})</v-btn>
                <v-btn value="bloqueados" size="small" color="error">Bloqueados ({{ totalBloqueados }})</v-btn>
              </v-btn-toggle>

              <v-btn-toggle
                v-model="filtroTipo"
                mandatory
                density="compact"
                color="secondary"
                variant="outlined"
                class="ms-2"
              >
                <v-btn value="todos" size="small">Ambos</v-btn>
                <v-btn value="efectivo" size="small">Efectivo</v-btn>
                <v-btn value="ley" size="small">Ley</v-btn>
              </v-btn-toggle>
            </v-col>

            <!-- Botón Acción Masiva Bloquear -->
            <v-col cols="12" sm="5" md="3" class="d-flex justify-end align-center ga-2">
              <v-btn
                color="warning"
                variant="flat"
                prepend-icon="mdi-lock-outline"
                :disabled="seleccionados.length === 0 || isBloqueando"
                :loading="isBloqueando"
                @click="abrirConfirmacionMultiple"
              >
                Bloquear Selección ({{ seleccionados.length }})
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Tabla de Liquidaciones para Bloqueo -->
      <div v-if="isPending" class="py-6 text-center text-medium-emphasis">
        <v-progress-circular indeterminate color="warning" size="28" class="me-2" />
        Cargando liquidaciones del período...
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
          :items="itemsFiltrados"
          :headers="headers"
          :search="busquedaCargo"
          no-data-text="No hay liquidaciones disponibles para bloquear en este período o filtros."
        >
          <!-- Acciones individuales -->
          <template #[`item.acciones`]="{ item }">
            <v-tooltip text="Bloquear cuenta bancaria de esta liquidación" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  icon="mdi-lock"
                  size="x-small"
                  color="warning"
                  variant="text"
                  :loading="bloqueandoId === item.LIQUIDACIONID"
                  @click.stop="abrirConfirmacionIndividual(item)"
                />
              </template>
            </v-tooltip>
          </template>

          <!-- Chip Bloqueo -->
          <template #[`item.BLOQ`]="{ item }">
            <v-chip
              size="x-small"
              :color="Number(item.BLOQ) === 1 ? 'error' : 'success'"
              :variant="Number(item.BLOQ) === 1 ? 'flat' : 'tonal'"
              class="font-weight-medium"
            >
              <v-icon start size="x-small">
                {{ Number(item.BLOQ) === 1 ? "mdi-lock" : "mdi-check-circle" }}
              </v-icon>
              {{ Number(item.BLOQ) === 1 ? "Bloqueado" : "Activo" }}
            </v-chip>
          </template>

          <!-- Chip Tipo (Ley / Efectivo) -->
          <template #[`item.ESLEY`]="{ item }">
            <v-chip
              size="x-small"
              :color="Number(item.ESLEY) === 1 ? 'info' : 'secondary'"
              variant="outlined"
            >
              {{ Number(item.ESLEY) === 1 ? "Ley Especial" : "Efectivo" }}
            </v-chip>
          </template>

          <!-- Orden -->
          <template #[`item.ORDEN`]="{ item }">
            <span class="font-weight-bold text-primary">#{{ item.ORDEN }}</span>
          </template>

          <!-- Importe Neto -->
          <template #[`item.NETO`]="{ item }">
            <span class="font-weight-bold text-success">{{ financial(item.NETO) }}</span>
          </template>

          <!-- Haberes -->
          <template #[`item.HABERES`]="{ item }">
            <span>{{ financial(item.HABERES) }}</span>
          </template>

          <!-- Retenciones -->
          <template #[`item.RETENCIONES`]="{ item }">
            <span>{{ financial(item.RETENCIONES) }}</span>
          </template>

          <!-- CBU -->
          <template #[`item.CBU`]="{ item }">
            <span class="font-mono text-caption">{{ item.CBU || "-" }}</span>
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

      <!-- Búsqueda Directa Alternativa de Cargo (por si se necesita bloquear un cargo puntual) -->
      <v-expansion-panels class="mt-4" variant="accordion">
        <v-expansion-panel elevation="0" class="border rounded">
          <v-expansion-panel-title class="text-caption text-medium-emphasis py-2">
            <v-icon icon="mdi-account-search" size="small" class="me-2" />
            ¿No encuentra el cargo en la lista? Búsqueda directa por N° de Orden
          </v-expansion-panel-title>
          <v-expansion-panel-text class="pt-2">
            <v-row dense align="center">
              <v-col cols="12" sm="6" md="4">
                <v-text-field
                  v-model="busquedaDirectaTexto"
                  label="N° de Orden o DNI del cargo"
                  placeholder="Ej: 261"
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
                    DNI: {{ cargoDirectoEncontrado.DOCUMENTO }} | Repartición: {{ cargoDirectoEncontrado.REPARTICIONID }} | CBU: {{ cargoDirectoEncontrado.CBU || 'S/D' }}
                  </div>
                </div>
                <v-btn
                  color="warning"
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
            Procedimiento: <code>sp/acred_bloquearCtaBco</code>. Las liquidaciones bloqueadas no serán procesadas en la acreditación bancaria del medio seleccionado.
          </v-alert>

          <!-- Selector de Modo de Bloqueo (Ley o Efectivo) -->
          <div class="border rounded pa-3 mb-3 bg-grey-lighten-5">
            <div class="text-caption font-weight-bold text-medium-emphasis mb-1">
              Seleccione la porción a bloquear:
            </div>
            <v-radio-group v-model="modoBloqueoEsLey" density="compact" hide-details>
              <v-radio label="Liquidación General / Efectivo (vESLEY = 0)" :value="0" />
              <v-radio label="Cobra Ley Especial (vESLEY = 1)" :value="1" />
              <v-radio label="Según el valor del registro (Ley / Efectivo)" :value="-1" />
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
                DNI: {{ item.DOCUMENTO }} | CBU: {{ item.CBU || 'S/D' }} | Neto: {{ financial(item.NETO) }}
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
            color="warning"
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
