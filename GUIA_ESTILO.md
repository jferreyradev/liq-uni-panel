# Guía de Estilo Visual y UI para Proyectos Satélites

Esta guía define los **estándares visuales, paleta de colores, tipografías y estructura de componentes** del ecosistema de Liquidaciones. Está diseñada para ser **portable y agnóstica**, de modo que puedas replicar la misma interfaz en cualquier framework (Vue, React, Svelte, Angular, Tailwind CSS o CSS puro).

---

## 1. Filosofía de Diseño

- **Institucional y Limpio:** Interfaz sobria, orientada a la gestión pública, planillas salariales y datos sensibles.
- **Alta Densidad y Legibilidad:** Tablas compactas, jerarquía visual clara y números monetarios alineados a la derecha con fuentes legibles.
- **Identidad Dinámica por Municipio:** Mismo esqueleto de interfaz, pero adaptando el color primario y el logotipo según el municipio activo.

---

## 2. Paleta de Colores (Design Tokens)

### 2.1. Colores Institucionales por Municipio / Entorno
Cada satélite o contexto adopta un color primario distintivo:

| Municipio / Entorno | Color HEX | Color Nombre | Uso Principal |
| :--- | :--- | :--- | :--- |
| **Concepción** | `#1976D2` | Azul Institucional | Barra superior, botones primarios, enlaces activos |
| **Burruyacú** | `#2E7D32` | Verde Bosque | Barra superior, acentos, botones primarios |
| **Tafí Viejo** | `#00838F` | Cian / Teal Oscuro | Barra superior, acentos, botones primarios |
| **Trancas** | `#6A1B9A` | Púrpura | Barra superior, acentos, botones primarios |
| **Desarrollo** | `#7C4DFF` | Violeta Intenso | Entorno de pruebas, barra superior, tags |

### 2.2. Colores Semánticos (Estados)
Aplicables en cualquier framework para alertas, chips y validaciones:

| Estado | HEX | Uso |
| :--- | :--- | :--- |
| **Éxito (Success)** | `#2E7D32` (fondo suave: `#E8F5E9`) | Conexión activa a BD, guardado OK, validado |
| **Alerta (Warning)** | `#FB8C00` (fondo suave: `#FFF3E0`) | Advertencias, período no cerrado, valores pendientes |
| **Error / Peligro** | `#D32F2F` (fondo suave: `#FFEBEE`) | Error de conexión, validación fallida, anular |
| **Información (Info)** | `#0288D1` (fondo suave: `#E1F5FE`) | Mensajes informativos, tips de ayuda |

### 2.3. Fondos y Superficies (Modo Claro)
- **Fondo de la Aplicación (`body` / `main`):** `#F5F5F5` (gris muy claro, reduce el cansancio visual).
- **Fondo de Tarjetas y Tablas (`surface`):** `#FFFFFF` (blanco puro con bordes o sombras sutiles).
- **Bordes y Separadores:** `#E0E0E0` (1px sólido).
- **Textos:**
  - Principal: `#212121` (alto contraste).
  - Secundario / Metadatos: `#757575` (medio contraste).

---

## 3. Tipografía

- **Familia tipográfica principal:** `Roboto`, `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`.
- **Familia monoespaciada (montos, períodos, códigos, CUIT):** `ui-monospace`, `SFMono-Regular`, `Consolas`, `monospace`.

### Escala Tipográfica:
- **Título de Pantalla / Barra:** `1.125rem` (18px) a `1.25rem` (20px) — Peso: `700` (Bold).
- **Títulos de Sección / Tarjeta:** `1rem` (16px) — Peso: `600` (Semi-bold).
- **Texto General / Inputs:** `0.875rem` (14px) — Peso: `400` (Regular).
- **Etiquetas, Chips y Metadatos:** `0.75rem` (12px) — Peso: `500` (Medium).
- **Importes en Tablas:** `0.875rem` (14px) monoespaciado, alineado a la derecha.

---

## 4. Estructura de Layout Estándar (Blueprint)

Cualquier proyecto satélite debe estructurarse con este esquema de 3 o 4 zonas:

