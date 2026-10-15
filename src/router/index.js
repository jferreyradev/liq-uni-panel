import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import { useUserStore } from "@/stores/userStore";

import { authRoutes } from "@/modules/auth/routes";
import { usuariosRoutes } from "@/modules/usuarios/routes";
import { agentesRoutes } from "@/modules/agentes/routes";
import { novedadesRoutes } from "@/modules/novedades/routes";
import { liquidacionesRoutes } from "@/modules/liquidaciones/routes";
import { previsionalRoutes } from "@/modules/previsional/routes";
import { ipsstRoutes } from "@/modules/ipsst/routes";
import { reportesRoutes } from "@/modules/reportes/routes";
import { acreditacionesRoutes } from "@/modules/acreditaciones/routes";

const baseRoutes = [
  {
    path: "/",
    name: "home",
    component: HomeView,
  },
  {
    path: "/about",
    name: "about",
    component: () => import("../views/AboutView.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...baseRoutes,
    ...authRoutes,
    ...usuariosRoutes,
    ...agentesRoutes,
    ...novedadesRoutes,
    ...liquidacionesRoutes,
    ...previsionalRoutes,
    ...ipsstRoutes,
    ...reportesRoutes,
    ...acreditacionesRoutes,
  ],
});

router.beforeEach((to, from, next) => {
  const store = useUserStore();
  const publicPages = ["/login"];
  const authRequired = !publicPages.includes(to.path);

  if (authRequired && !store.auth) {
    return next("/login");
  }
  next();
});

export default router;
