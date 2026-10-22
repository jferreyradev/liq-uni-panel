# Ficha 05: Novedades y Agentes

## 1. Resumen
Administración de legajos de empleados municipales (personas, cargas familiares, cargos y conceptos asignados) y gestión mensual de novedades mediante hojas masivas con grillas editables.

---

## 2. Archivos Involucrados

### A. Módulo Agentes y Cargos:
- [`src/modules/agentes/views/AgentesView.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/agentes/views/AgentesView.vue): Vista de búsqueda y gestión de agentes.
- [`src/modules/agentes/views/CargosView.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/agentes/views/CargosView.vue): Vista de cargos y conceptos asignados.
- [`src/modules/agentes/components/PersonasList.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/agentes/components/PersonasList.vue): Listado y edición de datos personales.
- [`src/modules/agentes/components/CargaFamiliarList.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/agentes/components/CargaFamiliarList.vue): Familiares a cargo (asignaciones).
- [`src/modules/agentes/components/CargosList.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/agentes/components/CargosList.vue): Asignación de cargos por escalafón.
- [`src/modules/agentes/components/PersonasListFilter.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/agentes/components/PersonasListFilter.vue) / `CargosListFilter.vue`: Filtros de búsqueda; arman el query string con `buildQuery` y persisten en el store.
- [`src/stores/agentesFilterStore.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/stores/agentesFilterStore.js): Estado de los filtros de personas y cargos (sobrevive a la navegación entre rutas).

### B. Módulo Hojas y Novedades:
- [`src/modules/novedades/views/HojasView.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/novedades/views/HojasView.vue): Vista principal de hojas de novedades.
- [`src/modules/novedades/components/HojasList.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/novedades/components/HojasList.vue): Selector de hoja del período.
- [`src/modules/novedades/components/NovAltasList.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/novedades/components/NovAltasList.vue): Novedades de altas y designaciones.
- [`src/modules/novedades/components/NovHaberesList.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/novedades/components/NovHaberesList.vue): Haberes variables (horas extras, adicionales).
- [`src/modules/novedades/components/NovVariasList.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/novedades/components/NovVariasList.vue): Descuentos y novedades varias.

---

## 3. Endpoints Principales
El módulo sigue el contrato general: **consultas con vistas (`view/*`), escrituras con SPs (`sp/*`)**. No se usan entidades `/en` ni escrituras REST por entidad (lo verifica el guard arquitectónico).

### Consultas
- **Personas**: `view/personaLista?{filtro}` (parámetros `DNI`, `Apellido`, `Nombre`).
- **Cargos de agente**: `view/cargo?PersonaId=...`. El listado general y la carga familiar todavía usan `en/cargo` (deuda de la Tanda B: falta soportar `Salario=1` y las columnas ricas de la grilla).
- **Cargas familiares**: `en/cargaFamiliar?PersonaId=...` (pendiente: `view/cargaFamiliar`).
- **Conceptos del cargo**: `en/conceptoLiq?CargoId=...` (pendiente: `view/conceptoLiq`).
- **Novedades de la hoja**: `view/novAltas?HojaId=...`, `view/novHaberes?HojaId=...`, `view/novVarias?HojaId=...`.

### Escrituras (SPs)
- **Personas**: `sp/persUpd`.
- **Cargos**: `sp/CargoUpd`.
- **Cargas familiares**: `sp/CargaFamIns`, `sp/CargaFamUpd`, `sp/CargaFamDel`, `sp/AsignaSalario`.
- **Conceptos de liquidación**: `sp/ConceptoLiqIns`, `sp/ConceptoLiqUpd`, `sp/ConceptoLiqDel`.
- **Haberes variables**: `sp/NovHaberesIns`, `sp/NovHaberesUpd`, `sp/NovHaberesDel` (la baja envía `{ vIDNOVHABER: id }`).
- **Altas y varias**: `sp/NovAltasIns/Upd/Del` y `sp/NovVariasIns/Upd/Del`.

---

## 4. Recetas de Modificación

### A. Para modificar campos de edición en la grilla de novedades:
Abrir el componente de novedad correspondiente (`NovHaberesList.vue`, `NovVariasList.vue`, `NovAltasList.vue`).
- La lectura de la grilla va por `view/*` y el guardado por `sp/*`, a través de la fachada de dominio (`ejecutarSP` / `useSpGrabar` de `@/shared/services/apiService`), nunca con `fetch()` directo ni por un endpoint REST de entidad.
- `NovHaberesList.vue` usa `useSpGrabar` para alta, modificación y baja (`sp/NovHaberesIns/Upd/Del`). La baja existía en el template pero no tenía función asociada: quedó resuelta con el SP de borrado.

### B. Para ajustar validaciones de DNI o Cuil:
Las funciones de formato se encuentran centralizadas en [`src/utils/formatos.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/utils/formatos.js) (`formatoDNI`, `formatoPeriodo`, `financial`).

---

## 5. Pruebas Unitarias Asociadas
```bash
# Módulo de agentes (vistas, filtros, composables y store)
npx vitest run src/modules/agentes src/stores/__tests__/agentesFilterStore.spec.js

# Patrones transversales reutilizables
npx vitest run src/utils/__tests__/query.spec.js src/utils/__tests__/spRespuesta.spec.js
npx vitest run src/composables/__tests__/useDataTable.spec.js src/composables/__tests__/useSpGrabar.spec.js
```
