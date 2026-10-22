# Documento de Migración y Unificación — `liq-panel`

Este documento detalla el proceso técnico, arquitectónico y operativo realizado para unificar los cuatro paneles de liquidación municipales en un único código base moderno, mantenible y escalable.

---

## 1. Contexto Inicial y Diagnóstico

Con anterioridad a esta migración, el sistema se encontraba dividido en cuatro repositorios/proyectos frontend independientes:

| Proyecto Original | Municipio Destino | `x-project-key` | Puerto API | Particularidades |
| :--- | :--- | :--- | :--- | :--- |
| `front-liq-concepcion` | Concepción | `concecpcion` | `3007` | Módulo de Acreditación modularizado, pruebas unitarias de boletas. |
| `front-liq-burruyacu` | Burruyacú | `Burru` | `3003` | Descarga de boletas con indicador de progreso (`loading`), pruebas IPSST. |
| `front-liq-tafiviejo` | Tafí Viejo | `tafiviejo` | `3007` | Cliente HTTP centralizado (`useApiClient`), filtros con parámetro de Ley. |
| `front-liq-trancas` | Trancas | `ServerTrancas` | `3005` | Versión inicial con generación de PDF y reportes históricos. |

### Problemas Detectados
1. **Divergencia de Código**: Correcciones de errores o nuevas pantallas agregadas en un municipio no se propagaban a los demás.
2. **Cuadruplicación de Mantenimiento**: Cada actualización de dependencias, estilos o lógica de cálculo requería replicar el trabajo en 4 proyectos separados.
3. **Falta de Multi-Tenant**: Un operador o administrador que gestionara varios municipios debía abrir múltiples pestañas o instancias independientes.
4. **Constantes Fijas en Importación**: Varios componentes evaluaban URLs y encabezados en la carga del script, impidiendo cambios dinámicos en tiempo de ejecución.

---

## 2. Estrategia y Objetivos de la Unificación

1. **Código Base Único**: Consolidar toda la lógica en el proyecto `liq-panel` bajo **Vue 3**, **Vuetify 3**, **Pinia** y **Vite**.
2. **Multi-Tenant Reactivo**: Permitir alternar entre municipios desde un menú desplegable en la barra superior sin recargar la aplicación ni perder el estado de navegación.
3. **Superset de Funcionalidades**: Asegurar que ninguna funcionalidad, vista o reporte existente en cualquiera de los 4 proyectos quedara fuera de la versión unificada.
4. **Resiliencia de Conexión**: Crear clientes HTTP dinámicos que inyecten los encabezados y URLs correspondientes al municipio activo en cada petición.
5. **Branding Dinámico**: Actualizar logotipos, títulos, pie de página y escudos en los recibos de sueldo en PDF según el municipio seleccionado.

---

## 3. Arquitectura del Sistema Unificado

```mermaid
flowchart TD
    subgraph UI ["Capa de Presentación (liq-panel)"]
        Nav["App Bar (Navbar)"]
        Sel["TenantSelector.vue (Concepción / Burruyacú / Tafí Viejo / Trancas)"]
        Env["Env Toggle (Prod / Desa)"]
        Views["Vistas (Agentes, Novedades, Liq, Boletas, Reportes, etc.)"]
        
        Nav --> Sel
        Nav --> Env
    end

    subgraph Stores ["Gestión de Estado (Pinia)"]
        TS["tenantStore (activeTenant, persistencia localStorage)"]
        FS["filterStore (Período, tipo liq, ley, config servidor)"]
        US["userStore (Autenticación, roles, menús)"]
        BS["boletaStore (Generación PDF y datos de boleta)"]
        LS["liqStore (Liquidaciones e ítems)"]
        
        Sel -->|setTenant(id)| TS
        TS -->|Refresca config| FS
    end

    subgraph API ["Capa de Comunicación HTTP"]
        EP["useEndPoints (Resuelve URLs y encabezados x-project-key / port)"]
        HC["httpClient.js (ÚNICO fetch() del proyecto)"]
        AS["apiService.js (fachada de dominio)"]

        TS -->|Reactividad| EP
        EP --> HC
        HC --> AS
    end

    subgraph Backend ["Servicios Backend / Proxy"]
        Proxy["Proxy API (Deno / Cloudflare)"]
        B1["Backend Concepción (:3007)"]
        B2["Backend Burruyacú (:3003)"]
        B3["Backend Tafí Viejo (:3007)"]
        B4["Backend Trancas (:3005)"]

        AS -->|HTTP Request con Headers Dinámicos| Proxy
        Proxy --> B1
        Proxy --> B2
        Proxy --> B3
        Proxy --> B4
    end
```

---

