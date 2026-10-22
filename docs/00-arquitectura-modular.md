# Ficha 00: Arquitectura Modular y Guía del Desarrollador

## 1. Filosofía y Objetivo de la Arquitectura

La aplicación `liq-panel` implementa una arquitectura **Modular basada en Dominios (Vertical Slices)**. El objetivo principal es **aislar el contexto de trabajo**, permitiendo modificar, optimizar o agregar funciones en un módulo específico sin necesidad de revisar, cargar o temer regresiones en el resto del proyecto.

### Principios Fundamentales:
* **Alta Cohesión y Bajo Acoplamiento:** Todo lo que pertenece a un mismo concepto de negocio (pantallas, diálogos, llamadas a la API y subrutas) vive en la misma carpeta de módulo.
* **Cero Código Duplicado:** Los componentes UI transversales (confirmaciones, tooltips, selectores de períodos) y el cliente HTTP residen en `@/shared`. No hay proxies ni wrappers: un componente compartido se importa **una sola vez**, desde su barrel.
* **Rutas Descentralizadas:** Cada módulo define sus propias rutas (`routes.js`). El router central (`src/router/index.js`) solo las agrega.
* **Una sola puerta de entrada por dominio:** No existen carpetas de vistas o componentes sueltas (`src/views/`, `src/components/`). Todo el código vive **en un módulo** o **en la capa compartida**; lo único fuera de un módulo es el shell de la app (`src/App.vue`).
* **Las Reglas de Oro se verifican con tests:** `src/shared/__tests__/reglasOro.spec.js` falla el build si alguien reintroduce duplicación, hardcodea configuración transversal o ubica mal un archivo.

---

## 2. Mapa de Directorios (`src/`)

