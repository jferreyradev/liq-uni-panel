# Ficha 01: Multi-Tenant y Configuración de Endpoints

## 1. Resumen
Gestiona la identidad del municipio activo, las cabeceras HTTP (`x-project-key`, `x-project-port`), los logotipos para la UI y boletas, y la alternancia de servidores `Prod` / `Desa`.

---

## 2. Archivos Involucrados
- [`src/config/tenants.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/config/tenants.js): Catálogo maestro de municipios, claves, puertos y endpoints.
- [`src/stores/tenantStore.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/stores/tenantStore.js): Store Pinia reactivo persistido en `localStorage` (`liq_tenant_id`).
- [`src/components/TenantSelector.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/TenantSelector.vue): Menú desplegable en el Navbar.
- [`src/composables/useEndPoints.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/composables/useEndPoints.js): Generador reactivo de URLs y headers.
- [`src/composables/useApiClient.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/composables/useApiClient.js): Cliente HTTP Axios/Fetch genérico con inyección de headers.

---

## 3. Parámetros Actuales por Municipio

| ID | Nombre | projectKey | projectPort | Tema Color | allowedReports |
| :--- | :--- | :--- | :---: | :---: | :--- |
| `concepcion` | Mun. de Concepción | `concecpcion` | `3007` | `#1976D2` | `[4, 6..15]` |
| `burruyacu` | Mun. de Burruyacú | `Burru` | `3003` | `#2E7D32` | `[4, 6..15]` |
| `tafiviejo` | Mun. de Tafí Viejo | `tafiviejo` | `3007` | `#00838F` | `[4, 6..15]` |
| `trancas` | Mun. de Trancas | `ServerTrancas` | `3005` | `#6A1B9A` | `[1, 2, 4, 5]` |

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

## 5. Pruebas Unitarias Asociadas
```bash
npx vitest run src/stores/__tests__/tenantStore.spec.js
```
