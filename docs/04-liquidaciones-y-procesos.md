# Ficha 04: Liquidaciones y Procesos

## 1. Resumen
Control central del ciclo de liquidación de haberes: selección de período, tipo de liquidación y adicional, consulta de totales por agente/repartición, desglose analítico de conceptos liquidados, y panel de ejecución de procesos batch (SPs de liquidación y cierres).

---

## 2. Archivos Involucrados
- [`src/views/PanelView.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/views/PanelView.vue): Vista principal de control de liquidación.
- [`src/views/ProcesosView.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/views/ProcesosView.vue): Vista de procesos batch y cierres mensuales.
- [`src/components/EjecProcesos/PanelCtrlLiq.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/EjecProcesos/PanelCtrlLiq.vue): Barra de filtros (Período, Tipo Liq, Adicional, Repartición) con selector de estado.
- [`src/components/EjecProcesos/LiquidacionTable.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/EjecProcesos/LiquidacionTable.vue): Tabla resumen de agentes liquidados (bruto, descuentos, neto).
- [`src/components/EjecProcesos/LiquidacionItemTable.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/EjecProcesos/LiquidacionItemTable.vue): Desglose renglón por renglón de conceptos de un agente seleccionado.
- [`src/components/EjecProcesos/ProcesosList.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/EjecProcesos/ProcesosList.vue): Lista de stored procedures y tareas ejecutables.
- [`src/components/EjecProcesos/llamadaAPI.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/EjecProcesos/llamadaAPI.js): Funciones de llamada al backend para ejecución de SPs (`ejecutarSP`, `ejecutaSP`).
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
Editar `headers` en [`src/components/EjecProcesos/LiquidacionTable.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/EjecProcesos/LiquidacionTable.vue):
- `IDREP`: Repartición
- `ORDEN`: Orden del agente
- `PERSONADOCUMENTO`: DNI
- `PERSONAAPELLIDO`, `PERSONANOMBRE`
- `TOTALBRUTO`: Salario bruto
- `TOTALDESCUENTOS`: Suma de retenciones
- `TOTALNETO`: Salario neto a cobrar

### B. Para añadir o cambiar un Stored Procedure ejecutable:
1. Abrir [`src/components/EjecProcesos/ProcesosList.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/EjecProcesos/ProcesosList.vue).
2. Localizar el array de procesos y agregar la definición del SP con sus parámetros (período, tipo, etc.).
3. Las llamadas utilizan la función exportada `ejecutarSP` de `llamadaAPI.js`.

---

## 5. Pruebas y Validación
```bash
npm run test:unit
```