```text
src/
├── App.vue                        # Shell de la app (header, menú, diálogos globales)
├── main.js                        # Punto de entrada: router, pinia, vuetify
│
├── shared/                        # Capa transversal compartida
│   ├── components/                # Componentes UI reutilizables
│   │   ├── ConfirmacionDialog.vue # Diálogo modal de confirmación unificado
│   │   ├── TooltipButton.vue      # Botón de acción con tooltip (ícono + texto)
│   │   ├── LiqInputPanel.vue      # Panel de selección de liquidación, mes y año
│   │   ├── RepoHeader.vue         # Cabecera estándar de reportes y visores
│   │   ├── TenantSelector.vue     # Selector de municipio + cierre de sesión
│   │   ├── DiagnosticDialog.vue   # Diagnóstico de conexión y overrides de entorno
│   │   ├── index.js               # Barrel: ÚNICO punto de entrada a los compartidos
│   │   └── __tests__/             # Tests de los componentes compartidos
│   ├── services/                  # Capa HTTP (ver docs/07-capa-http-unica.md)
│   │   ├── httpClient.js          # Cliente HTTP ÚNICO: único lugar con fetch()
│   │   ├── apiService.js          # Fachada de dominio (leerDatos, ejecutarSP, ...)
│   │   └── __tests__/
│   └── __tests__/                 # Guard arquitectónico (Reglas de Oro)
│
├── modules/                       # Módulos de Dominio (Vertical Slices)
│   ├── inicio/                    # Portada y página "about" (nivel aplicación)
│   │   ├── views/                 # HomeView.vue, AboutView.vue
│   │   └── routes.js              # Rutas: /, /about
│   │
│   ├── acreditaciones/            # Archivos bancarios TXT y control de cuentas
│   │   ├── components/            # ArchAcred, ResumenAcred, ResumenAcredDetalle
│   │   ├── views/                 # AcreditacionView.vue (LiqInputPanel :esley="true")
│   │   ├── __tests__/
│   │   └── routes.js              # Rutas: /acredit, /acred
│   │
│   ├── agentes/                   # Gestión de personal, cargos y legajos
│   │   ├── components/            # PersonasList, CargosList, CargaFamiliarList, ...
│   │   ├── views/                 # AgentesView.vue, CargosView.vue
│   │   ├── __tests__/
│   │   └── routes.js              # Rutas: /agentes, /agentes/cargaf/:personaId, /cargos
│   │
│   ├── auth/                      # Seguridad, inicio de sesión y claves
│   │   ├── components/            # PasswordChange.vue
│   │   ├── views/                 # LoginView.vue, ChangePassword.vue
│   │   └── routes.js              # Rutas: /login, /passchange
│   │
│   ├── ipsst/                     # Obra Social Subsidio de Salud de Tucumán
│   │   ├── components/            # ArchIPSST.vue, ResumenIPSST.vue
│   │   ├── views/                 # IPSSTView.vue
│   │   ├── __tests__/
│   │   └── routes.js              # Rutas: /ipsst, /archivos
│   │
│   ├── liquidaciones/             # Procesamiento mensual y recibos
│   │   ├── components/            # PanelCtrlLiq, LiqBoletas, LiquidacionTable, ...
│   │   ├── views/                 # PanelView, ProcesosView, BoletasView
│   │   └── routes.js              # Rutas: /panel, /procesos, /boletas
│   │
│   ├── novedades/                 # Carga masiva de novedades mensuales por hoja
│   │   ├── components/            # HojasList, NovHaberesList, NovVariasList, ...
│   │   ├── views/                 # HojasView.vue
│   │   └── routes.js              # Rutas: /hojas
│   │
│   ├── previsional/               # Declaraciones juradas previsionales (DDJJ)
│   │   ├── components/            # DDJJMarco, ParametrosDDJJ_List, ...
│   │   ├── views/                 # PrevisionalView.vue
│   │   └── routes.js              # Rutas: /prevision
│   │
│   ├── reportes/                  # Catálogo de planillas y reportes oficiales
│   │   ├── components/            # RepoPlanillaDetLiq, RepoResumenLiq, RepoCod153, ...
│   │   ├── views/                 # RepoView.vue
│   │   ├── __tests__/
│   │   └── routes.js              # Rutas: /repo
│   │
│   └── usuarios/                  # Administración y permisos de usuarios
│       ├── components/            # PanelUsers.vue
│       ├── views/                 # UsersPanelView.vue
│       └── routes.js              # Rutas: /users
│
├── config/                        # Configuración transversal declarative
│   ├── tenants.js                 # Catálogo de municipios (multi-tenant)
│   ├── permisos.js                # Política de datos personales por rol
│   ├── busqueda.js                # Formato del parámetro `search` (repetido | compuesto)
│   └── paginacion.js              # Filas por página y opciones de la grilla
│
├── plugins/
│   └── vuetify.js                 # createAppVuetify(): config compartida app ↔ tests
│
├── composables/                   # Lógica transversal reutilizable
│   ├── useDataTable.js            # Carga de listados con cancelación y descarte de obsoletas
│   ├── useFetch.js                # Listados sobre apiService con cancelación
│   ├── useSpGrabar.js             # Escritura contra Stored Procedures
│   ├── usePII.js                  # Enmascarado de datos personales según el rol
│   ├── useEndPoints.js            # Endpoints y headers por municipio/entorno
│   ├── useItemsMenu.js            # Menú lateral
│   └── useBoletaFileName.js       # Nombre de archivo de boletas
│
├── stores/                        # Stores de Pinia
│   ├── userStore.js               # Sesión, permisos y rol
│   ├── tenantStore.js             # Municipio activo
│   ├── filterStore.js             # Filtros globales (período, liquidación)
│   ├── agentesStore.js            # Persona seleccionada en el módulo de agentes
│   ├── agentesFilterStore.js      # Filtros del módulo de agentes
│   ├── personasStore.js           # Datos de personas
│   ├── liqStore.js / boletaStore.js / logStore.js
│   └── __tests__/
│
├── router/
│   └── index.js                   # Ensamblado de rutas modulares + guard de auth
│
├── utils/                         # Utilidades puras
│   ├── query.js                   # buildQuery / buildSearchValue / parseQueryString
│   ├── permisos.js                # Reglas de enmascarado de PII
│   ├── formatos.js / boletas.js / reportes.js / tipos.js
│   ├── spRespuesta.js             # Interpretación de la respuesta de un SP
│   ├── descargas.js               # Descarga de archivos al navegador (ancla + object URL)
│   ├── reglasValidacion.js
│   └── httpLogger.js              # Log global de fetch (no duplicar logging)
│
└── test/
    └── setup.js                   # Setup global de Vitest (Vuetify + ResizeObserver)
```

> **Nota:** no existen `src/views/` ni `src/components/`. Esos directorios fueron carpetas de transición; sus proxies fueron eliminados y el guard arquitectónico impide que vuelvan.

---

## 3. Guía de Trabajo: Casos Habituales

