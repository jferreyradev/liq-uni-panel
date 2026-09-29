# Ficha 02: Reportes y Planillas Oficiales

## 1. Resumen
Visualización y exportación a Excel (.xlsx) de los 14 reportes oficiales de liquidación, con catálogo reactivo según el municipio seleccionado y switch para mostrar todos.

---

## 2. Archivos Involucrados
- [`src/views/RepoView.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/views/RepoView.vue): Vista principal, selector desplegable reactivo y switch `showAllReports`.
- `src/components/Repo*.vue`: 14 componentes individuales (uno por cada reporte).
- [`src/components/RepoHeader.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/RepoHeader.vue): Encabezado unificado con títulos y botón de descarga.
- [`src/utils/reportes.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/utils/reportes.js): Helpers para exportación a Excel con estilos (`agregaTitulosExcel`).
- [`REPORTES.md`](file:///Users/jferreyradev/projects/ag/liq-panel/REPORTES.md): Catálogo y matriz completa de compatibilidad.

---

## 3. Mapeo de Componentes y Endpoints

| Valor | Reporte | Componente | Endpoint Backend |
| :-: | :--- | :--- | :--- |
| **1** | Resumen Liquidacion | `RepoResumenLiq.vue` | `/api/repo/resumenLiq` |
| **2** | Detalle por concepto (153) | `RepoCod153.vue` | `/api/view/resumenCodigo?Codigo=153` |
| **4** | Resumen de liquidación por códigos | `RepoResumenCod.vue` | `/api/view/resumenCodLiq` |
| **5** | Resumen pedido FDO | `RepoResumenLiqFdo.vue` | `/api/view/resumenFdo` |
| **6** | Resumen Aportes Patronales | `RepoApoPatronales.vue` | `/api/view/aportesPat` |
| **7** | Planilla de Det. Liq. | `RepoPlanillaDetLiq.vue` | `/api/view/planillaDetLiq` |
| **8** | Planilla de Retenciones | `RepoPlanillaRet.vue` | `/api/view/planillaRet` |
| **9** | Planilla de Ley | `RepoPlanillaLey.vue` | `/api/view/planillaLey` |
| **10** | Resumen de Sueldos | `RepoPlanillaResSueldo.vue` | `/api/view/resumenSueldos` |
| **11** | Retenciones de CPA | `RepoPlanillaRetencionesCPA.vue` | `/api/view/planillaRetCPA` |
| **12** | Retenciones de Cargo | `RepoPlanillaRetCargo.vue` | `/api/view/retencionesCargo` |
| **13** | Bajas de Ley | `RepoBajasLey.vue` | `/api/view/bajasLey` |
| **14** | Res. de Sue. - Inas. - Ley | `RepoPlanillaResSueldoComp.vue` | `/api/view/resumenSueldosComp` |
| **15** | Resumen cargos | `RepoPlanillaResumenCargos.vue` | `/api/view/resumenCargos` |

---

## 4. Recetas de Modificación

### A. Para habilitar o quitar un reporte en un municipio:
Editar la propiedad `allowedReports` en [`src/config/tenants.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/config/tenants.js):
```javascript
// Ejemplo: agregar reporte 1 a Concepción
{
  id: 'concepcion',
  allowedReports: [1, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
}
```

### B. Para modificar columnas o diseño de un reporte existente:
Abrir el archivo específico `src/components/Repo<Nombre>.vue`:
- `headers`: Array que define las columnas de `<v-data-table>`.
- `exportFile()`: Mapeo de datos que se escribe en el archivo `.xlsx`.

### C. Para agregar un nuevo reporte:
1. Crear `src/components/RepoNuevo.vue` con `useFetch` y `exportFile()`.
2. Registrarlo en `ALL_REPORTES` dentro de [`src/views/RepoView.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/views/RepoView.vue).
3. Añadir el componente en el template: `<RepoNuevo v-if="repo === <nuevoId>" />`.
4. Añadir el `<nuevoId>` en los `allowedReports` de los municipios que corresponda en `tenants.js`.

---

## 5. Pruebas Unitarias Asociadas
```bash
npx vitest run src/views/__tests__/RepoView.spec.js
npx vitest run src/components/__tests__/ReportesEndpoints.spec.js
```
