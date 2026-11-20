export const conceptosRoutes = [
  {
    path: "/conceptos",
    alias: "/conceptos-cargo",
    name: "conceptosCargo",
    component: () => import("./views/ConceptosCargoView.vue"),
  },
];
