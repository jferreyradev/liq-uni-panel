# Ficha 00: Arquitectura Modular y Guía del Desarrollador

## 1. Filosofía y Objetivo de la Arquitectura

La aplicación `liq-panel` implementa una arquitectura **Modular basada en Dominios (Vertical Slices)**. El objetivo principal es **aislar el contexto de trabajo**, permitiendo modificar, optimizar o agregar funciones en un módulo específico sin necesidad de revisar, cargar o temer regresiones en el resto del proyecto.

### Principios Fundamentales:
* **Alta Cohesión y Bajo Acoplamiento:** Todo lo que pertenece a un mismo concepto de negocio (pantallas, diálogos, llamadas a la API y subrutas) vive en la misma carpeta de módulo.
* **Cero Código Duplicado:** Componentes UI transversales (confirmaciones, tooltips, selectores de períodos) y el cliente HTTP residen en `@/shared`.
* **Rutas Descentralizadas:** Cada módulo define sus propias rutas (`routes.js`). El router central (`src/router/index.js`) solo las agrega.
* **Compatibilidad Asegurada:** `src/components/` y `src/views/` mantienen proxies de exportación directa (`export default`) para no romper stubs ni imports heredados.

---

## 2. Mapa de Directorios (`src/`)

```text
src/
├── shared/                     # Capa transversal compartida
│   ├── components/             # Componentes UI reutilizables
│   │   ├── ConfirmacionDialog.vue  # Diálogo modal de confirmación unificado
│   │   ├── TooltipButton.vue       # Botón de acción con tooltip (ícono + texto)
│   │   ├── LiqInputPanel.vue       # Panel de selección de liquidación, mes y año
│   │   ├── RepoHeader.vue          # Cabecera estándar de reportes y visores
│   │   └── index.js                # Barrel export para importación limpia
│   └── services/
│       └── apiService.js       # Cliente HTTP centralizado (leerDatos, ejecutarSP, etc.)
│
├── modules/                    # Módulos de Dominio (Vertical Slices)
│   ├── acreditaciones/         # Generación de archivos bancarios TXT y control de cuentas
│   │   ├── components/         # AcreditacionBase, AcreditacionesDetalle, AcreditacionTXT, etc.
│   │   ├── views/              # AcreditacionView.vue
│   │   └── routes.js           # Rutas: /acredit, /acred
│   │
│   ├── agentes/                # Gestión de personal, cargos y legajos
│   │   ├── components/         # PersonasList, CargosList, CargaFamiliarList, etc.
│   │   ├── views/              # AgentesView.vue, CargosView.vue
│   │   └── routes.js           # Rutas: /agentes, /cargos
│   │
│   ├── auth/                   # Seguridad, inicio de sesión y claves
│   │   ├── components/         # PasswordChange.vue
│   │   ├── views/              # LoginView.vue, ChangePassword.vue
│   │   └── routes.js           # Rutas: /login, /passchange
│   │
│   ├── ipsst/                  # Obra Social Subsidio de Salud de Tucumán (IPSST)
│   │   ├── components/         # ArchIPSST.vue, ResumenIPSST.vue
│   │   ├── views/              # IPSSTView.vue
│   │   └── routes.js           # Rutas: /ipsst, /archivos
│   │
│   ├── liquidaciones/          # Procesamiento mensual y recibos
│   │   ├── components/         # PanelCtrlLiq, ProcesosList, LiqBoletas, etc.
│   │   ├── views/              # PanelView.vue, ProcesosView.vue, BoletasView.vue
│   │   └── routes.js           # Rutas: /panel, /procesos, /boletas
│   │
│   ├── novedades/              # Carga masiva de novedades mensuales por hoja
│   │   ├── components/         # HojasList, NovHaberesList, NovVariasList, etc.
│   │   ├── views/              # HojasView.vue
│   │   └── routes.js           # Rutas: /hojas
│   │
│   ├── previsional/            # Declaraciones juradas previsionales (DDJJ)
│   │   ├── components/         # DDJJMarco, LiquidacionesDDJJ, ParametrosDDJJ_List, etc.
│   │   ├── views/              # PrevisionalView.vue
│   │   └── routes.js           # Rutas: /prevision
│   │
│   ├── reportes/               # Catálogo de planillas y reportes oficiales
│   │   ├── components/         # RepoPlanillaDetLiq, RepoResumenLiq, RepoCod153, etc.
│   │   ├── views/              # RepoView.vue
│   │   └── routes.js           # Rutas: /repo
│   │
│   └── usuarios/               # Administración y permisos de usuarios del sistema
│       ├── components/         # PanelUsers.vue
│       ├── views/              # UsersPanelView.vue
│       └── routes.js           # Rutas: /users
│
├── config/                     # Catálogo de municipios y configuración global
├── router/
│   └── index.js                # Ensamblado de rutas modular y guards de autenticación
├── stores/                     # Stores globales (userStore, tenantStore, logStore, filterStore)
└── utils/                      # Utilidades puras (formatos, validaciones, logs)
```

