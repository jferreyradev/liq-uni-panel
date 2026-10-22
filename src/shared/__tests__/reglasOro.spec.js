// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'

/**
 * Guard de arquitectura: las Reglas de Oro del proyecto, verificadas por tests.
 *
 * Las reglas dejan de depender de la buena voluntad y pasan a ser una red de
 * seguridad: si alguien reintroduce la duplicacion, el build se entera.
 *
 * Contexto: en la unificacion de la capa HTTP aparecieron 20+ archivos que
 * re-exportaban o envolvian componentes compartidos. Todos tenian cero
 * consumers reales (sus unicos consumidores eran los propios tests, que
 * probaban a traves de la indireccion y no del componente que se shippea).
 */

const BARREL = 'src/shared/components/index.js'
const DIR_COMPARTIDOS = 'src/shared/components'

/** Ultimo segmento de una ruta. */
function basename(ruta) {
  return ruta.split('/').pop()
}

// Se leen los fuentes crudos de todo el proyecto.
const fuentesCrudos = import.meta.glob('/src/**/*.{js,vue}', {
  eager: true,
  query: '?raw',
  import: 'default',
})

// Las claves de import.meta.glob vienen con "/" inicial: se normalizan.
const fuentes = Object.fromEntries(
  Object.entries(fuentesCrudos).map(([ruta, contenido]) => [ruta.replace(/^\//, ''), contenido])
)

/** Archivos que forman parte de la capa compartida (no son ofensores). */
function esCapaCompartida(ruta) {
  return ruta.startsWith('src/shared/')
}

/** Codigo de produccion (los tests pueden romper reglas a proposito). */
function esCodigoDeProduccion(ruta) {
  return !ruta.includes('__tests__') && !/\.spec\.js$/.test(ruta)
}

/**
 * Resuelve un spec de import a una ruta del proyecto.
 * @returns {string|null} ruta normalizada, o null si no es resoluble.
 */
function resolverRuta(rutaOrigen, spec) {
  if (spec.startsWith('@/')) return `src/${spec.slice(2)}`
  if (!spec.startsWith('.')) return null

  const partes = rutaOrigen.split('/').slice(0, -1)
  for (const parte of spec.split('/')) {
    if (parte === '.' || parte === '') continue
    if (parte === '..') partes.pop()
    else partes.push(parte)
  }
  return partes.join('/')
}

/** ¿La ruta resuelta apunta al barrel de componentes compartidos? */
function esBarrel(rutaResuelta) {
  return rutaResuelta === DIR_COMPARTIDOS
}

/** ¿La ruta resuelta apunta a un componente compartido (barrel o archivo)? */
function esComponenteCompartido(rutaResuelta) {
  return esBarrel(rutaResuelta) || rutaResuelta.startsWith(`${DIR_COMPARTIDOS}/`)
}

/**
 * Zona de pertenencia de un archivo: la carpeta que lo contiene, sin la parte
 * `__tests__` ni `components`. Define "el mismo lugar".
 *
 *   src/modules/reportes/__tests__/x.spec.js -> src/modules/reportes
 *   src/modules/reportes/components/R.vue    -> src/modules/reportes
 *   src/shared/components/__tests__/x.spec.js -> src/shared
 *   src/shared/components/RepoHeader.vue     -> src/shared
 */
function zonaDe(ruta) {
  const partes = ruta.split('/')
  const sinTests = partes.filter((p) => p !== '__tests__')

  const indiceModulo = sinTests.indexOf('modules')
  if (indiceModulo !== -1 && sinTests[indiceModulo + 1]) {
    return `src/modules/${sinTests[indiceModulo + 1]}`
  }

  const raiz = sinTests[1]
  if (!raiz || raiz === 'modules') return null
  return `src/${raiz}`
}

/**
 * Extrae los import de un archivo .vue/.js.
 * @returns {Array<{spec: string, nombre: string|null, alias: string|null}>}
 */
function extraerImports(contenido) {
  const encontrados = []
  const regex = /import\s+([^'"]*?)\s*from\s*['"]([^'"]+)['"]/g
  let match

  while ((match = regex.exec(contenido)) !== null) {
    const [, vinculacion, spec] = match
    const specCompleto = spec.trim()

    // import { A, B } from '...'
    const conLlaves = vinculacion.match(/\{([^}]*)\}/)
    if (conLlaves) {
      for (const parte of conLlaves[1].split(',')) {
        const limpio = parte.trim()
        if (!limpio) continue
        const [importado, alias] = limpio.split(/\s+as\s+/).map((p) => p.trim())
        encontrados.push({ spec: specCompleto, nombre: importado, alias: alias || null })
      }
      continue
    }

    // import X from '...'  (con o sin alias)
    const simple = vinculacion.replace(/,/g, ' ').trim().split(/\s+/)[0]
    if (!simple || simple === '*' || simple === 'type') continue

    const conAlias = vinculacion.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/)
    encontrados.push({
      spec: specCompleto,
      nombre: conAlias ? conAlias[2] : simple,
      alias: conAlias ? conAlias[1] : null,
    })
  }

  return encontrados
}

/**
 * Extrae las rutas de los import dinamicos: `import('./views/X.vue')`.
 * Las rutas de los modulos se cargan asi, asi que son parte del grafo.
 *
 * @returns {string[]}
 */
function extraerImportsDinamicos(contenido) {
  const specs = []
  const regex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  let match

  while ((match = regex.exec(contenido)) !== null) {
    specs.push(match[1])
  }

  return specs
}

/**
 * Indica si un archivo .vue es un wrapper pasacables de un componente
 * compartido: re-renderiza el componente compartido y no tiene logica propia.
 *
 * Un consumidor legitimo (una vista que usa <RepoHeader> junto a su grilla)
 * queda descartado porque su template usa otras etiquetas.
 */
function esWrapperDeCompartido(contenido, nombresCompartidos) {
  const etiquetas = [...contenido.matchAll(/<([A-Za-z][\w.-]*)/g)].map((m) => m[1])

  const toleradas = new Set(['template', 'script', 'style', 'slot'])
  const otras = etiquetas.filter(
    (etiqueta) => !toleradas.has(etiqueta) && !nombresCompartidos.includes(etiqueta)
  )
  if (otras.length > 0) return false

  // Sin logica propia: nada de funciones, refs, watchers ni promesas.
  return !/(function\s+\w+|=>|\bref\(|\bcomputed\(|\bwatch\(|\bawait\b)/.test(contenido)
}

/** ¿La ruta resuelta apunta a la vista de un modulo? */
function esVistaDeModulo(rutaResuelta) {
  return /^src\/modules\/[^/]+\/views\//.test(rutaResuelta)
}

describe('Reglas de Oro de arquitectura', () => {
  describe('componentes transversales', () => {
    it('no existen wrappers locales de componentes compartidos', () => {
      // Un wrapper no aporta nada: el componente compartido ya se puede
      // importar directo. Solo genera ruido y una segunda API que mantener.
      const duplicados = []

      for (const [ruta, contenido] of Object.entries(fuentes)) {
        if (!esCodigoDeProduccion(ruta)) continue
        if (esCapaCompartida(ruta)) continue
        if (!ruta.endsWith('.vue')) continue

        const compartidos = extraerImports(contenido)
          .map((i) => ({ ...i, destino: resolverRuta(ruta, i.spec) }))
          .filter((i) => i.destino && esComponenteCompartido(i.destino))

        if (compartidos.length === 0) continue

        const nombres = compartidos.map((i) => i.nombre).filter(Boolean)
        if (nombres.length === 0) continue

        if (esWrapperDeCompartido(contenido, nombres)) duplicados.push(ruta)
      }

      expect(duplicados).toEqual([])
    })

    it('los componentes compartidos se importan desde el barrel, no por ruta directa', () => {
      const ofensores = []

      for (const [ruta, contenido] of Object.entries(fuentes)) {
        if (!esCodigoDeProduccion(ruta)) continue
        if (ruta === BARREL) continue
        if (esCapaCompartida(ruta)) continue

        for (const imp of extraerImports(contenido)) {
          const destino = resolverRuta(ruta, imp.spec)
          if (!destino || !esComponenteCompartido(destino)) continue
          if (esBarrel(destino)) continue
          ofensores.push(`${ruta} -> ${imp.spec}`)
        }
      }

      expect(ofensores).toEqual([])
    })

    it('no se importan componentes compartidos con un alias local distinto', () => {
      // `import botonTooltip from ".../TooltipButton.vue"` obliga a que cada
      // vista use un nombre distinto para el mismo componente.
      const ofensores = []

      for (const [ruta, contenido] of Object.entries(fuentes)) {
        if (!esCodigoDeProduccion(ruta)) continue
        if (esCapaCompartida(ruta)) continue

        for (const imp of extraerImports(contenido)) {
          const destino = resolverRuta(ruta, imp.spec)
          if (!destino || !esComponenteCompartido(destino)) continue
          if (!imp.alias) continue
          if (imp.alias === imp.nombre) continue
          ofensores.push(`${ruta}: ${imp.nombre} como ${imp.alias}`)
        }
      }

      expect(ofensores).toEqual([])
    })

    it('el barrel expone cada componente compartido una sola vez', () => {
      const contenido = fuentes[BARREL]
      expect(contenido).toBeTypeOf('string')

      const exports = [...contenido.matchAll(/export\s*\{[^}]*\bas\s+(\w+)\s*\}/g)].map((m) => m[1])
      const duplicados = exports.filter((nombre, i) => exports.indexOf(nombre) !== i)

      expect(duplicados).toEqual([])
    })
  })

  describe('ubicacion de las vistas', () => {
    it('las vistas viven en un modulo, no en carpetas sueltas', () => {
      // `src/views/` y `src/components/` fueron carpetas de transito: cada
      // modulo trae sus propias vistas y los componentes transversales estan
      // en `src/shared/components`. Lo unico fuera de un modulo es el shell
      // de la app (App.vue).
      const ofensores = []

      for (const ruta of Object.keys(fuentes)) {
        if (!ruta.endsWith('.vue')) continue
        if (ruta.startsWith('src/modules/')) continue
        if (ruta.startsWith('src/shared/')) continue
        if (ruta === 'src/App.vue') continue
        ofensores.push(ruta)
      }

      expect(ofensores).toEqual([])
    })

    it('ninguna vista se limita a re-renderizar la vista de un modulo', () => {
      // Un proxy de vista no aporta nada: la vista real ya se importa
      // directo desde el modulo que la expone. Solo multiplica rutas y
      // deja que dos vistas parezcan distintas cuando son la misma.
      const ofensores = []

      for (const [ruta, contenido] of Object.entries(fuentes)) {
        if (!esCodigoDeProduccion(ruta)) continue
        if (!ruta.endsWith('.vue')) continue

        const importadas = extraerImports(contenido)
          .map((i) => ({ ...i, destino: resolverRuta(ruta, i.spec) }))
          .filter((i) => i.destino && esVistaDeModulo(i.destino))

        if (importadas.length === 0) continue

        const nombres = importadas.map((i) => i.nombre).filter(Boolean)
        if (nombres.length === 0) continue

        if (esWrapperDeCompartido(contenido, nombres)) ofensores.push(ruta)
      }

      expect(ofensores).toEqual([])
    })

    it('no hay codigo muerto dentro de los modulos', () => {
      // Se recorre el grafo de imports de cada modulo desde sus rutas (su
      // puerta de entrada) y se sigue hasta las vistas y los componentes.
      // Un archivo que nadie alcanza es codigo muerto: no lo usa ni la app
      // ni el router, y por lo tanto nadie lo mantiene.
      const ofensores = []

      const modulos = new Set()
      for (const ruta of Object.keys(fuentes)) {
        const coincidencia = /^src\/modules\/([^/]+)\//.exec(ruta)
        if (coincidencia) modulos.add(coincidencia[1])
      }

      for (const modulo of modulos) {
        const prefijo = `src/modules/${modulo}/`
        const delModulo = Object.keys(fuentes).filter((ruta) => ruta.startsWith(prefijo))

        // Raices: las rutas del modulo (declaradas por el router) y sus tests.
        const raices = delModulo.filter(
          (ruta) => ruta.endsWith('/routes.js') || ruta.includes('__tests__')
        )

        const alcanzables = new Set()
        const pila = [...raices]

        while (pila.length > 0) {
          const actual = pila.pop()
          if (alcanzables.has(actual)) continue
          alcanzables.add(actual)

          const contenido = fuentes[actual]
          if (!contenido) continue

          const specs = [
            ...extraerImports(contenido).map((i) => i.spec),
            ...extraerImportsDinamicos(contenido),
          ]

          for (const spec of specs) {
            const destino = resolverRuta(actual, spec)
            if (!destino || !destino.startsWith(prefijo)) continue
            if (!fuentes[destino]) continue
            pila.push(destino)
          }
        }

        for (const ruta of delModulo) {
          if (ruta.includes('__tests__')) continue
          if (alcanzables.has(ruta)) continue
          ofensores.push(ruta)
        }
      }

      expect(ofensores).toEqual([])
    })

    it('todo componente compartido esta exportado por el barrel', () => {
      // Si un componente compartido no sale por el barrel, nadie lo importa
      // (el barrel es la unica puerta): queda huerfano.
      const barrel = fuentes[BARREL]
      const ofensores = []

      for (const ruta of Object.keys(fuentes)) {
        if (!ruta.startsWith(`${DIR_COMPARTIDOS}/`)) continue
        if (!ruta.endsWith('.vue')) continue
        if (!barrel.includes(basename(ruta))) ofensores.push(ruta)
      }

      expect(ofensores).toEqual([])
    })
  })

  describe('capa de servicios', () => {
    it('los modulos hablan con la fachada, no con el transporte crudo', () => {
      // `httpClient.js` es el transporte (unico lugar con fetch()). Los
      // modulos deben pasar por `apiService.js`, que es donde vive la
      // politica de dominio. Importar el transporte crudo desde un modulo
      // permite saltarse esa politica sin que nadie lo note.
      const ofensores = []

      for (const [ruta, contenido] of Object.entries(fuentes)) {
        if (!esCodigoDeProduccion(ruta)) continue
        if (!ruta.startsWith('src/modules/')) continue

        for (const imp of extraerImports(contenido)) {
          const destino = resolverRuta(ruta, imp.spec)
          if (!destino) continue
          if (destino !== 'src/shared/services/httpClient') continue
          ofensores.push(`${ruta} -> ${imp.spec}`)
        }
      }

      expect(ofensores).toEqual([])
    })

    it('no existen alias de la fachada de API en los modulos', () => {
      // Un `llamadaAPI.js` que re-exporta `apiService` es una indireccion
      // que esconde de que capa depende el modulo.
      const ofensores = []

      for (const [ruta, contenido] of Object.entries(fuentes)) {
        if (!esCodigoDeProduccion(ruta)) continue
        if (!ruta.endsWith('.js')) continue
        if (ruta.startsWith('src/shared/')) continue

        const esAlias = /export\s+\*\s+from\s+['"]@\/shared\/services\/apiService['"]/.test(contenido)
        if (esAlias) ofensores.push(ruta)
      }

      expect(ofensores).toEqual([])
    })

    it('no existen archivos que solo re-exportan otro archivo del proyecto', () => {
      // Un archivo que unicamente re-exporta otro es una indireccion: obliga
      // a resolver dos rutas para llegar al codigo real y multiplica las
      // APIs posibles. El unico barrel permitido es el de componentes
      // compartidos.
      const ofensores = []

      for (const [ruta, contenido] of Object.entries(fuentes)) {
        if (!esCodigoDeProduccion(ruta)) continue
        if (!ruta.endsWith('.js')) continue
        if (ruta === BARREL) continue

        // Se ignoran comentarios y lineas en blanco.
        const codigo = contenido
          .split('\n')
          .map((linea) => linea.trim())
          .filter((linea) => linea && !linea.startsWith('//') && !linea.startsWith('*') && !linea.startsWith('/*'))
          .join('\n')

        const soloReExporta =
          /^export\s+.*\s+from\s+['"][^'"]+['"];?$/.test(codigo) ||
          /^export\s+\*\s+from\s+['"][^'"]+['"];?$/.test(codigo)

        if (soloReExporta) ofensores.push(ruta)
      }

      expect(ofensores).toEqual([])
    })
  })

  describe('configuracion central', () => {
    it('la paginacion de las grillas no se define en los componentes', () => {
      // La cantidad de filas por pagina se define una sola vez, como default
      // de Vuetify (src/config/paginacion.js). Antes cada grilla declaraba su
      // propia (10, 15 o 20) y ninguna dejaba cambiarla.
      const ofensores = []

      for (const [ruta, contenido] of Object.entries(fuentes)) {
        if (!esCodigoDeProduccion(ruta)) continue
        if (!ruta.endsWith('.vue')) continue
        if (/:?items-per-page\s*=/.test(contenido)) ofensores.push(ruta)
      }

      expect(ofensores).toEqual([])
    })

    it('el formato del parametro "search" no se define en los componentes', () => {
      // El formato (repetido o compuesto) vive en src/config/busqueda.js.
      // Un componente que arme el "search" a mano se queda atado al contrato
      // vigente y no puede cambiar sin tocar todos los filtros.
      const ofensores = []

      for (const [ruta, contenido] of Object.entries(fuentes)) {
        if (!esCodigoDeProduccion(ruta)) continue
        if (!ruta.endsWith('.vue')) continue
        if (/["'`]\s*search\s*[:=]/.test(contenido) && !/buildQuery|buildSearchValue/.test(contenido)) {
          ofensores.push(ruta)
        }
      }

      expect(ofensores).toEqual([])
    })
  })

  describe('organizacion de tests', () => {
    it('un test vive junto al componente que prueba', () => {
      // Un test en src/shared/ que importa un componente de
      // src/modules/<modulo>/ hace que el modulo parezca cubierto cuando no
      // lo esta: el test pasa mientras el componente real queda sin probar.
      const ofensores = []

      for (const [ruta, contenido] of Object.entries(fuentes)) {
        if (!/\.spec\.js$/.test(ruta)) continue

        const zonaDelTest = zonaDe(ruta)
        if (!zonaDelTest) continue

        for (const imp of extraerImports(contenido)) {
          if (!imp.spec.endsWith('.vue')) continue

          const destino = resolverRuta(ruta, imp.spec)
          if (!destino) continue

          const zonaDelComponente = zonaDe(destino)
          if (!zonaDelComponente) continue
          if (zonaDelComponente === zonaDelTest) continue

          ofensores.push(`${ruta} prueba ${destino} (deberia estar en ${zonaDelComponente})`)
        }
      }

      expect(ofensores).toEqual([])
    })
  })
})
