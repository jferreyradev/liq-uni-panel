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
| Dónde vive un archivo, cómo se agrega un módulo o componente transversal | [`docs/00-arquitectura-modular.md`](docs/00-arquitectura-modular.md) |
| Claves, puertos, logos, URLs o alta de municipios | [`docs/01-multi-tenant-y-endpoints.md`](docs/01-multi-tenant-y-endpoints.md) |
| Reportes, columnas, filtros Excel o reportes permitidos | [`docs/02-reportes.md`](docs/02-reportes.md) y [`REPORTES.md`](REPORTES.md) |
| Recibos en PDF, diseño local con `pdf-lib` o nombres | [`docs/03-boletas-y-recibos.md`](docs/03-boletas-y-recibos.md) |
| Panel de liquidación, totales, renglones o SPs batch | [`docs/04-liquidaciones-y-procesos.md`](docs/04-liquidaciones-y-procesos.md) |
| Novedades mensuales, grilla editable, legajos o cargos | [`docs/05-novedades-y-agentes.md`](docs/05-novedades-y-agentes.md) |
| Exportación TXT bancario, control de cuentas o DDJJ IPSST | [`docs/06-acreditaciones-y-prevision.md`](docs/06-acreditaciones-y-prevision.md) |
| Llamadas al backend, timeouts, errores de red o logging HTTP | [`docs/07-capa-http-unica.md`](docs/07-capa-http-unica.md) |

---

## 🗂️ Mapa del Código (`src/`)

Todo el código vive **en un módulo** (`src/modules/<dominio>/`) o **en la capa compartida** (`src/shared/`). No existen `src/views/` ni `src/components/`: cada módulo trae sus vistas y sus componentes, y los transversales están en `src/shared/components/` (importados desde su barrel).

```text
src/
├── App.vue / main.js              # Shell y arranque
├── shared/                        # Transversal: componentes (barrel) + capa HTTP
├── modules/                       # Dominios: inicio, agentes, auth, liquidaciones,
│                                  #   novedades, reportes, previsional, ipsst,
│                                  #   acreditaciones, usuarios
├── config/                        # tenants, permisos, busqueda, paginacion
├── composables/                   # useFetch, useDataTable, usePII, useSpGrabar, ...
├── stores/                        # Pinia: user, tenant, filter, agentes, ...
├── plugins/vuetify.js             # Config de Vuetify compartida entre app y tests
├── router/index.js                # Ensamblado de rutas modulares + guard de auth
├── utils/                         # query, permisos, formatos, spRespuesta, ...
└── test/setup.js                  # Setup global de Vitest
```

Detalle completo y reglas en [`docs/00-arquitectura-modular.md`](docs/00-arquitectura-modular.md).

---

## ⚙️ Reglas de Oro del Código

1. **Pinia seguro**: No instanciar `useTenantStore()` o `useEndPoints()` en el ámbito raíz de archivos `.js`. Siempre dentro de funciones o en `setup()`.
2. **Capa HTTP única**: Todo el tráfico al backend sale por `@/shared/services/httpClient.js` (el único archivo con `fetch()`), a través de la fachada `@/shared/services/apiService.js`. Nunca llamar a `fetch()` directamente; hay un test-guard que lo detecta. Detalle en [`docs/07-capa-http-unica.md`](docs/07-capa-http-unica.md).
3. **Reseteo seguro**: Si un componente depende de un reporte o dato municipal específico, agregar un watcher para resetearlo a `null` si el usuario conmuta a un municipio donde ese dato no existe.
4. **Sin duplicación**: No crear vistas ni componentes "de paso" fuera de un módulo. Los componentes transversales van a `src/shared/components/` y se importan **desde el barrel** (`@/shared/components`), nunca por ruta directa ni con alias. El guard arquitectónico (`src/shared/__tests__/reglasOro.spec.js`) falla si esto se rompe.
5. **Configuración centralizada**: el formato del parámetro `search` (`src/config/busqueda.js`), las filas por página (`src/config/paginacion.js`) y la política de datos personales (`src/config/permisos.js`) no se hardcodean en los componentes.
6. **Tests junto al código**: el test de un componente vive en el `__tests__/` de su propia zona (módulo o `shared/`) e importa el componente real, no un proxy.

---

## 🧪 Comandos de Validación Rápida

Al terminar el ajuste, se ejecuta la prueba del módulo afectado:

```bash
# Guard arquitectónico (Reglas de Oro):
npx vitest run src/shared/__tests__/reglasOro.spec.js

# Capa HTTP única:
npx vitest run src/shared/services/__tests__/capaHttpUnica.spec.js

# Pruebas de configuración multi-tenant:
npx vitest run src/stores/__tests__/tenantStore.spec.js

# Pruebas de reportes:
npx vitest run src/modules/reportes/__tests__/

# Pruebas de agentes (vistas, filtros y PII):
npx vitest run src/modules/agentes/__tests__/

# Pruebas de boletas y formateo:
npx vitest run src/utils/__tests__/boletas.spec.js

# Suite completa de todo el sistema (250 tests):
npm run test:unit

# Lint (solo errores reales; no reformatea el código):
npm run lint

# Build de producción (verifica imports y chunks):
npm run build
```

> Nota: las reglas de props (`vue/prop-name-casing`, `vue/attribute-hyphenation`, `vue/require-prop-types`) están desactivadas a propósito. Los props con mayúscula inicial (`Registro`, `Hoja`) son parte del contrato con los componentes padre y renombrarlos rompe el binding. Ver [`docs/00-arquitectura-modular.md`](docs/00-arquitectura-modular.md).
