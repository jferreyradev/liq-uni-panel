export const liquidacionesRoutes = [
  {
    path: "/panel",
    name: "panel",
    component: () => import("./views/PanelView.vue"),
  },
  {
    path: "/procesos",
    redirect: "/operaciones",
  },
  {
    path: "/boletas",
    name: "boletas",
    component: () => import("./views/BoletasView.vue"),
  },
];
