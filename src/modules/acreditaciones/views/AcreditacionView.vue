<script setup>
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { LiqInputPanel } from "@/shared/components";
import { useFilterStore } from "@/stores/filterStore";
import { useEndPoints } from "@/composables/useEndPoints";
import BloqueoLiquidaciones from "../components/BloqueoLiquidaciones.vue";
import ResumenAcred from "../components/ResumenAcred.vue";
import ResumenAcredDetalle from "../components/ResumenAcredDetalle.vue";
import ArchAcred from "../components/ArchAcred.vue";
import {
  descargarResumenExcel,
  descargarDetalleExcel,
  descargarArchivoBancoTxt,
  descargarTodosArchivos,
} from "../services/acreditacionDescargas.js";

const route = useRoute();
const store = useFilterStore();
const { apiBase, getBoletasHeaders, buildApiHeaders } = useEndPoints();

const tabActiva = ref(route.query.tab || "bloqueo");

// Estados de carga de descargas
const descargandoResumen = ref(false);
const descargandoDetalle = ref(false);
const descargandoTxt = ref(false);
const descargandoTodos = ref(false);

const isDescargandoCualquiera = computed(
  () =>
    descargandoResumen.value ||
    descargandoDetalle.value ||
    descargandoTxt.value ||
    descargandoTodos.value
);

// Notificaciones de descarga
const alertDescarga = ref({
  mostrar: false,
  tipo: "success",
  mensaje: "",
});

function mostrarMensaje(mensaje, tipo = "success") {
  alertDescarga.value = {
    mostrar: true,
    tipo,
    mensaje,
  };
}

async function onDescargarResumen() {
  if (isDescargandoCualquiera.value) return;
  descargandoResumen.value = true;
  alertDescarga.value.mostrar = false;
  try {
    const nombre = await descargarResumenExcel(store);
    mostrarMensaje(`Se descargó exitosamente el resumen: ${nombre}`);
  } catch (err) {
    mostrarMensaje(err.message || "Error al descargar el archivo de resumen.", "error");
  } finally {
    descargandoResumen.value = false;
  }
}

async function onDescargarDetalle() {
  if (isDescargandoCualquiera.value) return;
  descargandoDetalle.value = true;
  alertDescarga.value.mostrar = false;
  try {
    const nombre = await descargarDetalleExcel(store);
    mostrarMensaje(`Se descargó exitosamente el detalle: ${nombre}`);
  } catch (err) {
    mostrarMensaje(err.message || "Error al descargar el archivo de detalle.", "error");
  } finally {
    descargandoDetalle.value = false;
  }
}

async function onDescargarTxt() {
  if (isDescargandoCualquiera.value) return;
  descargandoTxt.value = true;
  alertDescarga.value.mostrar = false;
  try {
    const headersFn = buildApiHeaders || getBoletasHeaders || (() => ({}));
    const nombre = await descargarArchivoBancoTxt(store, apiBase.value, headersFn);
    mostrarMensaje(`Se descargó exitosamente el archivo bancario TXT: ${nombre}`);
  } catch (err) {
    mostrarMensaje(err.message || "Error al descargar el archivo bancario TXT.", "error");
  } finally {
    descargandoTxt.value = false;
  }
}

async function onDescargarTodos() {
  if (isDescargandoCualquiera.value) return;
  descargandoTodos.value = true;
  alertDescarga.value.mostrar = false;
  try {
    const headersFn = buildApiHeaders || getBoletasHeaders || (() => ({}));
    const descargados = await descargarTodosArchivos(store, apiBase.value, headersFn);
    mostrarMensaje(`Se descargaron exitosamente ${descargados.length} archivo(s): ${descargados.join(", ")}`);
  } catch (err) {
    mostrarMensaje(err.message || "Error al descargar los archivos.", "error");
  } finally {
    descargandoTodos.value = false;
  }
}
</script>