## 4. Componentes y Módulos Migrados

### 4.1. Configuración Multi-Tenant
- **`src/config/tenants.js`**: Define el catálogo de municipios, sus claves (`projectKey`), puertos (`projectPort`), colores temáticos, logotipos y endpoints para `Prod` y `Desa`.
- **`src/stores/tenantStore.js`**: Almacena el municipio activo, sincronizado con `localStorage` (`liq_tenant_id`). Provee getters como `tenantKey`, `tenantPort`, `tenantName`, `tenantLogo` y `boletaLogo`.
- **`src/shared/components/TenantSelector.vue`**: Selector desplegable con avatares y metadatos de cada municipio ubicado en la barra de navegación principal.

### 4.2. Clientes HTTP y Endpoints Reactivos
- **`src/composables/useEndPoints.js`**:
  - `buildApiHeaders()` y `getBoletasHeaders()` obtienen en tiempo real la clave y el puerto del municipio activo.
  - Soporte para alternar entornos `Prod` y `Desa`.
  - Protección con `getActivePinia()` para prevenir errores de ciclo de vida si es importado antes del montaje de Pinia.
- **`src/shared/services/httpClient.js`**: Cliente HTTP **único** del proyecto. Es el único archivo que llama a `fetch()`, resuelve timeouts (30 s), normaliza la respuesta y traduce los errores. Detalle en [`docs/07-capa-http-unica.md`](docs/07-capa-http-unica.md).
- **`src/shared/services/apiService.js`**: Fachada de dominio sobre el cliente (`leerDatos`, `grabarRegistro`, `eliminarRegistro`, `ejecutarSP`, `descargaTXT`). Todos los módulos hablan con esta capa, no con `fetch()`.
- ~~`useApiClient.js`~~ y ~~`llamadaAPI.js`~~: eliminados. Eran clientes duplicados por módulo, cada uno con su propio manejo de URLs, headers y logging. Hoy no hay un solo `fetch()` fuera de `httpClient.js`, y un test-guard lo verifica.

### 4.3. Módulos Funcionales (Superset)

| Módulo | Componentes Principales | Funcionalidad Unificada |
| :--- | :--- | :--- |
| **Inicio** | `HomeView.vue` | Dashboard con tarjeta del municipio activo, estado de conexión, chips de período/ambiente y accesos directos. |
| **Agentes** | `AgentesView.vue`, `CargosView.vue`, `PersonasList.vue`, `CargaFamiliarList.vue`, `CargosList.vue` | Administración de legajos, datos familiares, cargos y conceptos asignados. |
| **Novedades** | `HojasView.vue`, `HojasList.vue`, `NovAltasList.vue`, `NovHaberesList.vue`, `NovVariasList.vue` | Carga masiva de novedades mensuales por hoja con soporte de edición en línea. |
| **Liquidaciones** | `PanelView.vue`, `ProcesosView.vue`, `PanelCtrlLiq.vue`, `LiquidacionTable.vue`, `LiquidacionItemTable.vue` | Panel de control de liquidación mensual, desglose de ítems liquidados y ejecución de procesos. |
| **Boletas** | `BoletasView.vue`, `LiqBoletas.vue`, `boletaStore.js` | Descarga de boletas en PDF con spinner individual, generación local mediante `pdf-lib` con escudo del municipio, y nomenclatura estándar: `MMYYYY_TIPO_APELLIDO_NOMBRE.pdf`. |
| **Acreditaciones** | `AcreditacionView.vue`, `ArchAcred.vue`, `ResumenAcred.vue`, `ResumenAcredDetalle.vue` | Exportación formal de archivos bancarios TXT + control y resumen de cuentas de acreditación. |
| **Previsional** | `PrevisionalView.vue`, `ArchivosView.vue`, `DDJJMarco.vue`, `ParametrosDDJJ_List.vue`, `ArchIPSST.vue`, `ResumenIPSST.vue` | Generación de Declaraciones Juradas previsionales, parámetros y archivos magnéticos para el IPSST. |
| **Reportes** | `RepoView.vue` + 14 componentes `Repo*.vue` | Colección completa de planillas oficiales con catálogo reactivo por municipio (`allowedReports` en `tenants.js`: Trancas con [1, 2, 4, 5], Concepción/Burruyacú/Tafí con [4, 6..15]) y switch para "Mostrar todos los reportes" (detalle en [REPORTES.md](REPORTES.md)). |
| **Seguridad** | `LoginView.vue`, `UsersPanelView.vue`, `ChangePassword.vue`, `PanelUsers.vue` | Control de acceso por roles, recuperación y cambio de clave, y administración de usuarios. |

---

## 5. Tabla de Equivalencias de Rutas

