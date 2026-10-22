# Ficha 01: Multi-Tenant y Configuración de Endpoints

## 1. Resumen
Gestiona la identidad del municipio activo, las cabeceras HTTP (`x-project-key`, `x-project-port`), los logotipos para la UI y boletas, y la alternancia de servidores `Prod` / `Desa`.

---

## 2. Archivos Involucrados
- [`src/config/tenants.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/config/tenants.js): Catálogo maestro de municipios, claves, puertos y endpoints.
- [`src/stores/tenantStore.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/stores/tenantStore.js): Store Pinia reactivo persistido en `localStorage` (`liq_tenant_id`).
- [`src/shared/components/TenantSelector.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/shared/components/TenantSelector.vue): Menú desplegable en el Navbar.
- [`src/composables/useEndPoints.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/composables/useEndPoints.js): Generador reactivo de URLs y headers.
- [`src/shared/services/httpClient.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/shared/services/httpClient.js): Cliente HTTP único del proyecto, con inyección de headers.
- [`src/shared/services/apiService.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/shared/services/apiService.js): Fachada de dominio sobre el cliente.

---

## 3. Parámetros Actuales por Municipio

| ID | Nombre | projectKey | projectPort | Tema Color | allowedReports |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `concepcion` | Mun. de Concepción | `concecpcion` | `3007` | `#1976D2` | `[4, 6..15]` |
| `burruyacu` | Mun. de Burruyacú | `Burru` | `3003` | `#2E7D32` | `[4, 6..15]` |
| `tafiviejo` | Mun. de Tafí Viejo | `tafiviejo` | `3007` | `#00838F` | `[4, 6..15]` |
| `trancas` | Mun. de Trancas | `ServerTrancas` | `3005` | `#6A1B9A` | `[1, 2, 4, 5]` |
| `desarrollo` | Desarrollo (Pruebas) | `desarrollo` | `3005` | `#7C4DFF` | `[1..15]` |

---

## 4. Recetas de Modificación

### A. Para cambiar el puerto o clave de un municipio:
Editar en [`src/config/tenants.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/config/tenants.js):
```javascript
{
  id: 'trancas',
  projectKey: 'ServerTrancas', // <-- cambiar aquí
  projectPort: '3005',         // <-- cambiar aquí
  // ...
}
```

### B. Para cambiar las URLs de backend (Prod / Desa):
Editar `DEFAULT_ENDPOINTS` en [`src/config/tenants.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/config/tenants.js):
```javascript
export const DEFAULT_ENDPOINTS = {
  desa: { boletas: '...', base: '...', sp: '...' },
  prod: { boletas: '...', base: '...', sp: '...' }
}
```

### C. Para agregar un nuevo municipio:
1. Colocar el logo en `src/assets/tenants/<nombre>.png`.
2. Agregar el objeto en el array `TENANTS` de [`src/config/tenants.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/config/tenants.js).
3. Automáticamente aparecerá en el selector del Navbar, usará sus puertos y filtrará sus reportes permitidos.

---

## 5. Conmutador de Entorno (Prod / Desa) y Encabezados Dinámicos

El entorno se gestiona de manera reactiva y persistente en [`src/composables/useEndPoints.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/composables/useEndPoints.js):
- **Clave de persistencia:** `localStorage.getItem('liq_env')` (`'prod'` o `'desa'`).
- **Estado reactivo:** `isDesa`, `isProd`, `toggleEnv()`, `setEnv(env)`.
- **Encabezados HTTP automáticos según ambiente:**
  - En **Producción (`Prod`)**: Se inyectan las credenciales del municipio activo seleccionado en el Navbar:
    `{ "x-project-key": tenant.projectKey, "x-project-port": tenant.projectPort }`
  - En **Desarrollo (`Desa`)**: Se inyectan automáticamente los encabezados globales de desarrollo:
    `{ "Content-Type": "application/json", "x-project-key": "desarrollo", "x-project-port": "3005" }`
    *(Permitiendo además personalización manual desde la consola de diagnóstico si se requiere apuntar a otro puerto o clave de pruebas).*
- **Puntos de acceso en la interfaz:**
  1. **Navbar:** Botón conmutador con color diferenciado (ámbar para Desa, tonal para Prod).
  2. **LoginView:** Chip selector con botón de cambio y alerta informativa cuando está en modo Desarrollo.
  3. **TenantSelector:** Pie del menú desplegable con el estado y botón de alternancia.

---

## 6. Seguridad y Cierre de Sesión Automático

Para evitar cruces de credenciales o tokens inválidos entre distintas bases de datos:
1. **Cambio de Municipio:** Al seleccionar un nuevo municipio en `TenantSelector.vue`, se ejecuta `userStore.$reset()` y se redirige automáticamente a `/login`.
2. **Cambio de Entorno (Prod / Desa):** Al cambiar de entorno mientras el usuario está autenticado, la sesión se reinicia (`userStore.$reset()`) y se redirige al login.

---

## 7. Diagnóstico, Logs y Personalización de Endpoints

El sistema incluye un módulo de observabilidad y diagnóstico integral:
- **Store de Logs ([`src/stores/logStore.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/stores/logStore.js)):**
  - Intercepta todas las llamadas HTTP del sistema: el cliente único (`httpClient.js`) y el store de sesión (`userStore`) reportan al `logStore`.
  - Emite logs agrupados en consola (`console.group`) con URL, método, headers `x-project-key` / `x-project-port`, status y payload.
  - Guarda un historial de las últimas 100 peticiones en memoria.
- **Consola Visual ([`src/shared/components/DiagnosticDialog.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/shared/components/DiagnosticDialog.vue)):**
  - Accesible desde el Navbar (`mdi-bug-outline`) y desde la pantalla de login.
  - **Pestaña de Logs:** Filtro por errores, detalle técnico expandible y exportación al portapapeles.
  - **Pestaña de Endpoints:** Permite configurar URLs personalizadas de Desarrollo (persistidas en `localStorage`: `liq_desa_base`, `liq_desa_boletas`, `liq_desa_sp`) con presets rápidos (*Proxy Deno*, *Localhost:3005*, *Localhost:8000*).
  - **Herramienta Ping:** Prueba de conectividad inmediata con medición de latencia.

---

## 8. Pruebas Unitarias Asociadas
```bash
# Tests de Store, persistencia de tenant y entorno
npx vitest run src/stores/__tests__/tenantStore.spec.js

# Tests del componente TenantSelector y cierre de sesión
npx vitest run src/shared/components/__tests__/TenantSelector.spec.js

# Tests de LogStore y overrides de endpoints
npx vitest run src/stores/__tests__/logStore.spec.js
```


