# Ficha 06: Acreditaciones Bancarias y Previsión

## 1. Resumen
Generación de archivos magnéticos TXT para acreditación bancaria en cuentas sueldo de los empleados, control de cuentas liquidadas, generación de Declaraciones Juradas previsionales (DDJJ) y archivos magnéticos para el Instituto de Previsión y Seguridad Social de Tucumán (IPSST).

---

## 2. Archivos Involucrados

### A. Módulo Acreditaciones:
- [`src/views/AcreditacionView.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/views/AcreditacionView.vue): Interfaz unificada con pestañas para "Generación de TXT" y "Resumen de Acreditaciones".
- [`src/components/Acreditacion/AcreditacionTXT.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/Acreditacion/AcreditacionTXT.vue): Generador y descargador de archivo plano `.txt` bancario.
- [`src/components/Acreditacion/ResumenAcred.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/Acreditacion/ResumenAcred.vue): Totales y resumen por banco/sucursal.
- [`src/components/Acreditacion/ResumenAcredDetalle.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/Acreditacion/ResumenAcredDetalle.vue): Detalle individual de cada acreditación.

### B. Módulo Previsional e IPSST:
- [`src/views/PrevisionalView.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/views/PrevisionalView.vue): Panel de DDJJ y parámetros previsionales.
- [`src/views/ArchivosView.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/views/ArchivosView.vue): Vista de generación de archivos magnéticos.
- [`src/components/Previsional/DDJJMarco.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/Previsional/DDJJMarco.vue): Declaración jurada previsional.
- [`src/components/Previsional/ParametrosDDJJ_List.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/Previsional/ParametrosDDJJ_List.vue): Configuración de porcentajes de aportes (Jubilación, Obra Social, Fondo Especial).
- [`src/components/Previsional/ArchIPSST.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/Previsional/ArchIPSST.vue): Generación del archivo plano para el IPSST.
- [`src/components/Previsional/ResumenIPSST.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/Previsional/ResumenIPSST.vue): Resumen analítico de aportes IPSST.

---

## 3. Endpoints Principales
- **Acreditación TXT**: `${apiBase}/api/acreditacion/txt?${filterString}`
- **Resumen Acreditación**: `${apiBase}/api/view/resumenAcred?${filterString}`
- **Parámetros DDJJ**: `${apiBase}/api/previsional/parametros`
- **Generación Archivo IPSST**: `${apiBase}/api/previsional/ipsst?${filterString}`
- **Resumen IPSST**: `${apiBase}/api/previsional/resumenIPSST?${filterString}`

---

## 4. Recetas de Modificación

### A. Para modificar el formato o campos del archivo TXT bancario:
Editar [`src/components/Acreditacion/AcreditacionTXT.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/Acreditacion/AcreditacionTXT.vue):
- Estructura de línea (CBU, DNI, importe formateado con ceros a la izquierda).
- Nombre del archivo de salida.

### B. Para ajustar los parámetros de la DDJJ previsional:
Editar [`src/components/Previsional/ParametrosDDJJ_List.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/components/Previsional/ParametrosDDJJ_List.vue):
- Porcentajes patronales y personales de la Ley 4044 / IPSST.

---

## 5. Pruebas Unitarias Asociadas
```bash
npx vitest run src/components/__tests__/ResumenIPSST.spec.js
```
