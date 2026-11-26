# Plantillas de Requerimientos y Desarrollo — Liq-Panel

Este documento contiene las plantillas estándar para solicitar nuevas funciones, correcciones o módulos en el proyecto. Puedes copiar y completar la plantilla que corresponda para acelerar el desarrollo y evitar ambigüedades.

---

## 📋 1. Solicitud de Nueva Función o Modificación

```markdown
### SOLICITUD DE CAMBIO / NUEVA FUNCIÓN

* **Módulo o Pantalla:** (ej. Operaciones > Transformación / Agentes > Cargos / Novedades Haberes)
* **Objetivo:** (¿Qué debe hacer la función o qué problema resuelve?)
* **Dónde se ubica en la UI:** (ej. un botón en la barra superior / una columna en la tabla / una nueva pestaña)
* **Datos / Backend involucrado:**
  - Procedimiento (SP): (ej. sp/transform / sp/liq / no aplica)
  - Vista o Endpoint: (ej. view/cargo / /api/novhaberes / no aplica)
  - Parámetros clave: (ej. Periodo, ReparticionId, etc.)
* **Comportamiento esperado:**
  1. El usuario hace clic en...
  2. Se valida que...
  3. Al confirmar, debe...
* **Acción final:** (ej. solo probar en local / build y deploy a main y api-rpi)
```

---

## 🐛 2. Reporte de Error o Comportamiento Inesperado (Bug)

```markdown
### REPORTE DE ERROR

* **Dónde ocurre:** (URL o pantalla, ej. /operaciones o Agentes > Datos Bancarios)
* **Qué estabas haciendo:** (ej. al hacer clic en 'Guardar' después de cambiar el CBU)
* **Mensaje o Error exacto:** (ej. error 404 en consola / ORA-06550... / se queda cargando)
* **Datos de prueba:** (ej. DNI: 12345678, Período: 10/2026, Repartición: 400)
* **Qué debería haber pasado:** (ej. mostrar alerta verde de éxito y refrescar la tabla)
* **Acción final:** (ej. corregir, probar y desplegar)
```

---

## 📦 3. Creación de un Módulo Nuevo desde Cero

```markdown
### NUEVO MÓDULO

* **Nombre del Módulo:** (ej. `embargos`, `antiguedad`, `licencias`)
* **Ubicación en el Menú:** (ej. debajo de 'Liquidaciones' en la barra lateral)
* **Ruta deseada:** (ej. `/embargos`)
* **Vistas principales:**
  - Listado: (ej. tabla con búsqueda por DNI y filtro de período)
  - Formulario/Edición: (ej. diálogo modal para alta/modificación/baja)
* **Endpoints / SPs previstos:**
  - Lectura: (ej. view/embargos)
  - Grabación/Baja: (ej. sp/embargos_spi o REST /api/embargos)
* **Permisos/Roles:** (ej. solo administradores o general)
* **Acción final:** (crear módulo con rutas, vistas, tests unitarios y registrar en router)
```

---

## 🗺️ Mapa Rápido de Referencia del Proyecto

| Módulo | Ruta Código | Qué administra |
| :--- | :--- | :--- |
| **Agentes** | `src/modules/agentes/` | Personas, legajos, cargos y datos bancarios (CBU). |
| **Novedades** | `src/modules/novedades/` | Hojas de novedades, haberes y novedades varias. |
| **Operaciones** | `src/modules/operaciones/` | Transformación de novedades, cálculo de liquidación, boletas y monitor de procesos. |
| **Conceptos** | `src/modules/conceptos/` | Conceptos de liquidación por cargo. |
| **Reportes** | `src/modules/reportes/` | Listados generales, resúmenes y totales. |
| **Acreditaciones** | `src/modules/acreditaciones/` | Generación de archivos bancarios. |
| **IPSST** | `src/modules/ipsst/` | DDJJ y archivos previsionales. |
| **Auth / Usuarios** | `src/modules/auth/` y `usuarios/` | Login, sesiones con timeout de inactividad y roles. |
| **Servicios / API** | `src/shared/services/apiService.js` | Capa única de comunicación con el backend (leerDatos, ejecutarSP, ejecutarSP_SinEspera). |
| **Stores (Pinia)** | `src/stores/` | `filterStore` (período y repartición activa), `userStore` (sesión), `tenantStore`. |

---

## ⚠️ Reglas de Oro Arquitectónicas
1. **Toda escritura pasa por `apiService.js`**: Usar `ejecutarSP`, `ejecutarSP_SinEspera` o métodos de fachada; nunca invocar endpoints crudos desde las vistas.
2. **Paginación en tablas**: No usar la propiedad `:items-per-page=` en componentes (regla validada por `reglasOro.spec.js`).
3. **Despliegues**: Siempre validar con `npm run test:unit && npm run build` y sincronizar ambas ramas (`api-rpi` y `main`).
