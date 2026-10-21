export const agentesRoutes = [
  {
    path: "/agentes",
    name: "agentes",
    component: () => import("./views/AgentesView.vue"),
  },
  {
    // La carga familiar de una persona es una pantalla propia: la URL la
    // describe y se puede compartir o recargar sin perder el contexto.
    path: "/agentes/cargaf/:personaId",
    name: "agentes-cargaf",
    component: () => import("./views/AgentesView.vue"),
  },
  {
    path: "/cargos",
    name: "cargos",
    component: () => import("./views/CargosView.vue"),
  },
];