---

## 3. Guía de Trabajo: Casos Habituales

### Caso A: Modificar una función o pantalla existente
> **Ejemplo:** Ajustar columnas o filtros en el detalle de acreditaciones bancarias.

1. **Abrir únicamente la carpeta del módulo:** `src/modules/acreditaciones/`.
2. Modificar el componente específico (por ejemplo, `components/AcreditacionesDetalle.vue`).
3. Para llamadas al backend, utilizar siempre `@/shared/services/apiService`:
   ```javascript
   import { leerDatos, ejecutarSP } from '@/shared/services/apiService'
   ```
4. **Verificar:** Ejecutar las pruebas unitarias y el build:
   ```bash
   npm run test:unit
   npm run build
   ```

---

### Caso B: Crear un nuevo Módulo desde cero
> **Ejemplo:** Crear un módulo nuevo llamado `legajos`.

#### Paso 1: Crear la estructura de carpetas
```bash
mkdir -p src/modules/legajos/components
mkdir -p src/modules/legajos/views
```

#### Paso 2: Crear la vista principal
En `src/modules/legajos/views/LegajosView.vue`:
```vue
<script setup>
import { ref } from 'vue'
import ConfirmacionDialog from '@/shared/components/ConfirmacionDialog.vue'
import TooltipButton from '@/shared/components/TooltipButton.vue'
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
  ...baseRoutes,
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

## 4. Convenciones y Reglas de Oro

1. **¿Qué va en `src/shared/` vs en un módulo?**
   * **En `src/shared/`:** Componentes o utilidades agnósticas utilizadas por dos o más módulos que no dependen de la lógica de negocio de uno solo (ej. `TooltipButton`, formateadores de moneda, selectores genéricos).
   * **En `src/modules/<modulo>/`:** Componentes, diálogos, vistas y helpers que resuelven una necesidad particular de ese dominio.
2. **Cliente HTTP:**
   * No importar `useEndPoints` ni concatenar strings de URL manualmente en cada archivo. Usar siempre las funciones exportadas de `@/shared/services/apiService.js` (`leerDatos`, `grabarRegistro`, `eliminarRegistro`, `ejecutarSP`, `ejecutarSPStream`, `descargaTXT`).
3. **Componentes UI Comunes:**
   * Diálogo modal de confirmación: `<ConfirmacionDialog :titulo="..." :mensaje="..." :aceptar="..." :cerrar="..." />`
   * Botón con tooltip: `<TooltipButton :icono="'mdi-pencil'" :toolMsg="'Editar'" :funcion="..." :itemid="..." />`
4. **Preservar la salud del repositorio:**
   * Siempre ejecutar `npm run test:unit` antes de hacer un commit o push.
   * Ejecutar `npm run build` para asegurar que las importaciones dinámicas y los chunks de Vite se resuelvan correctamente.
