<script setup>
import { computed } from "vue";
import { useFetch } from "@/composables/useFetch";
import { useEndPoints } from "@/composables/useEndPoints";

const { apiBase } = useEndPoints();

const props = defineProps(["id", "subtitle"]);

function useLiqItem(getId) {
  return useFetch(
    () => `${apiBase.value}/api/view/liqItem?LiquidacionId=${getId()}`,
  );
}

const { data, error, isPending } = useLiqItem(() => props.id);

const liqHeaders = [
  { title: "Codigo.", key: "CODIGO" },
  { title: "Descripcion", key: "DESCRIPCION" },
  { title: "Cant", key: "CANTIDAD" },
  { title: "VTO", key: "VENCIMIENTO" },
  { title: "Importe", key: "IMPORTETICKET" },
];

const sortedItems = computed(() => {
  if (!data.value || !Array.isArray(data.value)) return [];
  return [...data.value].sort((a, b) => {
    const codA = (Number(a.CODIGO) || 0) * 1000 + (Number(a.SUBCODIGO) || 0);
    const codB = (Number(b.CODIGO) || 0) * 1000 + (Number(b.SUBCODIGO) || 0);
    return codA - codB;
  });
});

function getNumberFormat(n) {
  return Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(n);
}

const res = computed(() => {
  let hcap = 0,
    hsap = 0,
    ticket = 0,
    desc = 0,
    descley = 0,
    asigfam = 0,
    patronales = 0;
  if (!data.value || !Array.isArray(data.value)) {
    return { hcap, hsap, ticket, descley, desc, asigfam };
  }
  data.value.forEach((el) => {
    const imp = Number(el.IMPORTETICKET) || 0;
    switch (el.TIPOCONCEPTOID) {
      case 1:
        hcap = hcap + imp;
        break;
      case 2:
        hsap = hsap + imp;
        break;
      case 3:
        descley = descley + imp;
        break;
      case 4:
        asigfam = asigfam + imp;
        break;
      case 5:
        patronales = patronales + imp;
        break;
      case 7:
        ticket = ticket + imp;
        break;
      case 6:
        desc = desc + imp;
        break;
      default:
        break;
    }
  });

  return { hcap, hsap, ticket, descley, desc, asigfam };
});
</script>

<template>
  <v-container>
    <div v-if="isPending">loading...</div>
    <v-card
      v-else-if="data"
      flat
      title="Detalle de la liquidacion"
      :subtitle="props.subtitle"
      class="bg-blue-accent-1"
    >
      <v-table
        class="compact text-caption pa-0 ma-0 w-auto"
        hover
        density="compact"
      >
        <thead>
          <tr>
            <th
              v-for="header in liqHeaders"
              :key="header.key"
              class="text-left m-0"
            >
              {{ header.title }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in sortedItems"
            v-show="item.TIPOCONCEPTOID !== 5"
            :key="item.id"
            :class="{
              'bg-orange-lighten-3': item.TIPOCONCEPTOID === 6,
              'bg-orange-lighten-4': item.TIPOCONCEPTOID === 3,
              'bg-orange-lighten-5': item.TIPOCONCEPTOID === 4,
              'bg-blue-lighten-5': item.TIPOCONCEPTOID === 1,
              'bg-blue-lighten-3': item.TIPOCONCEPTOID === 7,
            }"
          >
            <td class="text-right m-0 p-0">
              {{ item.CODIGO * 1000 + item.SUBCODIGO }}
            </td>
            <td class="text-left m-0 p-0">{{ item.DESCRIPCION }}</td>
            <td class="text-right m-0 p-0">{{ item.CANTIDAD }}</td>
            <td class="text-center m-0 p-0">{{ item.VENCIMIENTO }}</td>
            <td class="text-right m-0 p-0">
              {{ Number(item.IMPORTETICKET || 0).toFixed(2) }}
            </td>
          </tr>
        </tbody>
        <tfoot class="font-weight-bold">
          <tr>
            <td>Haberes</td>
            <td>Descuentos</td>
            <td>Total</td>
          </tr>
          <tr>
            <td>
              {{
                getNumberFormat(res.hcap + res.hsap + res.asigfam + res.ticket)
              }}
            </td>
            <td>
              {{ getNumberFormat(res.desc + res.descley) }}
            </td>
            <td>
              {{
                getNumberFormat(
                  res.hcap +
                    res.hsap +
                    res.asigfam +
                    res.ticket -
                    res.desc -
                    res.descley,
                )
              }}
            </td>
          </tr>
        </tfoot>
      </v-table>
    </v-card>
    <div v-else-if="error">No se puede obtener los datos solicitados.</div>
  </v-container>
</template>

<style scoped></style>
