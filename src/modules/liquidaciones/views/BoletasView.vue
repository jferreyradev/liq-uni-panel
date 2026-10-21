<script setup>
import LiqBoletas from "../components/LiqBoletas.vue";
import { LiqInputPanel } from "@/shared/components";
</script>

<template>
  <v-container>
    <v-row justify="space-around" class="bg-primary">
      <h3>Boletas</h3>
    </v-row>
    <v-row>
      <LiqInputPanel></LiqInputPanel>
    </v-row>
    <v-row>
      <LiqBoletas></LiqBoletas>
    </v-row>
  </v-container>
</template>