### Caso A: Modificar una función o pantalla existente
> **Ejemplo:** Ajustar columnas o filtros en el detalle de acreditaciones bancarias.

1. **Abrir únicamente la carpeta del módulo:** `src/modules/acreditaciones/`.
2. Modificar el componente específico (por ejemplo, `components/ResumenAcredDetalle.vue` o `components/ArchAcred.vue`).
3. Para llamadas al backend, utilizar siempre `@/shared/services/apiService`:
   ```javascript
   import { leerDatos, ejecutarSP } from '@/shared/services/apiService'

   const res = await leerDatos('view/cargo', { query: { Documento: '123' } })
   if (res.operacionOk) {
     // res.datos
   }
   ```
4. **Verificar:** Ejecutar las pruebas unitarias, el lint y el build:
   ```bash
   npm run test:unit
   npm run lint
   npm run build
   ```

---

### Caso B: Crear un nuevo Módulo desde cero
> **Ejemplo:** Crear un módulo nuevo llamado `legajos`.

#### Paso 1: Crear la estructura de carpetas
```bash
mkdir -p src/modules/legajos/components
mkdir -p src/modules/legajos/views
mkdir -p src/modules/legajos/__tests__
```

#### Paso 2: Crear la vista principal
En `src/modules/legajos/views/LegajosView.vue`:
```vue
<script setup>
import { ref } from 'vue'
// Los componentes transversales se importan del barrel, nunca por ruta directa.
import { ConfirmacionDialog, TooltipButton } from '@/shared/components'
</script>

<template>
  <v-container>
    <v-row class="bg-primary pa-2 rounded-t">
      <h3>Módulo de Legajos</h3>
    </v-row>
    <!-- Contenido del módulo -->
  </v-container>
</template>
```

#### Paso 3: Definir el archivo de rutas del módulo
En `src/modules/legajos/routes.js`:
```javascript
export const legajosRoutes = [
  {
    path: '/legajos',
    name: 'legajos',
    component: () => import('./views/LegajosView.vue')
  }
]
```

