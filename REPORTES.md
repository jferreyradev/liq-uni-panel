# Catálogo y Especificación de Reportes por Municipio

Este documento describe la disponibilidad, propósito, estructura de datos y endpoints de los reportes del sistema unificado **`liq-panel`**.

Debido a los requerimientos operacionales y a la estructura histórica de las bases de datos de cada municipio, el selector de reportes en la vista [`RepoView.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/views/RepoView.vue) es **reactivo al municipio seleccionado**, mostrando únicamente las opciones habilitadas para cada comuna, con posibilidad de desbloquear el catálogo completo mediante un switch global.

---

## 1. Matriz de Disponibilidad

| # | Título en Pantalla | Componente Vue | Endpoint Backend | Concepción | Burruyacú | Tafí Viejo | Trancas |
| :-: | :--- | :--- | :--- | :-: | :-: | :-: | :-: |
| **1** | **Resumen Liquidacion** | `RepoResumenLiq.vue` | `/api/repo/resumenLiq` | ⚪ *(Opcional)* | ⚪ *(Opcional)* | ⚪ *(Opcional)* | 🟢 **Activo** |
| **2** | **Detalle por concepto (153)** | `RepoCod153.vue` | `/api/view/resumenCodigo?Codigo=153` | ⚪ *(Opcional)* | ⚪ *(Opcional)* | ⚪ *(Opcional)* | 🟢 **Activo** |
| **4** | **Resumen liquidación por códigos** | `RepoResumenCod.vue` | `/api/view/resumenCodLiq` | 🟢 **Activo** | 🟢 **Activo** | 🟢 **Activo** | 🟢 **Activo** |
| **5** | **Resumen pedido FDO** | `RepoResumenLiqFdo.vue` | `/api/view/resumenFdo` | ⚪ *(Opcional)* | ⚪ *(Opcional)* | ⚪ *(Opcional)* | 🟢 **Activo** |
| **6** | **Resumen Aportes Patronales** | `RepoApoPatronales.vue` | `/api/view/aportesPat` | 🟢 **Activo** | 🟢 **Activo** | 🟢 **Activo** | ⚪ *(Opcional)* |
| **7** | **Planilla de Det. Liq.** | `RepoPlanillaDetLiq.vue` | `/api/view/planillaDetLiq` | 🟢 **Activo** | 🟢 **Activo** | 🟢 **Activo** | ⚪ *(Opcional)* |
| **8** | **Planilla de Retenciones** | `RepoPlanillaRet.vue` | `/api/view/planillaRet` | 🟢 **Activo** | 🟢 **Activo** | 🟢 **Activo** | ⚪ *(Opcional)* |
| **9** | **Planilla de Ley** | `RepoPlanillaLey.vue` | `/api/view/planillaLey` | 🟢 **Activo** | 🟢 **Activo** | 🟢 **Activo** | ⚪ *(Opcional)* |
| **10** | **Resumen de Sueldos** | `RepoPlanillaResSueldo.vue` | `/api/view/resumenSueldos` | 🟢 **Activo** | 🟢 **Activo** | 🟢 **Activo** | ⚪ *(Opcional)* |
| **11** | **Retenciones de CPA** | `RepoPlanillaRetencionesCPA.vue` | `/api/view/planillaRetCPA` | 🟢 **Activo** | 🟢 **Activo** | 🟢 **Activo** | ⚪ *(Opcional)* |
| **12** | **Retenciones de Cargo** | `RepoPlanillaRetCargo.vue` | `/api/view/retencionesCargo` | 🟢 **Activo** | 🟢 **Activo** | 🟢 **Activo** | ⚪ *(Opcional)* |
| **13** | **Bajas de Ley** | `RepoBajasLey.vue` | `/api/view/bajasLey` | 🟢 **Activo** | 🟢 **Activo** | 🟢 **Activo** | ⚪ *(Opcional)* |
| **14** | **Res. de Sue. - Inas. - Ley** | `RepoPlanillaResSueldoComp.vue` | `/api/view/resumenSueldosComp` | 🟢 **Activo** | 🟢 **Activo** | 🟢 **Activo** | ⚪ *(Opcional)* |
| **15** | **Resumen cargos** | `RepoPlanillaResumenCargos.vue` | `/api/view/resumenCargos` | 🟢 **Activo** | 🟢 **Activo** | 🟢 **Activo** | ⚪ *(Opcional)* |

> 🟢 **Activo**: Aparece por defecto en el menú desplegable al seleccionar dicho municipio.  
> ⚪ *(Opcional)*: Accesible para cualquier municipio activando el interruptor **"Mostrar todos los reportes"**.

---

## 2. Descripción Detallada de cada Reporte

### Reporte 1: Resumen Liquidacion
- **Componente**: [`src/components/RepoResumenLiq.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/RepoResumenLiq.vue)
- **Municipio nativo**: Trancas
- **Propósito**: Planilla general de haberes discriminando montos sujetos a aportes, exentos, descuentos de ley y varios, y salario neto a percibir.
- **Campos principales**: `IDREP`, `ORDEN`, `DNI`, `Apellido`, `Nombre`, `Sujeto a aporte`, `Exento de aporte`, `Descuentos de ley`, `Descuentos varios`, `Neto`.
- **Exportación**: Excel (`.xlsx`).

