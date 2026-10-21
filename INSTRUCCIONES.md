# Instrucciones de Trabajo y Modificación Ágil

Esta guía explica el procedimiento recomendado para solicitar ajustes o agregar funcionalidades al proyecto **`liq-panel`** sin que el asistente de IA ni el desarrollador tengan que reanalizar todo el código ni perder el hilo de la arquitectura.

---

## 🎯 Objetivo
Evitar lecturas completas y costosas del repositorio. Cada modificación debe ser **quirúrgica**: identificar la ficha en [`docs/`](docs/), leer únicamente el archivo necesario, aplicar el cambio y validar con su prueba unitaria asociada.

---

## 📋 Plantilla para Solicitar un Ajuste

Cuando solicites un cambio, utiliza este formato simple:

```text
Ficha/Módulo: docs/0X-... (o el nombre del módulo)
Municipio: [Concepción / Burruyacú / Tafí Viejo / Trancas / Todos]
Acción: [Qué necesitas cambiar, agregar o corregir]
(Opcional) Error: [Copia el texto del error si es un fallo]
```

---

## 💡 Ejemplos Prácticos de Solicitudes

### Ejemplo 1: Ajustar Reportes
> *"Revisa `docs/02-reportes.md`. En el Reporte 8 (Planilla de Retenciones), necesito agregar una columna para mostrar el CUIT del sindicato."*

### Ejemplo 2: Modificar Datos de un Municipio
> *"Revisa `docs/01-multi-tenant-y-endpoints.md`. Necesito cambiar el puerto del municipio Burruyacú del 3003 al 3009 en el archivo `tenants.js`."*

### Ejemplo 3: Ajuste de Boletas PDF
> *"Revisa `docs/03-boletas-y-recibos.md`. Para Trancas, necesitamos que el nombre de la boleta descargada incluya también el legajo antes del DNI."*

### Ejemplo 4: Corregir un Error de API
> *"Revisa `docs/04-liquidaciones-y-procesos.md`. Al hacer clic en un agente de la liquidación me da error 404 en `/api/view/liquidacionItem`. Este es el log de la consola: [pegar log]"*

---

## 🗺️ Mapa de Fichas por Módulo

Antes de pedir un cambio, ubica la ficha correspondiente:

| Si tu cambio es sobre... | Consulta la ficha... |
| :--- | :--- |
| Claves, puertos, logos, URLs o alta de municipios | [`docs/01-multi-tenant-y-endpoints.md`](docs/01-multi-tenant-y-endpoints.md) |
| Reportes, columnas, filtros Excel o reportes permitidos | [`docs/02-reportes.md`](docs/02-reportes.md) y [`REPORTES.md`](REPORTES.md) |
| Recibos en PDF, diseño local con `pdf-lib` o nombres | [`docs/03-boletas-y-recibos.md`](docs/03-boletas-y-recibos.md) |
| Panel de liquidación, totales, renglones o SPs batch | [`docs/04-liquidaciones-y-procesos.md`](docs/04-liquidaciones-y-procesos.md) |
| Novedades mensuales, grilla editable, legajos o cargos | [`docs/05-novedades-y-agentes.md`](docs/05-novedades-y-agentes.md) |
| Exportación TXT bancario, control de cuentas o DDJJ IPSST | [`docs/06-acreditaciones-y-prevision.md`](docs/06-acreditaciones-y-prevision.md) |
| Llamadas al backend, timeouts, errores de red o logging HTTP | [`docs/07-capa-http-unica.md`](docs/07-capa-http-unica.md) |

---

## ⚙️ Reglas de Oro del Código

1. **Pinia seguro**: No instanciar `useTenantStore()` o `useEndPoints()` en el ámbito raíz de archivos `.js`. Siempre dentro de funciones o en `setup()`.
2. **Capa HTTP única**: Todo el tráfico al backend sale por `@/shared/services/httpClient.js` (el único archivo con `fetch()`), a través de la fachada `@/shared/services/apiService.js`. Nunca llamar a `fetch()` directamente; hay un test-guard que lo detecta. Detalle en [`docs/07-capa-http-unica.md`](docs/07-capa-http-unica.md).
3. **Reseteo seguro**: Si un componente depende de un reporte o dato municipal específico, agregar un watcher para resetearlo a `null` si el usuario conmuta a un municipio donde ese dato no existe.

---

## 🧪 Comandos de Validación Rápida

Al terminar el ajuste, se ejecuta únicamente la prueba del módulo afectado:

```bash
# Solo pruebas de configuración multi-tenant:
npx vitest run src/stores/__tests__/tenantStore.spec.js

# Solo pruebas del selector de reportes:
npx vitest run src/views/__tests__/RepoView.spec.js

# Solo pruebas de endpoints de reportes:
npx vitest run src/components/__tests__/ReportesEndpoints.spec.js

# Solo pruebas de boletas y formateo:
npx vitest run src/utils/__tests__/boletas.spec.js

# Suite completa de todo el sistema (69 tests):
npm run test:unit
```
