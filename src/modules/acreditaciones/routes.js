export const acreditacionesRoutes = [
  {
    path: "/acredit",
    name: "acredit",
    component: () => import("./views/AcreditacionView.vue"),
  },
  {
    path: "/acred",
    name: "acreditaciones",
    component: () => import("./views/AcreditacionView.vue"),
  },
];
