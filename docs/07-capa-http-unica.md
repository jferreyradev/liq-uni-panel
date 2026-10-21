# 07 — Capa HTTP única

> Estado: vigente. Última actualización: unificación completa del tráfico HTTP.

## 1. Por qué

Hasta hace poco el proyecto tenía **cuatro capas HTTP conviviendo**:

| Capa | Archivo | Consumidores | Problema principal |
|---|---|---|---|
| A | `shared/services/apiService.js` | los módulos | sin timeout, parseo propio |
| B | `composables/useFetch.js` | ~22 componentes | sin cancelación → carrera de respuestas |
| C | `composables/useApiClient.js` | 1 store | URLs y logging distintos |
| D | `fetch()` directo | 5 stores + 4 componentes | sin manejo de errores unificado |

Consecuencias: ninguna petición tenía timeout (una petición colgada dejaba la UI en
`loading...` para siempre), los errores se interpretaban distinto según el archivo y
las respuestas obsoletas podían pisar a las nuevas.

Hoy queda **un solo punto de salida** para todo el tráfico al backend.

## 2. Arquitectura

```text
componentes / stores / composables
            │
            ├── useFetch ────────┐
            ├── useDataTable ────┤
            ├── useSpGrabar ─────┼──► apiService.js  (fachada de dominio)
            └── (cualquiera) ────┘         │
                                           ▼
                                   httpClient.js  (transporte)
                                           │
                                           ▼
                                     fetch()  ← único punto del proyecto
```

- **`httpClient.js`** — el transporte. Único archivo que llama a `fetch()`. Resuelve URLs,
  aplica headers, impone timeout, parsea el cuerpo e interpreta el error.
- **`apiService.js`** — la fachada de dominio. Mantiene los nombres y las formas de
  retorno que ya usa la app (`leerDatos`, `grabarRegistro`, `eliminarRegistro`,
  `ejecutarSP`, `ejecutarSP_SinEspera`, `ejecutarSPStream`, `descargaTXT`) y la política
  de negocio (por ejemplo, que un 404 en un listado no es un error fatal).

## 3. Resolver URLs

Nunca concatenar la URL a mano ni importar `useEndPoints` en cada archivo. Se usa
`service` + `path`:

| `service` | URL resultante | Uso |
|---|---|---|
| `base` (por defecto) | `{apiBase}/api/{path}` | listados y vistas del API |
| `sp` | `{apiSp}/{path}` | Stored Procedures |
| `boletas` | `{apiBoletas}/{path}` | usuarios, personas, configuración (sin `/api/`) |

```javascript
import { leerDatos } from '@/shared/services/apiService'

const res = await leerDatos('en/cargo', { query: { Documento: '123' } })
// GET {apiBase}/api/en/cargo?Documento=123
```

`leerDatos` también acepta una URL absoluta, que es lo que necesitan los componentes que
arman el endpoint por su cuenta:

```javascript
await leerDatos(`${apiBase.value}/api/view/resumenLiq?${filtro}`)
```

## 4. Respuesta normalizada

```javascript
{
  estado,       // número HTTP (0 si no hubo respuesta, 408 timeout, 999 error de red)
  operacionOk,  // la operación fue exitosa
  errmsg,       // mensaje de error listo para mostrar
  datos,        // cuerpo parseado (según responseType)
  notFound,     // la respuesta fue un 404
  rawText,      // cuerpo crudo (truncado) para detallar el error
  response      // el Response original
}
```

Reglas:

- **Timeout**: 30 s por defecto. Se puede cambiar con `{ timeout }` o desactivarlo con `0`.
  Al vencer, la respuesta es `estado: 408`.
- **`AbortError` del llamador se propaga**: es una cancelación, no un error. Sirve para
  abortar la petición anterior cuando cambia un filtro.
- **404 en listados**: `leerDatos` devuelve `operacionOk: true` y `notFound: true`, con
  `datos: null`. Quien lo consuma puede mostrar una lista vacía.
- **Errores de red**: `estado: 999`, `errmsg: 'Error en la Red'`.

## 5. Descargas y binarios

```javascript
import { request } from '@/shared/services/httpClient'

const res = await request({
  service: 'base',
  path: 'boleta',
  query: { IdLiq: 42 },
  responseType: 'blob'
})
```

`responseType` acepta `json` (por defecto), `text`, `blob`, `arraybuffer` y `raw`.

## 6. Componentes: `useFetch`

`useFetch` mantiene su API pública (`data`, `error`, `isPending`) para no obligar a tocar
los ~22 componentes que lo usan, pero por debajo ya pasa por el cliente único:

- cancela la petición anterior cuando cambia el filtro y **descarta las respuestas
  obsoletas** (esto elimina la carrera de respuestas);
- impone el timeout por defecto;
- **muestra los errores del servidor** en lugar de silenciarlos como una lista vacía;
- un 404 sigue siendo una lista vacía, igual que antes.

```javascript
const { data, error, isPending } = useFetch(() => `${apiBase.value}/api/view/liq?${filtro}`)
```

## 7. Reglas para el equipo

1. **Nunca llamar a `fetch()` directamente.** Todo pasa por `apiService` o `httpClient`.
   El test `src/shared/services/__tests__/capaHttpUnica.spec.js` falla si alguien lo hace.
2. **No reimplementar el parseo de la respuesta.** Usar la respuesta normalizada.
3. **No inventar una cuarta capa.** Si hace falta un endpoint nuevo, se agrega a
   `apiService` (si es de dominio) o se usa `httpClient.request` con `service` + `path`.
4. **No duplicar el logging.** `src/utils/httpLogger.js` intercepta `fetch` globalmente y
   ya deja la traza en la consola y en el `logStore`.
5. **Si una pantalla necesita cancelar**, pasar un `AbortSignal` (`useFetch` y
   `useDataTable` ya lo hacen).

## 8. Comandos de verificación

```bash
npm run test:unit   # incluye el guard de capa HTTP única
npm run build
```
