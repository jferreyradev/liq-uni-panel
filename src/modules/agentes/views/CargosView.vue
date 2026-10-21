<script setup>
import { ref } from "vue";
import CargosList from "../components/CargosList.vue";

const titulo = ref("Listado de Cargos");
</script>

<template>
  <v-container>
    <v-row justify="space-around" class="bg-primary">
      <h3>{{ titulo }}</h3>
    </v-row>
    <v-row>
      <CargosList></CargosList>
    </v-row>
  </v-container>
</template>
