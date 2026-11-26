<script setup>
import { ref, computed } from "vue";
import { RepoHeader } from "@/shared/components";
import { useFilterStore } from "@/stores/filterStore";
import { useEndPoints } from "@/composables/useEndPoints";
import { useFetch } from "@/composables/useFetch";
import { financial, agregaTitulosExcel } from "@/utils/reportes.js";
import { utils, writeFileXLSX } from "xlsx";
import { ejecutarSP } from "@/shared/services/apiService";

const { apiBase, getBoletasHeaders, buildApiHeaders } = useEndPoints();
const store = useFilterStore();
const preview = ref(true);
const refreshTrigger = ref(0);

// Búsqueda y Filtros
const busquedaCargo = ref("");
const filtroEstado = ref("todos"); // "todos" | "activos" | "bloqueados"

// Selección y Diálogo de Bloqueo
const seleccionados = ref([]);
const mostrarDialogoBloqueo = ref(false);
const itemsABloquear = ref([]);
const modoBloqueoEsLey = ref(store.ley ? 1 : 0);
const isBloqueando = ref(false);
const bloqueandoId = ref(null);

// Alertas
const mostrarAlert = ref(false);
const alertMensaje = ref("");
const alertTipo = ref("success");

function useResumenAcred(getId) {
  const headersFn = buildApiHeaders || getBoletasHeaders || (() => ({}));
  return useFetch(
    () => {
      void refreshTrigger.value;
      return `${apiBase.value}/api/view/detalleAcred?${getId()}`;
    },
    () => ({ headers: headersFn() })
  );
}

const { data, error, isPending } = useResumenAcred(() => store.filterStringLey);

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

const getPeriodo = (per) => {
  if (per) {
    const p = per.split("-");
    return `${p[0]}_${p[1]}`;
  }
  return null;
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
  if (filtroEstado.value === "activos") {
    return data.value.filter((x) => Number(x.BLOQ) === 0);
  }
  if (filtroEstado.value === "bloqueados") {
    return data.value.filter((x) => Number(x.BLOQ) === 1);
  }
  return data.value;
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
  } else {
    alertTipo.value = "error";
    alertMensaje.value = `No se pudo bloquear la cuenta bancaria: ${ultimoError}`;
    mostrarAlert.value = true;
  }
}