---

### Reporte 2: Detalle por concepto (153)
- **Componente**: [`src/components/RepoCod153.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/RepoCod153.vue)
- **Municipio nativo**: Trancas
- **Propósito**: Emisión focalizada del concepto salarial `153` (adicional específico de personal municipal), individualizando empleados y montos liquidados.
- **Campos principales**: `IDREP`, `DNI`, `Apellido`, `Nombre`, `Concepto 153`, `Importe`.
- **Exportación**: Excel (`.xlsx`).

---

### Reporte 4: Resumen de liquidación por códigos
- **Componente**: [`src/components/RepoResumenCod.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/RepoResumenCod.vue)
- **Municipios nativos**: Concepción, Burruyacú, Tafí Viejo, Trancas (Común a todos)
- **Propósito**: Consolidado cuantitativo y monetario de todos los códigos de haberes y descuentos devengados en el período.
- **Campos principales**: `Codigo`, `Descripcion`, `Cantidad de casos`, `Total Importe`.
- **Exportación**: Excel (`.xlsx`).

---

### Reporte 5: Resumen pedido FDO
- **Componente**: [`src/components/RepoResumenLiqFdo.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/RepoResumenLiqFdo.vue)
- **Municipio nativo**: Trancas
- **Propósito**: Cuadro de solicitud y afectación de fondos presupuestarios para pago de sueldos clasificado por repartición y fuentes financieras.
- **Campos principales**: `Repartición`, `Orden`, `Denominación`, `Monto solicitado`, `Aporte patronal`, `Total partida`.
- **Exportación**: Excel (`.xlsx`).

---

### Reporte 6: Resumen Aportes Patronales
- **Componente**: [`src/components/RepoApoPatronales.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/RepoApoPatronales.vue)
- **Municipios nativos**: Concepción, Burruyacú, Tafí Viejo
- **Propósito**: Determinación de las obligaciones previsionales y de seguridad social patronales (Jubilación Municipal, Obra Social IPSST patronal, Seguros y ART).
- **Campos principales**: `Repartición`, `Base Imponible`, `Jubilación Patronal (%)`, `IPSST Patronal (%)`, `Fondo Solidario`, `Subtotal Contribuciones`.
- **Exportación**: Excel (`.xlsx`).

---

### Reporte 7: Planilla de Detalle de Liquidación (Det. Liq.)
- **Componente**: [`src/components/RepoPlanillaDetLiq.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/RepoPlanillaDetLiq.vue)
- **Municipios nativos**: Concepción, Burruyacú, Tafí Viejo
- **Propósito**: Libro y planilla oficial analítica de sueldos donde se detalla cada renglón liquidado por agente (ordenado por Repartición, Orden, Fecha de devengado y Código).
- **Campos principales**: `Repartición`, `Orden`, `Agente`, `Categoría`, `Código`, `Descripción Concepto`, `Haberes c/Aporte`, `Haberes s/Aporte`, `Descuentos`, `Neto`.
- **Exportación**: Excel (`.xlsx`).

---

### Reporte 8: Planilla de Retenciones
- **Componente**: [`src/components/RepoPlanillaRet.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/RepoPlanillaRet.vue)
- **Municipios nativos**: Concepción, Burruyacú, Tafí Viejo
- **Propósito**: Detalle de descuentos de terceros practicados sobre el sueldo de los agentes (sindicatos, mutuales, cuotas judiciales/embargos, seguros).
- **Campos principales**: `Código Retención`, `Entidad Beneficiaria`, `DNI`, `Agente`, `Número de cuota`, `Monto Descontado`.
- **Exportación**: Excel (`.xlsx`).

---

### Reporte 9: Planilla de Ley
- **Componente**: [`src/components/RepoPlanillaLey.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/RepoPlanillaLey.vue)
- **Municipios nativos**: Concepción, Burruyacú, Tafí Viejo
- **Propósito**: Rendición y detalle nominal de los descuentos obligatorios fijados por legislación provincial y nacional (Jubilación personal, Ley 4044/IPSST, Seguro de vida obligatorio).
- **Campos principales**: `Repartición`, `DNI`, `Agente`, `Aporte Jubilatorio (11%/14%)`, `Obra Social IPSST (4.5%)`, `Total Descuentos de Ley`.
- **Exportación**: Excel (`.xlsx`).

---

### Reporte 10: Resumen de Sueldos
- **Componente**: [`src/components/RepoPlanillaResSueldo.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/RepoPlanillaResSueldo.vue)
- **Municipios nativos**: Concepción, Burruyacú, Tafí Viejo
- **Propósito**: Totales acumulados por repartición administrativa o centro de costo para control contable y presupuestario.
- **Campos principales**: `Repartición`, `Cantidad de Agentes`, `Sueldo Básico`, `Bonificaciones`, `Asignaciones Familiares`, `Bruto Total`, `Retenciones`, `Neto a Pagar`.
- **Exportación**: Excel (`.xlsx`).