```text
+-------------------------------------------------------------------+
|  [Logo] Liquidación — [Nombre Municipio]      [Tema] [Usuario]    | <- Header (Color Municipio)
+-------------------------------------------------------------------+
| [Sidebar] | [Dashboard / Formulario / Tabla]                      |
| (Opcional)|                                                       | <- Contenido (Fondo #F5F5F5)
|           | Tarjeta en fondo blanco con bordes redondeados (8px)  |
+-------------------------------------------------------------------+
| 2026 — [Municipio] • [Localidad] | BD: [Conexión activa]          | <- Footer (Gris claro)
+-------------------------------------------------------------------+
```

1. **Header (Barra Superior):**
   - Altura: `56px` a `64px`.
   - Fondo: Color del municipio activo (`#1976D2`, `#2E7D32`, etc.) con texto en blanco.
   - Izquierda: Avatar / Logo (`36x36px`) + Título del sistema.
   - Derecha: Acciones secundarias (Tema claro/oscuro, Diagnóstico, Menú de usuario).
2. **Área de Contenido Principal:**
   - Fondo `#F5F5F5`.
   - Tarjetas (`Cards`) con fondo blanco (`#FFFFFF`), `border-radius: 8px` y sombra suave (`box-shadow: 0 2px 4px rgba(0,0,0,0.08)`).
3. **Pie de Página (Footer):**
   - Altura: `36px` a `44px`.
   - Fondo `#EEEEEE`, borde superior `1px solid #E0E0E0`, texto centrado tamaño `12px` (caption).

---

## 5. Componentes Clave y Convenciones de Estilo

### 5.1. Botones
- **Radio de borde:** `4px` o `6px`.
- **Botón Primario:** Fondo del color institucional, texto blanco, sombra sutil.
- **Botón Secundario / Tonal:** Mismo tono institucional pero con opacidad del 15% de fondo y texto del color pleno.
- **Botón Contorno (Outlined):** Borde de 1px del color del municipio, fondo transparente.

### 5.2. Tablas de Datos (Planillas Salariales)
- **Densidad compacta:** Altura de fila de `36px` a `40px` (para visualizar muchas filas sin scroll excesivo).
- **Cabeceras:** Fondo gris claro (`#FAFAFA`), texto en negrita y en mayúsculas pequeñas.
- **Celdas Numéricas / Importes:** Siempre alineadas a la derecha con clase monoespaciada (`font-family: monospace`).
- **Filas alternadas:** Hover con fondo `#F5F5F5` para guiar la lectura.

### 5.3. Chips / Badges de Estado
- Altura: `20px` a `24px`.
- Forma: Píldora (`border-radius: 12px` o `16px`).
- Texto: `11px` o `12px` en negrita.

---

## 6. Variables CSS Listas para Usar (Copia y Pega)

Puedes incluir estas variables en el archivo CSS global de cualquier proyecto satélite:

```css
:root {
  /* Tipografía */
  --font-main: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;

  /* Superficies y Fondos */
  --bg-app: #F5F5F5;
  --bg-surface: #FFFFFF;
  --border-color: #E0E0E0;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Textos */
  --text-primary: #212121;
  --text-secondary: #757575;

  /* Estados */
  --color-success: #2E7D32;
  --color-warning: #FB8C00;
  --color-error: #D32F2F;
  --color-info: #0288D1;

  /* Municipio Activo (Cambiar esta variable según el satélite) */
  --color-primary: #1976D2; /* Concepción por defecto */
}

/* Clases utilitarias básicas */
.app-header {
  background-color: var(--color-primary);
  color: #FFFFFF;
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.app-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.table-amount {
  font-family: var(--font-mono);
  text-align: right;
  font-weight: 500;
}
```

---

## 7. Equivalencia para Tailwind CSS (si usas Tailwind en otros satélites)

Si algún proyecto satélite utiliza Tailwind, puedes agregar esto a su `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        municipio: {
          concepcion: '#1976D2',
          burruyacu: '#2E7D32',
          tafiviejo: '#00838F',
          trancas: '#6A1B9A',
          desarrollo: '#7C4DFF',
        }
      },
      borderRadius: {
        'card': '8px',
      }
    }
  }
}
```