function exportFile() {
  if (!data.value || data.value.length === 0) return;

  const map1 = (itemsFiltrados.value || data.value).map((x) => {
    return [
      x.GRUPOADICIONALID,
      getVto(x.PERIODO),
      getVto(x.FECHADEV),
      x.LIQUIDACIONID,
      x.DOCUMENTO,
      x.APELLIDO,
      x.NOMBRE,
      x.REPARTICIONID,
      x.ORDEN,
      x.AFILIADO,
      x.CUIL,
      x.CBU,
      x.HABERES,
      x.RETENCIONES,
      x.NETO,
      x.UNIORG,
      x.BLOQ,
      x.ESLEY,
    ];
  });

  const titulosTabla = [
    "Grupo Adicional",
    "Periodo",
    "Fecha dev",
    "Liquidacion Id",
    "Documento",
    "Apellido",
    "Nombre",
    "Reparticion",
    "Orden",
    "Afiliado",
    "CUIL",
    "CBU",
    "Haberes",
    "Retenciones",
    "Neto",
    "Uni Org",
    "Bloqueo",
    "Es Ley",
  ];
  const filtros = store.liqString;
  const tituloReporte = "Detalle Acreditaciones";
  agregaTitulosExcel(map1, tituloReporte, filtros, titulosTabla);
  const ws = utils.aoa_to_sheet(map1);

  ws["!cols"] = [
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
    { wch: 10 },
    { wch: 15 },
    { wch: 20 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 25 },
    { wch: 25 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
  ];
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");

  writeFileXLSX(wb, `Detalle_Acred_${getPeriodo(store.periodoString) || store.liqCompactString}.xlsx`, {
    compression: true,
  });
}
</script>

<template>
  <v-container class="px-0">
    <RepoHeader title="Detalle Acreditaciones" :subtitle="store.liqString">
      <v-btn
        :color="preview ? 'secondary' : 'primary'"
        variant="outlined"
        :prepend-icon="preview ? 'mdi-chevron-up' : 'mdi-table'"
        @click="preview = !preview"
      >
        {{ preview ? "Ocultar Tabla" : "Mostrar Tabla" }}
      </v-btn>
      <v-btn
        color="primary"
        prepend-icon="mdi-file-excel"
        :disabled="!data || data.length === 0"
        @click="exportFile"
      >
        Descargar Excel
      </v-btn>
    </RepoHeader>

    <!-- Alerta de Operación -->
    <v-alert
      v-model="mostrarAlert"
      :type="alertTipo"
      variant="tonal"
      density="comfortable"
      closable
      class="mt-2 mb-3"
    >
      {{ alertMensaje }}
    </v-alert>

    <v-row v-if="preview" class="ma-0">
      <div v-if="isPending" class="py-4 text-center text-medium-emphasis w-100">
        <v-progress-circular indeterminate color="primary" size="24" class="me-2" />
        Cargando detalle de liquidaciones...
      </div>
      <div v-else-if="error" class="text-error py-3 w-100">
        No se puede obtener los datos solicitados.
      </div>
      <div v-else class="w-100">
        <!-- Barra de Búsqueda de Cargo y Filtros Rápidos -->
        <v-card class="mb-3 border" rounded="lg" variant="outlined">
          <v-card-text class="py-2 px-3 bg-grey-lighten-5">
            <v-row align="center" dense>
              <!-- Buscador de Cargo -->
              <v-col cols="12" sm="5" md="4">
                <v-text-field
                  v-model="busquedaCargo"
                  prepend-inner-icon="mdi-magnify"
                  label="Buscar cargo (Orden, DNI, Apellido)..."
                  placeholder="Ej: 261, 12414451, DIAZ..."
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>

              <!-- Filtro de Estado de Bloqueo -->
              <v-col cols="12" sm="7" md="4" class="d-flex align-center ga-1">
                <v-btn-toggle
                  v-model="filtroEstado"
                  mandatory
                  density="compact"
                  color="primary"
                  variant="outlined"
                >
                  <v-btn value="todos" size="small">
                    Todos ({{ data?.length || 0 }})
                  </v-btn>
                  <v-btn value="activos" size="small" color="success">
                    Activos ({{ totalActivos }})
                  </v-btn>
                  <v-btn value="bloqueados" size="small" color="error">
                    Bloqueados ({{ totalBloqueados }})
                  </v-btn>
                </v-btn-toggle>
              </v-col>

              <!-- Botón de Acción Masiva Bloquear -->
              <v-col cols="12" sm="12" md="4" class="d-flex justify-end align-center ga-2">
                <span v-if="seleccionados.length > 0" class="text-caption font-weight-bold text-primary">
                  {{ seleccionados.length }} seleccionado(s)
                </span>
                <v-btn
                  color="warning"
                  prepend-icon="mdi-lock-outline"
                  :disabled="seleccionados.length === 0 || isBloqueando"
                  :loading="isBloqueando"
                  @click="abrirConfirmacionMultiple"
                >
                  Bloquear Cta Banco ({{ seleccionados.length }})
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Tabla de Datos con Selección Múltiple -->
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
          no-data-text="Sin datos para mostrar con los filtros actuales."
        >
          <!-- Slot Acciones -->
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

          <!-- Slot Bloqueo -->
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

          <!-- Slot Es Ley -->
          <template #[`item.ESLEY`]="{ item }">
            <v-chip
              size="x-small"
              :color="Number(item.ESLEY) === 1 ? 'info' : 'secondary'"
              variant="outlined"
            >
              {{ Number(item.ESLEY) === 1 ? "Ley" : "Efectivo" }}
            </v-chip>
          </template>

          <!-- Slot Orden -->
          <template #[`item.ORDEN`]="{ item }">
            <span class="font-weight-bold text-primary">#{{ item.ORDEN }}</span>
          </template>

          <!-- Slot Neto -->
          <template #[`item.NETO`]="{ item }">
            <span class="font-weight-bold text-success">{{ financial(item.NETO) }}</span>
          </template>

          <!-- Slot Haberes -->
          <template #[`item.HABERES`]="{ item }">
            <span>{{ financial(item.HABERES) }}</span>
          </template>

          <!-- Slot Retenciones -->
          <template #[`item.RETENCIONES`]="{ item }">
            <span>{{ financial(item.RETENCIONES) }}</span>
          </template>

          <!-- Slot CBU -->
          <template #[`item.CBU`]="{ item }">
            <span class="font-mono text-caption">{{ item.CBU || "-" }}</span>
          </template>

          <!-- Slot Periodo -->
          <template #[`item.PERIODO`]="{ item }">
            <span>{{ getVto(item.PERIODO) }}</span>
          </template>

          <!-- Slot Fecha dev -->
          <template #[`item.FECHADEV`]="{ item }">
            <span>{{ getVto(item.FECHADEV) }}</span>
          </template>
        </v-data-table>
      </div>
    </v-row>

    <!-- Diálogo de Confirmación para Bloqueo de Cuenta Banco -->
    <v-dialog v-model="mostrarDialogoBloqueo" max-width="580px" persistent>
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center bg-warning-lighten-5 text-warning-darken-3 py-3 px-4">
          <v-icon icon="mdi-shield-lock" class="me-2" color="warning" />
          <span class="text-h6 font-weight-bold">Bloquear Cuenta Bancaria</span>
        </v-card-title>

        <v-card-text class="pa-4">
          <p class="text-body-2 mb-3">
            ¿Está seguro de bloquear la cuenta bancaria para
            <strong>{{ itemsABloquear.length }} liquidación(es)</strong>
            correspondiente(s) al período <strong>{{ store.periodoString }}</strong>?
          </p>

          <v-alert type="info" variant="tonal" density="compact" class="mb-3 text-caption">
            Procedimiento: <code>sp/acred_bloquearCtaBco</code>. Las liquidaciones bloqueadas se excluyen de la acreditación bancaria para el medio indicado.
          </v-alert>

          <!-- Selector de Modo de Bloqueo (Ley o Efectivo) -->
          <div class="border rounded pa-3 mb-3 bg-grey-lighten-5">
            <div class="text-caption font-weight-bold text-medium-emphasis mb-1">
              Bloquear acreditación de:
            </div>
            <v-radio-group v-model="modoBloqueoEsLey" density="compact" hide-details>
              <v-radio label="Liquidación General / Efectivo (vESLEY = 0)" :value="0" />
              <v-radio label="Cobra Ley Especial (vESLEY = 1)" :value="1" />
              <v-radio label="Según el valor actual de cada registro (Ley / Efectivo)" :value="-1" />
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
  </v-container>
</template>