---

### Reporte 11: Retenciones de CPA (Caja Popular de Ahorros)
- **Componente**: [`src/components/RepoPlanillaRetencionesCPA.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/RepoPlanillaRetencionesCPA.vue)
- **Municipios nativos**: Concepción, Burruyacú, Tafí Viejo
- **Propósito**: Planilla de retenciones comerciales, préstamos personales y seguros de la Caja Popular de Ahorros de la Provincia de Tucumán para conciliación bancaria.
- **Campos principales**: `Sucursal`, `Préstamo / Cuenta`, `DNI`, `Apellido y Nombre`, `Cuota`, `Importe Retenido`.
- **Exportación**: Excel (`.xlsx`).

---

### Reporte 12: Retenciones de Cargo
- **Componente**: [`src/components/RepoPlanillaRetCargo.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/RepoPlanillaRetCargo.vue)
- **Municipios nativos**: Concepción, Burruyacú, Tafí Viejo
- **Propósito**: Retenciones imputadas directamente al cargo o categoría presupuestaria del empleado.
- **Campos principales**: `Cargo / Función`, `Planta (Permanente / Transitoria)`, `Código Retención`, `Total Retenido`.
- **Exportación**: Excel (`.xlsx`).

---

### Reporte 13: Bajas de Ley
- **Componente**: [`src/components/RepoBajasLey.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/RepoBajasLey.vue)
- **Municipios nativos**: Concepción, Burruyacú, Tafí Viejo
- **Propósito**: Registro de agentes desvinculados, cesantías, jubilaciones o bajas del período con el cómputo de sus liquidaciones finales y desgravaciones de ley.
- **Campos principales**: `DNI`, `Agente`, `Fecha de Baja`, `Motivo de Baja`, `Ajuste Jubilatorio`, `Ajuste Obra Social`.
- **Exportación**: Excel (`.xlsx`).

---

### Reporte 14: Res. de Sue. - Inas. - Ley (Resumen Integral)
- **Componente**: [`src/components/RepoPlanillaResSueldoComp.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/RepoPlanillaResSueldoComp.vue)
- **Municipios nativos**: Concepción, Burruyacú, Tafí Viejo
- **Propósito**: Planilla maestra integral que cruza los haberes brutos, los descuentos por inasistencias o sanciones disciplinarias, y los descuentos legales netos.
- **Campos principales**: `Repartición`, `Agente`, `Haberes Devengados`, `Días/Horas Inasistencia`, `Descuento Inasistencias`, `Aportes Ley`, `Líquido Final`.
- **Exportación**: Excel (`.xlsx`).

---

### Reporte 15: Resumen Cargos
- **Componente**: [`src/components/RepoPlanillaResumenCargos.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/RepoPlanillaResumenCargos.vue)
- **Municipios nativos**: Concepción, Burruyacú, Tafí Viejo
- **Propósito**: Análisis estadístico y presupuestario del escalafón municipal (cantidad de cargos ocupados por categoría, funcionarios, personal de planta y contratados).
- **Campos principales**: `Nivel Escalafonario`, `Denominación del Cargo`, `Cantidad de Agentes`, `Costo Salarial Total`.
- **Exportación**: Excel (`.xlsx`).

---

## 3. Implementación y Configuración Técnica

### 3.1. Configuración de municipios (`src/config/tenants.js`)
Cada municipio define un array `allowedReports` con los números de reporte asignados:

```javascript
// src/config/tenants.js
export const TENANTS = [
  {
    id: 'concepcion',
    name: 'Municipalidad de Concepción',
    // ...
    allowedReports: [4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
  },
  {
    id: 'burruyacu',
    name: 'Municipalidad de Burruyacú',
    // ...
    allowedReports: [4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
  },
  {
    id: 'tafiviejo',
    name: 'Municipalidad de Tafí Viejo',
    // ...
    allowedReports: [4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
  },
  {
    id: 'trancas',
    name: 'Municipalidad de Trancas',
    // ...
    allowedReports: [1, 2, 4, 5]
  }
]
```

### 3.2. Lógica en la vista (`src/views/RepoView.vue`)
- **Reactividad**: Utiliza `tenantStore.activeTenant.allowedReports` a través de un `computed()`.
- **Reseteo seguro**: Si el usuario está visualizando un reporte (ej. `1: Resumen Liquidacion`) y cambia en el Navbar a *Concepción*, el watcher detecta que el reporte `1` no pertenece a Concepción y resetea automáticamente la selección a `null`, evitando errores en los llamados API.
- **Switch global**: Mediante el toggle `v-switch v-model="showAllReports"` se desactiva el filtro por municipio y se despliegan los 14 reportes simultáneamente para auditoría cruzada o pruebas avanzadas.
