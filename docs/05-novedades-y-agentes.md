# Ficha 05: Novedades y Agentes

## 1. Resumen
Administración de legajos de empleados municipales (personas, cargas familiares, cargos y conceptos asignados) y gestión mensual de novedades mediante hojas masivas con grillas editables.

---

## 2. Archivos Involucrados

### A. Módulo Agentes y Cargos:
- [`src/views/AgentesView.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/views/AgentesView.vue): Vista de búsqueda y gestión de agentes.
- [`src/views/CargosView.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/views/CargosView.vue): Vista de cargos y conceptos asignados.
- [`src/components/Agentes/PersonasList.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/Agentes/PersonasList.vue): Listado y edición de datos personales.
- [`src/components/Agentes/CargaFamiliarList.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/Agentes/CargaFamiliarList.vue): Familiares a cargo (asignaciones).
- [`src/components/Agentes/CargosList.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/Agentes/CargosList.vue): Asignación de cargos por escalafón.

### B. Módulo Hojas y Novedades:
- [`src/views/HojasView.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/views/HojasView.vue): Vista principal de hojas de novedades.
- [`src/components/Novedades/HojasList.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/Novedades/HojasList.vue): Selector de hoja del período.
- [`src/components/Novedades/NovAltasList.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/Novedades/NovAltasList.vue): Novedades de altas y designaciones.
- [`src/components/Novedades/NovHaberesList.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/Novedades/NovHaberesList.vue): Haberes variables (horas extras, adicionales).
- [`src/components/Novedades/NovVariasList.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/Novedades/NovVariasList.vue): Descuentos y novedades varias.
- [`src/components/Novedades/TablaEditable.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/Novedades/TablaEditable.vue): Grilla en línea para edición rápida.

---

## 3. Endpoints Principales
- **Agentes**: `${apiBase}/api/agentes?${filtro}`
- **Cargas familiares**: `${apiBase}/api/cargasFamiliares?IdPersona=${id}`
- **Cargos de agente**: `${apiBase}/api/cargos?IdPersona=${id}`
- **Hojas de novedades**: `${apiBase}/api/hojas?${filterString}`
- **Novedades de la hoja**: `${apiBase}/api/novedades?IdHoja=${idHoja}`

---

## 4. Recetas de Modificación

### A. Para modificar campos de edición en la grilla de novedades:
Abrir [`src/components/Novedades/TablaEditable.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/Novedades/TablaEditable.vue) o el componente de novedad correspondiente (`NovHaberesList.vue`, `NovVariasList.vue`).
- Cada fila emite `save` o `update` mediante el cliente HTTP de `llamadaAPI.js`.

### B. Para ajustar validaciones de DNI o Cuil:
Las funciones de formato se encuentran centralizadas en [`src/utils/formatos.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/utils/formatos.js) (`formatoDNI`, `formatoPeriodo`, `financial`).

---

## 5. Pruebas Unitarias Asociadas
```bash
npx vitest run src/utils/__tests__/formatos.spec.js
```
