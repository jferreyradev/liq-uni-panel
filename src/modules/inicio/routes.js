/**
 * Rutas del módulo de inicio (portada y página "about").
 *
 * Son vistas de nivel aplicación: no pertenecen a un dominio de negocio, pero
 * siguen la misma convención que el resto de los módulos (rutas declaradas acá,
 * agregadas por `src/router/index.js`).
 */
export const inicioRoutes = [
  {
    path: "/",
    name: "home",
    component: () => import("./views/HomeView.vue"),
  },
  {
    path: "/about",
    name: "about",
    component: () => import("./views/AboutView.vue"),
  },
];
