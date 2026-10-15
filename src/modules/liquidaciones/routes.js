export const liquidacionesRoutes = [
  {
    path: "/panel",
    name: "panel",
    component: () => import("./views/PanelView.vue"),
  },
  {
    path: "/procesos",
    name: "procesos",
    component: () => import("./views/ProcesosView.vue"),
  },
  {
    path: "/boletas",
    name: "boletas",
    component: () => import("./views/BoletasView.vue"),
  },
];