#### Paso 4: Registrar las rutas en el Router central
En [`src/router/index.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/router/index.js):
```javascript
import { legajosRoutes } from '@/modules/legajos/routes'

// En el array routes:
routes: [
  ...inicioRoutes,
  ...authRoutes,
  // ...otros módulos...
  ...legajosRoutes
]
```

#### Paso 5: Agregar el acceso en el menú lateral (opcional)
Editar [`src/composables/useItemsMenu.js`](file:///Users/jferreyradev/projects/ag/liq-panel/src/composables/useItemsMenu.js) agregando el nuevo ítem:
```javascript
{
  title: 'Legajos',
  icon: 'mdi-folder-account',
  to: '/legajos'
}
```

---

### Caso C: Agregar un componente transversal
> **Ejemplo:** un diálogo de confirmación específico de liquidaciones que se usa en tres módulos.

1. Verificar primero si **ya existe** algo parecido en `src/shared/components/`. Reutilizar siempre es preferible a duplicar.
2. Si no existe, crear el componente en `src/shared/components/NuevoComponente.vue`.
3. Exportarlo **una sola vez** en el barrel `src/shared/components/index.js`.
4. Importarlo en los módulos como `import { NuevoComponente } from '@/shared/components'`.
5. Si es un componente con comportamiento reutilizable, agregar su test en `src/shared/components/__tests__/`.

> Prohibido: importarlo por ruta directa (`@/shared/components/NuevoComponente.vue`), crear un alias local con otro nombre o envolverlo en un componente propio. El guard arquitectónico falla en los tres casos.

---

### Caso D: Exponer datos personales (PII) en una grilla
> **Ejemplo:** agregar el número de documento a la lista de cargos.

1. Consultar la política de roles en `src/config/permisos.js` (`ROLES_RESTRINGIDOS`).
2. Usar el composable en la vista:
   ```javascript
   import { usePII } from '@/composables/usePII'

   const { documento, cuil, vePII } = usePII()
   ```
   y aplicarlo en la presentación: `{{ documento(item.DOCUMENTO) }}`.
3. Aplicar el enmascarado **solo** en la presentación; el dato original sigue viajando intacto hacia la grilla para que la exportación Excel no se degrade.

---

## 4. Convenciones y Reglas de Oro

1. **¿Qué va en `src/shared/` vs en un módulo?**
   * **En `src/shared/`:** Componentes o utilidades agnósticas utilizadas por dos o más módulos que no dependen de la lógica de negocio de uno solo (ej. `TooltipButton`, `TenantSelector`, formateadores de moneda, selectores genéricos).
   * **En `src/modules/<modulo>/`:** Componentes, diálogos, vistas y helpers que resuelven una necesidad particular de ese dominio.
   * **Fuera de un módulo:** solo `src/App.vue` (el shell de la app).
2. **Cliente HTTP (capa única):**
   * Todo el tráfico HTTP sale por **un único punto**: `@/shared/services/httpClient.js`. Es el único archivo del proyecto que llama a `fetch()`. El test-guard `src/shared/services/__tests__/capaHttpUnica.spec.js` falla si alguien vuelve a llamar a `fetch()` desde otro lado.
   * `@/shared/services/apiService.js` es la **fachada de dominio** sobre ese cliente (`leerDatos`, `grabarRegistro`, `eliminarRegistro`, `ejecutarSP`, `ejecutarSP_SinEspera`, `ejecutarSPStream`, `descargaTXT`, `descargaArchivo`, `descargaBuffer`). La política de negocio vive ahí; el transporte, en el cliente.
   * Los **módulos nunca importan `httpClient`**: hablan con la fachada. El guard arquitectónico lo verifica.
   * No importar `useEndPoints` ni concatenar strings de URL manualmente en cada archivo. Resolver URLs con `service` + `path`:
     * `base` → `{apiBase}/api/{path}` · `sp` → `{apiSp}/{path}` · `boletas` → `{apiBoletas}/{path}` (sin `/api/`).
   * Todo request tiene **timeout por defecto de 30 s** y devuelve una respuesta normalizada: `{ estado, operacionOk, errmsg, datos, notFound, rawText, response }`.
   * El `AbortError` del llamador se propaga (es una cancelación); el timeout se traduce a error 408. Un 404 en un listado no es un error fatal: `leerDatos` lo marca con `operacionOk = true` y `notFound = true`.
   * Para descargar binarios usar la fachada: `descargaArchivo` (archivos que se descargan al usuario) o `descargaBuffer` (imágenes crudas). Detalle en [`docs/07-capa-http-unica.md`](docs/07-capa-http-unica.md).
   * Para consumir un listado dentro de un componente usar `useFetch` (`@/composables/useFetch.js`), que ya está construido sobre `apiService` y cancela la petición anterior al cambiar el filtro.
   * **Contrato de datos:** las **consultas** van por vistas (`view/*`) y las **escrituras** por Stored Procedures (`sp/*`). Las entidades `/en/*` son CRUD genérico (permiten escrituras que se saltan la lógica de negocio) y no se usan desde el panel. El guard arquitectónico lo verifica; la deuda pendiente está declarada endpoint por endpoint en el test.
3. **Componentes UI Comunes:**
   * Diálogo modal de confirmación: `<ConfirmacionDialog :titulo="..." :mensaje="..." :aceptar="..." :cerrar="..." />`
   * Botón con tooltip: `<TooltipButton :icono="'mdi-pencil'" :toolMsg="'Editar'" :funcion="..." :itemid="..." />`
   * Se importan **siempre desde el barrel** `@/shared/components`. No crear wrappers locales, ni importarlos por ruta directa, ni renombrarlos con un alias.
4. **Listados y query strings (patrones transversales):**
   * Para cargar una grilla usar `useDataTable` de `@/composables/useDataTable.js`. Cancela la petición en vuelo y descarta respuestas obsoletas, evitando que una búsqueda lenta pise el resultado de una más reciente.
   * Para escribir contra un Stored Procedure usar `useSpGrabar` de `@/composables/useSpGrabar.js`. La interpretación del código de error (`vError`, `valorError`, `out.vError`, ...) está centralizada en `@/utils/spRespuesta.js`.
   * Para armar query strings usar `buildQuery` / `buildSearchValue` de `@/utils/query.js`. Codifica los valores y evita que un dato del usuario inyecte parámetros extra en la URL.
   * El estado de los filtros de una pantalla va en un store de Pinia (ej. `@/stores/agentesFilterStore.js`), nunca en closures improvisadas creadas dentro de la vista.
   * **El formato del parámetro `search` no se define en el componente:** vive en `src/config/busqueda.js` (`MODO_BUSQUEDA`: `REPETIDO` vigente, `COMPUESTO` disponible). Un componente que arme el `search` a mano queda atado al contrato actual.
   * **La paginación de las grillas no se define en el componente:** vive en `src/config/paginacion.js` y se aplica como default de Vuetify (`src/plugins/vuetify.js`). El contrato server-side está declarado en `PAGINACION_SERVER` pero **deshabilitado** hasta confirmar los nombres de parámetro con el backend.
5. **Datos personales por rol (PII):**
   * La política vive en `src/config/permisos.js` y las reglas en `@/utils/permisos.js`. Se aplica con el composable `@/composables/usePII.js`.
   * `ROLES_RESTRINGIDOS` está **vacío por defecto**: el comportamiento actual del sistema se mantiene intacto hasta que el negocio defina qué roles no pueden ver documento y CUIL.
   * Sin sesión iniciada, el perfil efectivo es **RESTRINGIDO**.
   * Se enmascaran **documento y CUIL**; el nombre y el apellido no se enmascaran. La **exportación Excel no se enmascara** (el archivo se genera con el dato real).
6. **Navegación por rutas:**
   * Cada módulo declara sus rutas en su `routes.js`; `src/router/index.js` solo las agrega y aplica el guard de autenticación.
   * Los parámetros de ruta son la fuente de verdad: `/agentes/cargaf/:personaId` carga la persona en `@/stores/agentesStore.js` y la vista reacciona a ese store.
7. **Preservar la salud del repositorio:**
   * Siempre ejecutar `npm run test:unit` antes de hacer un commit o push.
   * Ejecutar `npm run build` para asegurar que las importaciones dinámicas y los chunks de Vite se resuelvan correctamente.
   * Ejecutar `npm run lint` para detectar errores reales (variables sin usar, referencias inexistentes, sintaxis inválida). No reformatea el código: el formato del proyecto no es el de Prettier por defecto, así que la regla `prettier/prettier` está desactivada. Para aplicar correcciones automáticas de estilo usar `npm run lint:fix`.
   * Las reglas `vue/prop-name-casing`, `vue/attribute-hyphenation` y `vue/require-prop-types` están desactivadas a propósito. Los props con mayúscula inicial (`Registro`, `Hoja`) son parte del contrato con los componentes padre: Vue 3 los resuelve con `camelize(key)`, así que renombrarlos o kebab-casearlos rompe el binding. No reactivarlas sin corregir antes el contrato completo.
8. **Guard arquitectónico (`src/shared/__tests__/reglasOro.spec.js`):**
   Las reglas anteriores no dependen de la buena voluntad: el build las verifica. Hoy controla 15 cosas:

   | Regla | Qué impide |
   |---|---|
   | Wrappers locales de componentes compartidos | Un `.vue` que solo re-renderiza un componente del barrel |
   | Importación por ruta directa del barrel | `@/shared/components/X.vue` en lugar de `@/shared/components` |
   | Alias local de componente compartido | `import boton from ".../TooltipButton.vue"` |
   | Barrel sin duplicados | Exportar dos veces el mismo componente |
   | Componente compartido fuera del barrel | Un `.vue` en `src/shared/components/` que nadie puede importar |
   | Vistas en carpetas sueltas | Que vuelvan `src/views/` o `src/components/` |
   | Vistas que solo re-renderizan | Un proxy de la vista de un módulo |
   | Código muerto en los módulos | Componentes que nadie alcanza desde las rutas del módulo |
   | Módulos hablando con el transporte crudo | Un módulo que importe `httpClient` en vez de la fachada |
   | Alias de la fachada de API | Un `llamadaAPI.js` que re-exporta `apiService` |
   | Archivos que solo re-exportan | Aliases muertos tipo `stores/user.js` |
   | Paginación hardcodeada | `items-per-page` en un componente |
   | `search` hardcodeado | Armar el parámetro a mano en un componente |
   | Tests fuera de su zona | Un test en `shared/` que prueba un módulo (o al revés) |
   | Contrato de datos (vistas y SPs) | Que vuelvan las consultas por entidad `/en` o las escrituras REST por entidad |

   La regla de código muerto recorre el grafo de imports de cada módulo desde
   sus rutas y descarta lo que nadie alcanza. Por eso, un componente que
   queda huérfano (porque su consumidor se borró) no puede sobrevivir: el
   build avisa.

   Si una regla nueva hace falta, se agrega como un `it(...)` más en ese archivo, con su comentario explicando **por qué** (el porqué es lo que la mantiene viva).