Todas las rutas anteriores fueron consolidadas en [src/router/index.js](file:///Users/jferreyradev/projects/ag/liq-panel/src/router/index.js), que solo **agrega** las rutas declaradas por cada módulo en su `routes.js`:

| Ruta | Nombre | Componente | Descripción |
| :--- | :--- | :--- | :--- |
| `/` | `home` | `HomeView.vue` | Portada y dashboard general |
| `/panel` | `panel` | `PanelView.vue` | Consulta de liquidaciones e ítems |
| `/boletas` | `boletas` | `BoletasView.vue` | Recibos de sueldo y descargas PDF |
| `/agentes` | `agentes` | `AgentesView.vue` | Personal y cargas familiares |
| `/agentes/cargaf/:personaId` | `agentes-cargaf` | `AgentesView.vue` | Carga familiar de una persona (la URL la describe) |
| `/cargos` | `cargos` | `CargosView.vue` | Cargos y conceptos |
| `/hojas` | `hojas` | `HojasView.vue` | Gestión de hojas y novedades |
| `/procesos` | `procesos` | `ProcesosView.vue` | Panel de control de procesos |
| `/acredit` | `acredit` | `AcreditacionView.vue` | Acreditaciones bancarias (TXT y resumen) |
| `/acred` | `acreditaciones` | `AcreditacionView.vue` | Alias de `/acredit` |
| `/prevision`| `prevision`| `PrevisionalView.vue` | DDJJ y parámetros previsionales |
| `/ipsst` | `ipsst` | `IPSSTView.vue` | Resumen y archivos magnéticos IPSST |
| `/archivos` | `archivos` | `IPSSTView.vue` | Archivos magnéticos IPSST |
| `/repo` | `reportes` | `RepoView.vue` | 14 planillas y reportes oficiales |
| `/users` | `users` | `UsersPanelView.vue` | Administración de usuarios |
| `/passchange`| `passchange`| `ChangePassword.vue` | Cambio de contraseña |
| `/login` | `login` | `LoginView.vue` | Acceso al sistema |

---

## 6. Pruebas y Validación de Calidad

El proyecto unificado cuenta con una suite automatizada de pruebas unitarias con **Vitest**:

```bash
npx vitest run
```

### Resultados de la Validación:
- **266 pruebas unitarias ejecutadas**: 266 aprobadas (100%), en 33 archivos.
  - `src/stores/__tests__/tenantStore.spec.js`: Valida inicialización de tenant, cambio de municipio, actualización de keys/puertos y reactividad de encabezados HTTP.
  - `src/utils/__tests__/boletas.spec.js`: Valida normalización de caracteres, tildes, códigos de liquidación (MEN, ADI, SAC) y formateo de períodos.
  - `src/utils/__tests__/formatos.spec.js`: Valida generación de nombres de PDF y normalización de textos.
  - `src/composables/__tests__/useBoletaFileName.spec.js`: Valida extracción y generación de nombres de boletas.
  - `src/modules/ipsst/__tests__/ResumenIPSST.spec.js`: Valida llamadas seguras y paso de encabezados en componentes.
  - `src/shared/__tests__/reglasOro.spec.js`: Guard arquitectónico (15 reglas: sin duplicación, sin wrappers, barrel único, configuración centralizada, sin código muerto, módulos hablando con la fachada).
  - `src/shared/services/__tests__/capaHttpUnica.spec.js`: Verifica que no exista un segundo cliente HTTP.

### Compilación para Producción:
```bash
npm run build
```
- Compilación limpia con Vite en **~2.7s**. El bundle se parte por librería (`manualChunks`): el chunk de la app queda en ~65 kB y ninguno supera el aviso de 500 kB.

---

## 7. Instrucciones para Desarrolladores

### Cómo agregar un nuevo Municipio a futuro
1. Abrir `src/config/tenants.js`.
2. Agregar la nueva entrada en el arreglo `TENANTS`:
   ```javascript
   {
     id: 'nuevomunicipio',
     name: 'Municipalidad de Nuevo Municipio',
     shortName: 'Nuevo Municipio',
     location: 'Nuevo Municipio - Tucumán',
     projectKey: 'KeyDelBackend',
     projectPort: '3009',
     logo: logoNuevo,
     boletaLogo: logoNuevo,
     themeColor: '#0288D1',
     endpoints: { ...DEFAULT_ENDPOINTS }
   }
   ```
3. Colocar el logo en `src/assets/tenants/` e importarlo.
4. El selector del Navbar, las llamadas API y la generación de recibos PDF reconocerán automáticamente el nuevo municipio sin requerir ninguna modificación en las vistas o componentes.
