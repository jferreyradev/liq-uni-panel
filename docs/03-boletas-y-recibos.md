# Ficha 03: Boletas y Recibos PDF

## 1. Resumen
Generación, consulta y descarga masiva o individual de recibos de sueldo en PDF, con indicador de carga por ítem, soporte dual (servidor Deno o local con `pdf-lib`), y estampado del escudo municipal activo.

---

## 2. Archivos Involucrados
- [`src/modules/liquidaciones/views/BoletasView.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/liquidaciones/views/BoletasView.vue): Vista contenedora con filtros de liquidación.
- [`src/modules/liquidaciones/components/LiqBoletas.vue`](file:///Users/jferreyradev/projects/ag/liq-panel/src/modules/liquidaciones/components/LiqBoletas.vue): Tabla de agentes, visor de estado, botón de descarga por fila con `loadingBoletas` reactivo.
- [`src/stores/boletaStore.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/stores/boletaStore.js): Store que administra el estado de generación y descarga.
- [`src/utils/boletas.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/utils/boletas.js): Motor de generación de PDF local mediante `pdf-lib` con estampado de logotipo dinámico.
- [`src/composables/useBoletaFileName.spec.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/composables/__tests__/useBoletaFileName.spec.js) y [`src/utils/__tests__/boletas.spec.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/utils/__tests__/boletas.spec.js): Lógica de formateo de nombres.

---

## 3. Formato y Nomenclatura del Archivo PDF
El nombre del archivo PDF generado sigue el formato estandarizado:
```text
MMYYYY_TIPO_APELLIDO_NOMBRE.pdf
```
Ejemplo: `092024_1_PEREZ_JUAN.pdf`

---

## 4. Endpoints y Parámetros
- **Listado de boletas**: `${apiBase}/api/boletas/list?${filterString}`
- **PDF desde servidor**: `${apiBoletas}/api/boleta/pdf?${filterString}&idAgente=${id}`
- **Headers requeridos**: `getBoletasHeaders()` (`x-project-key`, `x-project-port`).

---

## 5. Recetas de Modificación

### A. Para cambiar el logo que aparece en la boleta:
El logo se obtiene automáticamente de `tenantStore.boletaLogo`.
Para cambiar el logo de un municipio, reemplazar la imagen en `src/assets/tenants/<nombre>.png` o asignarla en [`src/config/tenants.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/config/tenants.js).

### B. Para ajustar el diseño visual del PDF local (`pdf-lib`):
Editar [`src/utils/boletas.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/utils/boletas.js):
- Coordenadas de cabecera: líneas ~40-70.
- Tabla de haberes y descuentos: líneas ~80-140.
- Totales netos y firma: líneas ~150-180.

---

## 6. Pruebas Unitarias Asociadas
```bash
npx vitest run src/utils/__tests__/boletas.spec.js
npx vitest run src/composables/__tests__/useBoletaFileName.spec.js
```
