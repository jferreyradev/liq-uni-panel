export const agentesRoutes = [
  {
    path: "/agentes",
    name: "agentes",
    component: () => import("./views/AgentesView.vue"),
  },
  {
    path: "/cargos",
    name: "cargos",
    component: () => import("./views/CargosView.vue"),
  },
];