<template>
  <v-container>
    <!-- Tarjeta Principal con Título y Filtros de Liquidación -->
    <v-card class="elevation-1 border mb-4" rounded="lg">
      <v-card-title class="d-flex align-center justify-space-between flex-wrap py-3 px-4 bg-primary text-white">
        <div class="d-flex align-center">
          <v-icon icon="mdi-bank-transfer" class="me-2"></v-icon>
          <span class="text-h6 font-weight-bold">Acreditaciones Bancarias</span>
        </div>

        <!-- Menú Desplegable con Todos los Archivos -->
        <div class="d-flex align-center ga-2 mt-2 mt-sm-0">
          <v-menu location="bottom end">
            <template #activator="{ props: menuProps }">
              <v-btn
                v-bind="menuProps"
                color="white"
                variant="elevated"
                class="text-primary font-weight-bold"
                prepend-icon="mdi-download"
                append-icon="mdi-menu-down"
                :loading="isDescargandoCualquiera"
              >
                Descargar Archivos
              </v-btn>
            </template>

            <v-list density="compact" class="elevation-4 border rounded" min-width="260">
              <v-list-item
                prepend-icon="mdi-file-excel"
                title="Descargar Resumen (Excel)"
                subtitle="Resumen general por concepto"
                :disabled="isDescargandoCualquiera"
                @click="onDescargarResumen"
              />
              <v-list-item
                prepend-icon="mdi-table-large"
                title="Descargar Detalle (Excel)"
                subtitle="Detalle completo agente por agente"
                :disabled="isDescargandoCualquiera"
                @click="onDescargarDetalle"
              />
              <v-list-item
                prepend-icon="mdi-file-document-outline"
                title="Descargar Archivo Bancario (TXT)"
                subtitle="Archivo en formato texto plano banco"
                :disabled="isDescargandoCualquiera"
                @click="onDescargarTxt"
              />
              <v-divider class="my-1" />
              <v-list-item
                prepend-icon="mdi-folder-download"
                title="Descargar los 3 Archivos"
                subtitle="Resumen + Detalle + Archivo TXT"
                class="text-primary font-weight-bold"
                :disabled="isDescargandoCualquiera"
                @click="onDescargarTodos"
              />
            </v-list>
          </v-menu>
        </div>
      </v-card-title>

      <!-- Panel de Selección de Período y Filtros -->
      <v-card-text class="pt-3 pb-1">
        <LiqInputPanel :esley="true" />
      </v-card-text>

      <!-- Barra Rápida de Descargas Directas -->
      <div class="px-4 py-2 bg-grey-lighten-4 d-flex align-center justify-space-between flex-wrap ga-2 border-t">
        <div class="text-caption text-medium-emphasis d-flex align-center">
          <v-icon icon="mdi-information-outline" size="small" class="me-1 text-primary" />
          <span>
            Período: <strong>{{ store.periodoString }}</strong> |
            {{ store.liqString }} |
            <strong>{{ store.ley ? 'Ley Especial (1)' : 'Liquidación General / Efectivo (0)' }}</strong>
          </span>
        </div>

        <div class="d-flex align-center flex-wrap ga-2">
          <span class="text-caption font-weight-bold text-medium-emphasis d-none d-md-inline">
            Descarga rápida:
          </span>
          <v-btn
            size="small"
            color="success"
            variant="tonal"
            prepend-icon="mdi-file-excel"
            :loading="descargandoResumen"
            :disabled="isDescargandoCualquiera"
            @click="onDescargarResumen"
          >
            Resumen
          </v-btn>
          <v-btn
            size="small"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-file-excel"
            :loading="descargandoDetalle"
            :disabled="isDescargandoCualquiera"
            @click="onDescargarDetalle"
          >
            Detalle
          </v-btn>
          <v-btn
            size="small"
            color="warning"
            variant="tonal"
            prepend-icon="mdi-file-document-outline"
            :loading="descargandoTxt"
            :disabled="isDescargandoCualquiera"
            @click="onDescargarTxt"
          >
            Archivo TXT
          </v-btn>
          <v-btn
            size="small"
            color="primary"
            variant="flat"
            prepend-icon="mdi-folder-download"
            :loading="descargandoTodos"
            :disabled="isDescargandoCualquiera"
            @click="onDescargarTodos"
          >
            Descargar Todo
          </v-btn>
        </div>
      </div>

      <!-- Alerta de Notificación de Descarga -->
      <v-expand-transition>
        <div v-if="alertDescarga.mostrar" class="px-4 pt-2">
          <v-alert
            v-model="alertDescarga.mostrar"
            :type="alertDescarga.tipo"
            variant="tonal"
            density="compact"
            closable
            class="mb-2"
          >
            {{ alertDescarga.mensaje }}
          </v-alert>
        </div>
      </v-expand-transition>

      <v-divider />

      <!-- Pestañas de Navegación del Módulo -->
      <v-tabs
        v-model="tabActiva"
        color="primary"
        bg-color="grey-lighten-4"
        grow
        slider-color="primary"
      >
        <v-tab value="bloqueo" class="font-weight-bold text-warning-darken-3">
          <v-icon start icon="mdi-shield-lock" color="warning" />
          1. Bloquear Liquidaciones
        </v-tab>
        <v-tab value="detalle" class="font-weight-medium">
          <v-icon start icon="mdi-table-large" />
          2. Detalle y Excel
        </v-tab>
        <v-tab value="resumen" class="font-weight-medium">
          <v-icon start icon="mdi-chart-box-outline" />
          3. Resumen General
        </v-tab>
        <v-tab value="archivo" class="font-weight-medium">
          <v-icon start icon="mdi-file-download-outline" />
          4. Archivo Bancario TXT
        </v-tab>
      </v-tabs>
    </v-card>

    <!-- Contenido de las Pestañas -->
    <v-window v-model="tabActiva">
      <!-- PESTAÑA 1: BLOQUEAR LIQUIDACIONES -->
      <v-window-item value="bloqueo">
        <BloqueoLiquidaciones />
      </v-window-item>

      <!-- PESTAÑA 2: DETALLE Y EXCEL -->
      <v-window-item value="detalle">
        <ResumenAcredDetalle />
      </v-window-item>

      <!-- PESTAÑA 3: RESUMEN GENERAL -->
      <v-window-item value="resumen">
        <ResumenAcred />
      </v-window-item>

      <!-- PESTAÑA 4: ARCHIVO BANCARIO TXT -->
      <v-window-item value="archivo">
        <ArchAcred />
      </v-window-item>
    </v-window>
  </v-container>
</template>
