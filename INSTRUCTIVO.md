# Instructivo y Mapa Esencial de Desarrollo (`liq-panel`)

Este instructivo está diseñado para que el desarrollador o el asistente de IA **no necesite leer todo el proyecto** cada vez que se deba hacer un ajuste o modificación.

Cada módulo funcional está fraccionado en su propia ficha técnica independiente dentro de la carpeta [`docs/`](file:///Users/jferreyradev/projects/ag/liq-panel/docs/).

> 💡 **Para saber cómo solicitar ajustes rápidamente con plantillas y ejemplos, consulta [INSTRUCCIONES.md](INSTRUCCIONES.md).**

---

## 🧭 Índice Rápido por Módulo

Haz clic en la ficha correspondiente a la tarea que vas a realizar:

| Módulo | Ficha Técnica | Cuándo consultarla |
| :--- | :--- | :--- |
| **Arquitectura Modular** | [`docs/00-arquitectura-modular.md`](file:///Users/jferreyradev/projects/ag/liq-panel/docs/00-arquitectura-modular.md) | Guía de referencia: estructura por dominios, servicios compartidos y cómo agregar un nuevo módulo. |
| **Multi-Tenant y Endpoints** | [`docs/01-multi-tenant-y-endpoints.md`](file:///Users/jferreyradev/projects/ag/liq-panel/docs/01-multi-tenant-y-endpoints.md) | Cambiar puertos, claves, logos, URLs o agregar un nuevo municipio. |
| **Reportes y Planillas** | [`docs/02-reportes.md`](file:///Users/jferreyradev/projects/ag/liq-panel/docs/02-reportes.md) | Modificar columnas, filtros, endpoints o disponibilidad por municipio. |
| **Boletas y Recibos PDF** | [`docs/03-boletas-y-recibos.md`](file:///Users/jferreyradev/projects/ag/liq-panel/docs/03-boletas-y-recibos.md) | Modificar diseño de boleta, formato de nombre de archivo o descarga. |
| **Liquidaciones y Procesos** | [`docs/04-liquidaciones-y-procesos.md`](file:///Users/jferreyradev/projects/ag/liq-panel/docs/04-liquidaciones-y-procesos.md) | Ajustar panel de control, items liquidados o ejecución de SPs. |
| **Novedades y Agentes** | [`docs/05-novedades-y-agentes.md`](file:///Users/jferreyradev/projects/ag/liq-panel/docs/05-novedades-y-agentes.md) | Modificar hojas, novedades mensuales, legajos o cargos. |
| **Acreditaciones y Previsión** | [`docs/06-acreditaciones-y-prevision.md`](file:///Users/jferreyradev/projects/ag/liq-panel/docs/06-acreditaciones-y-prevision.md) | Modificar archivos bancarios TXT, DDJJ o interfaz con IPSST. |

---

## ⚡ Reglas de Oro para Modificaciones

1. **Nunca usar `useTenantStore()` ni `useEndPoints()` a nivel raíz del archivo JS**:
   Siempre deben invocarse dentro de funciones (`getUrlApi()`, `getHeaders()`) o en el `setup()` de componentes Vue para evitar errores de inicialización de Pinia.
2. **Las llamadas API son reactivas y pasan por un único cliente**:
   Todas las peticiones salen por `@/shared/services/httpClient.js` (el único archivo con `fetch()`), a través de la fachada `@/shared/services/apiService.js`, que usa `useEndPoints()` (`apiBase`, `getBoletasHeaders()`) para inyectar automáticamente el `x-project-key` y `x-project-port` del municipio activo. Nunca llamar a `fetch()` directamente.
3. **Validación rápida post-cambio**:
   Al realizar un ajuste, ejecuta solo el test del archivo afectado (ej. `npx vitest run src/modules/reportes/__tests__/RepoView.spec.js`), o la suite completa con `npm run test:unit`.

---

## 🛠️ Comandos de Terminal de Referencia

```bash
# Servidor de desarrollo local
npm run dev

# Ejecutar todas las pruebas unitarias (266 tests)
npm run test:unit

# Lint (solo errores reales; no reformatea el código)
npm run lint

# Compilar para producción (validación de build y assets)
npm run build
```
