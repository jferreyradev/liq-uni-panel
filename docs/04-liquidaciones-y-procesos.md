# Ficha 04: Liquidaciones y Procesos

## 1. Resumen
Control central del ciclo de liquidación de haberes: selección de período, tipo de liquidación y adicional, consulta de totales por agente/repartición, desglose analítico de conceptos liquidados, y panel de ejecución de procesos batch (SPs de liquidación y cierres).

---

## 2. Archivos Involucrados
- [`src/modules/liquidaciones/views/PanelView.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/liquidaciones/views/PanelView.vue): Vista principal de control de liquidación.
- [`src/modules/liquidaciones/views/ProcesosView.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/liquidaciones/views/ProcesosView.vue): Vista de procesos batch y cierres mensuales.
- [`src/modules/liquidaciones/components/PanelCtrlLiq.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/liquidaciones/components/PanelCtrlLiq.vue): Barra de filtros (Período, Tipo Liq, Adicional, Repartición) con selector de estado.
- [`src/modules/liquidaciones/components/LiquidacionTable.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/liquidaciones/components/LiquidacionTable.vue): Tabla resumen de agentes liquidados (bruto, descuentos, neto).
- [`src/modules/liquidaciones/components/LiquidacionItemTable.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/liquidaciones/components/LiquidacionItemTable.vue): Desglose renglón por renglón de conceptos de un agente seleccionado.
- [`src/modules/liquidaciones/components/ProcesosList.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/liquidaciones/components/ProcesosList.vue): Lista de stored procedures y tareas ejecutables.
- [`src/composables/useSpGrabar.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/composables/useSpGrabar.js): Escritura contra Stored Procedures con interpretación centralizada del resultado (`ejecutarSP`).
- [`src/shared/services/apiService.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/shared/services/apiService.js): Fachada de dominio (`leerDatos`, `ejecutarSP`) usada por el módulo.
- [`src/stores/filterStore.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/stores/filterStore.js): Store global de los filtros de período/tipo/adicional.

---

## 3. Endpoints Principales
- **Listado de liquidaciones**: `${apiBase}/api/view/liquidacion?${filterString}`
- **Detalle de ítems de un agente**: `${apiBase}/api/view/liquidacionItem?${filterString}&IdPersona=${idPersona}`
- **Ejecución de procesos / SP**: `${apiSp}/api/sp/ejecutar` (POST)
- **Headers**: Requiere `buildApiHeaders()` (`x-project-key`, `x-project-port`).

---

## 4. Recetas de Modificación

### A. Para modificar las columnas de la tabla de liquidación:
Editar `headers` en [`src/modules/liquidaciones/components/LiquidacionTable.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/liquidaciones/components/LiquidacionTable.vue):
- `IDREP`: Repartición
- `ORDEN`: Orden del agente
- `PERSONADOCUMENTO`: DNI
- `PERSONAAPELLIDO`, `PERSONANOMBRE`
- `TOTALBRUTO`: Salario bruto
- `TOTALDESCUENTOS`: Suma de retenciones
- `TOTALNETO`: Salario neto a cobrar

### B. Para añadir o cambiar un Stored Procedure ejecutable:
1. Abrir [`src/modules/liquidaciones/components/ProcesosList.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/liquidaciones/components/ProcesosList.vue).
2. Localizar el array de procesos y agregar la definición del SP con sus parámetros (período, tipo, etc.).
3. Las llamadas usan `ejecutarSP` de `@/shared/services/apiService` (o el composable `useSpGrabar`, que interpreta el código de error y recarga la grilla).

---

## 5. Pruebas y Validación
```bash
npm run test:unit
```
