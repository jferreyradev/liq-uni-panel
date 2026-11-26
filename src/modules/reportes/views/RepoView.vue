<script setup>
import RepoCod153 from "../components/RepoCod153.vue";
import RepoResumenLiq from "../components/RepoResumenLiq.vue";
import RepoResumenCod from "../components/RepoResumenCod.vue";
import RepoResumenLiqFDO from "../components/RepoResumenLiqFdo.vue";
import { LiqInputPanel } from "@/shared/components";
import RepoApoPatronales from "../components/RepoApoPatronales.vue";
import RepoPlanillaDetLiq from "../components/RepoPlanillaDetLiq.vue";
import RepoPlanillaRet from "../components/RepoPlanillaRet.vue";
import RepoPlanillaLey from "../components/RepoPlanillaLey.vue";
import RepoPlanillaResSueldo from "../components/RepoPlanillaResSueldo.vue";
import RepoPlanillaRetCargo from "../components/RepoPlanillaRetCargo.vue";
import RepoPlanillaRetencionesCPA from "../components/RepoPlanillaRetencionesCPA.vue";
import RepoBajasLey from "../components/RepoBajasLey.vue";
import RepoPlanillaResSueldoComp from "../components/RepoPlanillaResSueldoComp.vue";
import RepoPlanillaResumenCargos from "../components/RepoPlanillaResumenCargos.vue";

import { ref, computed, watch } from "vue";
import { useTenantStore } from "@/stores/tenantStore";

const tenantStore = useTenantStore();

const ALL_REPORTES = [
  { title: "Resumen Liquidacion", value: 1 },
  { title: "Detalle por concepto (153)", value: 2 },
  { title: "Resumen de liquidación por codigos", value: 4 },
  { title: "Resumen pedido FDO", value: 5 },
  { title: "Resumen Aportes Patronales", value: 6 },
  { title: "Planilla de Det. Liq.", value: 7 },
  { title: "Planilla de Retenciones", value: 8 },
  { title: "Planilla de Ley", value: 9 },
  { title: "Resumen de Sueldos", value: 10 },
  { title: "Retenciones de CPA", value: 11 },
  { title: "Retenciones de Cargo", value: 12 },
  { title: "Bajas de Ley", value: 13 },
  { title: "Res. de Sue. - Inas. - Ley", value: 14 },
  { title: "Resumen cargos", value: 15 },
];

const showAllReports = ref(false);

const reportes = computed(() => {
  if (showAllReports.value) return ALL_REPORTES;
  const allowed = tenantStore.activeTenant?.allowedReports;
  if (!allowed || allowed.length === 0) return ALL_REPORTES;
  return ALL_REPORTES.filter((r) => allowed.includes(r.value));
});

const repo = ref();

watch(
  () => reportes.value,
  (newList) => {
    if (repo.value && !newList.some((r) => r.value === repo.value)) {
      repo.value = null;
    }
  },
);
</script>

<template>
  <v-container>
    <!-- Tarjeta Principal con Título, Filtros de Liquidación y Selector de Reporte -->
    <v-card class="elevation-1 border mb-4" rounded="lg">
      <v-card-title class="d-flex align-center py-3 px-4 bg-primary text-white">
        <v-icon icon="mdi-file-chart-outline" class="me-2"></v-icon>
        <span class="text-h6 font-weight-bold">Planillas y Reportes</span>
      </v-card-title>

      <!-- Panel de Filtros de Período y Liquidación -->
      <v-card-text class="pt-3 pb-1">
        <LiqInputPanel />
      </v-card-text>

      <!-- Barra de Selección de Reporte -->
      <div class="px-4 py-3 bg-grey-lighten-4 border-t">
        <v-row align="center" dense>
          <v-col cols="12" sm="8" md="7">
            <v-select
              v-model="repo"
              label="Seleccione el Reporte o Planilla"
              placeholder="Elija una opción para consultar..."
              :items="reportes"
              item-title="title"
              item-value="value"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              prepend-inner-icon="mdi-file-document-outline"
            />
          </v-col>
          <v-col cols="12" sm="4" md="5" class="d-flex align-center justify-sm-end mt-2 mt-sm-0">
            <v-switch
              v-model="showAllReports"
              color="primary"
              density="compact"
              hide-details
              label="Mostrar todos los reportes"
            />
          </v-col>
        </v-row>
      </div>
    </v-card>

    <!-- Contenido del Reporte Seleccionado -->
    <v-card v-if="repo" class="elevation-1 border" rounded="lg">
      <v-card-text class="pa-4">
        <RepoResumenLiq v-if="repo == 1" />
        <RepoCod153 v-if="repo == 2" />
        <RepoResumenCod v-if="repo == 4" />
        <RepoResumenLiqFDO v-if="repo == 5" />
        <RepoApoPatronales v-if="repo == 6" />
        <RepoPlanillaDetLiq v-if="repo == 7" />
        <RepoPlanillaRet v-if="repo == 8" />
        <RepoPlanillaLey v-if="repo == 9" />
        <RepoPlanillaResSueldo v-if="repo == 10" />
        <RepoPlanillaRetencionesCPA v-if="repo == 11" />
        <RepoPlanillaRetCargo v-if="repo == 12" />
        <RepoBajasLey v-if="repo == 13" />
        <RepoPlanillaResSueldoComp v-if="repo == 14" />
        <RepoPlanillaResumenCargos v-if="repo == 15" />
      </v-card-text>
    </v-card>

    <!-- Estado vacío cuando no hay reporte seleccionado -->
    <v-card v-else class="elevation-0 border rounded-lg text-center py-10 bg-grey-lighten-5">
      <v-icon icon="mdi-file-chart-outline" size="56" color="grey-lighten-1" class="mb-3" />
      <div class="text-subtitle-1 font-weight-medium text-medium-emphasis">
        No hay ningún reporte seleccionado
      </div>
      <div class="text-caption text-disabled mt-1">
        Seleccione un reporte del menú desplegable superior para visualizar sus datos y exportarlos a Excel.
      </div>
    </v-card>
  </v-container>
</template>
