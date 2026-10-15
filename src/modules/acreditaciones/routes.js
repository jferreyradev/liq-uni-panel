export const acreditacionesRoutes = [
  {
    path: "/acredit",
    name: "acredit",
    component: () => import("./views/AcreditacionView.vue"),
  },
  {
    path: "/acred",
    redirect: "/acredit",
  },
];
