# Panel de Liquidación Unificado (liq-panel)

Panel de administración y liquidación de haberes desarrollado con **Vue 3**, **Vuetify 3**, **Pinia** y **Vite**.

Este proyecto consolida los paneles municipales de:
- **Municipalidad de Concepción** (`x-project-key: concecpcion`, puerto `3007`)
- **Municipalidad de Burruyacú** (`x-project-key: Burru`, puerto `3003`)
- **Municipalidad de Tafí Viejo** (`x-project-key: tafiviejo`, puerto `3007`)
- **Municipalidad de Trancas** (`x-project-key: ServerTrancas`, puerto `3005`)

---

## 🚀 Características Principales

1. **Arquitectura Multi-Tenant Reactiva**:
   - Conmutador en el Navbar para alternar entre municipios sin recargar la aplicación.
   - Inyección automática y reactiva de encabezados HTTP (`x-project-key`, `x-project-port`) en todas las llamadas API.
   - Branding dinámico en pantalla (títulos, escudo/logo, pie de página).
   - Estampado automático del escudo/logo municipal en los recibos de sueldo en PDF descargados o generados.
   - Persistencia de la selección de municipio en `localStorage`.

2. **Superset Completo de Módulos**:
   - **Inicio / Dashboard**: Resumen del municipio activo, estado de ambiente, período y acceso a módulos.
   - **Agentes**: Legajos, personas, cargas familiares, cargos y conceptos asignados.
   - **Novedades**: Hojas de novedades mensuales, novedades varias, haberes y altas.
   - **Liquidaciones y Procesos**: Panel principal con selector de período/tipo/adicional, detalle por agente y panel de control de procesos.
   - **Boletas de Sueldo**: Visor de recibos, descarga con indicador de progreso por ítem, generación en cliente (`pdf-lib`) o servidor, y nomenclatura normalizada (`MMYYYY_TIPO_APELLIDO_NOMBRE.pdf`).
   - **Acreditaciones**: Generación de archivos TXT bancarios, consulta de detalle y resumen de cuentas.
   - **Previsional**: Declaraciones Juradas, configuración de parámetros y archivos para el IPSST.
   - **Reportes**: Colección completa de planillas oficiales con catálogo reactivo por municipio y switch global (consulte la especificación detallada en [REPORTES.md](REPORTES.md)).
   - **Usuarios y Seguridad**: Login, cambio de clave y administración de roles.

Para conocer la arquitectura completa del proyecto y el proceso de migración, consulte [MIGRACION.md](MIGRACION.md).  
Para trabajar de forma ágil por módulos sin reanalizar todo el proyecto, consulte [INSTRUCTIVO.md](INSTRUCTIVO.md) e [INSTRUCCIONES.md](INSTRUCCIONES.md).

3. **Conmutación de Entorno (Prod / Desa)**:
   - Para usuarios administradores, alternancia entre servidores de Producción y Desarrollo con endpoints reactivos.

---

## 🛠️ Instalación y Desarrollo

### Requisitos
- Node.js >= 18 (probado en Node v26)
- pnpm o npm

### Iniciar entorno de desarrollo
```bash
npm run dev
# o con pnpm
pnpm dev
```

### Ejecutar suite de pruebas unitarias
```bash
npm run test:unit
```

### Compilar para producción
```bash
npm run build
```

---

## 📂 Estructura del Proyecto

```
src/
├── assets/             # Estilos CSS, logos generales y por municipio (tenants/)
├── components/         # Componentes organizados por dominio
│   ├── Acreditacion/   # TXT bancario y generaciones
│   ├── Agentes/        # Personas, cargos, familiares
│   ├── EjecProcesos/   # Panel de control de liquidación
│   ├── Novedades/      # Hojas y novedades
│   ├── Previsional/    # DDJJ e IPSST
│   └── TenantSelector.vue # Conmutador multi-tenant
├── composables/        # useApiClient, useEndPoints, useFetch, useItemsMenu
├── config/             # tenants.js (definición de municipios y endpoints)
├── layouts/            # AppLayout y SidebarLayout
├── router/             # Vue Router con guards de autenticación
├── stores/             # Pinia: tenantStore, userStore, filterStore, liqStore, etc.
├── utils/              # Boletas, formatos, validaciones, reportes
└── views/              # Vistas principales del sistema
```
