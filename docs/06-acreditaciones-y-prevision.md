# Ficha 06: Acreditaciones Bancarias, Obra Social IPSST y Previsión

## 1. Resumen
Generación de archivos magnéticos TXT para acreditación bancaria en cuentas sueldo de los empleados, control y detalle de cuentas liquidadas, generación de archivos para el Instituto de Previsión y Seguridad Social de Tucumán (IPSST), y declaraciones juradas previsionales (DDJJ).

En la arquitectura modular, estas responsabilidades están desacopladas en tres módulos independientes:
1. **`acreditaciones`**: Formato directo continuo alineado a `front-liq-tafiviejo` con soporte de filtro `Es Ley`.
2. **`ipsst`**: Módulo propio de Obra Social con layout estándar unificado (`ResumenIPSST` + `ArchIPSST`).
3. **`previsional`**: Declaraciones Juradas y gestión de parámetros previsionales.

---

## 2. Estructura y Archivos Involucrados

### A. Módulo Acreditaciones (`src/modules/acreditaciones/`)
* [`src/modules/acreditaciones/views/AcreditacionView.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/acreditaciones/views/AcreditacionView.vue): Vista unificada y directa con `LiqInputPanel :esley="true"`.
* [`src/modules/acreditaciones/components/ResumenAcred.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/acreditaciones/components/ResumenAcred.vue): Totales y resumen por banco/sucursal.
* [`src/modules/acreditaciones/components/ResumenAcredDetalle.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/acreditaciones/components/ResumenAcredDetalle.vue): Detalle individual de cada acreditación con exportación a Excel.
* [`src/modules/acreditaciones/components/ArchAcred.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/acreditaciones/components/ArchAcred.vue): Generador y descargador de archivo plano `.txt` bancario (con fallback local).
* **Rutas:** `/acredit`, `/acred`.

### B. Módulo IPSST (`src/modules/ipsst/`)
* [`src/modules/ipsst/views/IPSSTView.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/ipsst/views/IPSSTView.vue): Layout continuo estándar sin pestañas.
* [`src/modules/ipsst/components/ResumenIPSST.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/ipsst/components/ResumenIPSST.vue): Planilla y resumen analítico de retenciones para la Obra Social.
* [`src/modules/ipsst/components/ArchIPSST.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/ipsst/components/ArchIPSST.vue): Generación del archivo plano TXT oficial para el IPSST.
* **Rutas:** `/ipsst`, `/archivos`.

### C. Módulo Previsional (`src/modules/previsional/`)
* [`src/modules/previsional/views/PrevisionalView.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/previsional/views/PrevisionalView.vue): Panel de DDJJ y parámetros previsionales.
* [`src/modules/previsional/components/DDJJMarco.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/previsional/components/DDJJMarco.vue): Declaración jurada previsional mensual.
* [`src/modules/previsional/components/ParametrosDDJJ_List.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/previsional/components/ParametrosDDJJ_List.vue): Configuración de porcentajes de aportes (Jubilación, Obra Social, Fondo Especial).
* **Rutas:** `/prevision`.

---

## 3. Endpoints Principales

### Acreditaciones:
* **Resumen Acreditación:** `${apiBase}/api/view/resumenAcred?${filterStringLey}`
* **Detalle Acreditación:** `${apiBase}/api/view/detalleAcred?${filterStringLey}`
* **Descarga Archivo TXT:** `${apiBase}/api/txt/archivoAcred?${filterStringLey}`
* **Vista Archivo TXT:** `${apiBase}/api/view/archivoAcred?${filterStringLey}`

### IPSST:
* **Resumen IPSST:** `${apiBase}/api/view/resumenIPSST?${filterPeriodoString}`
* **Archivo IPSST:** `${apiBase}/api/view/archivoIPSST?${filterPeriodoString}`

### Previsional:
* **Parámetros DDJJ:** `${apiBase}/api/previsional/parametros`
* **Liquidaciones DDJJ:** `${apiBase}/api/sp/ddjjLiqAgrega`

---

## 4. Pruebas Unitarias Asociadas
```bash
# Probar componente de archivo IPSST
npx vitest run src/components/__tests__/ArchIPSST.spec.js

# Probar componente de archivo Acreditaciones con filtro Ley
npx vitest run src/components/__tests__/ArchAcred.spec.js

# Probar resumen IPSST
npx vitest run src/components/__tests__/ResumenIPSST.spec.js
```
