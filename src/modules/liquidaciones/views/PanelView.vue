<script setup>
import { LiqInputPanel } from "@/shared/components";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useFilterStore } from "@/stores/filterStore.js";
import LiquidacionTable from "../components/LiquidacionTable.vue";
import LiquidacionItemTable from "../components/LiquidacionItemTable.vue";

const router = useRouter();
const store = useFilterStore();

const dialog = ref(false);
const text = ref("");
const idliqitem = ref(null);

function handleSelect(id, objElement) {
  idliqitem.value = id;
  text.value =
    "Orden:" +
    objElement.orden +
    " DNI:" +
    objElement.dni +
    " Nombre:" +
    objElement.apellido +
    " " +
    objElement.nombre;
}
</script>

<template>
  <v-container>
    <v-row class="bg-primary pa-3 rounded mb-3" align="center" justify="space-between">
      <v-col cols="12" sm="6" class="py-1">
        <h3 class="d-flex align-center font-weight-bold text-white mb-0">
          <v-icon icon="mdi-view-dashboard" class="me-2"></v-icon>
          Panel Principal
        </h3>
      </v-col>
      <v-col cols="12" sm="6" class="py-1 text-sm-end d-flex justify-sm-end ga-2 flex-wrap">
        <v-btn
          size="small"
          color="white"
          variant="elevated"
          class="text-primary font-weight-bold"
          prepend-icon="mdi-format-list-checks"
          @click="router.push('/conceptos')"
        >
          Conceptos
          <v-chip size="x-small" color="primary" variant="flat" class="ms-1 font-weight-bold">
            NUEVO
          </v-chip>
        </v-btn>
        <v-btn
          size="small"
          color="white"
          variant="tonal"
          prepend-icon="mdi-cogs"
          @click="router.push('/operaciones')"
        >
          Operaciones
          <v-chip size="x-small" color="white" text-color="primary" variant="flat" class="ms-1 font-weight-bold">
            NUEVO
          </v-chip>
        </v-btn>
      </v-col>
    </v-row>
    <v-row>
      <LiqInputPanel></LiqInputPanel>
    </v-row>

    <v-dialog v-model="dialog" width="auto">
      <v-card>
        <v-card-text>
          No existen datos para el filtro seleccionado.
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" block @click="dialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-row>
      <v-col class="px-0">
        <LiquidacionTable
          title="Liquidaciones"
          :subtitle="store.liqString"
          @select="handleSelect"
        ></LiquidacionTable>
      </v-col>
      <v-col class="px-0">
        <LiquidacionItemTable v-if="idliqitem" :id="idliqitem" :subtitle="text">
        </LiquidacionItemTable>
      </v-col>
    </v-row>
  </v-container>
</template>
