export const usuariosRoutes = [
  {
    path: "/users",
    name: "users",
    component: () => import("./views/UsersPanelView.vue"),
  },
];
