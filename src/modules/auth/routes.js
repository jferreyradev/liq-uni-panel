export const authRoutes = [
  {
    path: "/login",
    name: "login",
    component: () => import("./views/LoginView.vue"),
  },
  {
    path: "/passchange",
    name: "passchange",
    component: () => import("./views/ChangePassword.vue"),
  },
];
