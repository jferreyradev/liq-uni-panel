/* eslint-env node */
/**
 * Configuración de ESLint del proyecto.
 *
 * Usa el sistema clásico (.eslintrc) porque el proyecto está en ESLint 8.
 * Las dependencias ya estaban instaladas en package.json; faltaba únicamente
 * este archivo, por eso `npm run lint` fallaba con "Parsing error".
 *
 * Nota sobre Prettier: el código del proyecto usa comillas simples y omite
 * punto y coma, lo contrario a la configuración por defecto de Prettier. Por eso
 * se desactiva la regla `prettier/prettier` (que reportaba ~4500 avisos de
 * formato y, con `--fix`, reformateaba el proyecto entero). Se mantiene
 * `@vue/eslint-config-prettier` para apagar las reglas de ESLint que chocan
 * con cualquier formateador. `npm run format` sigue siendo la herramienta
 * explícita de formato.
 */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  extends: ['eslint:recommended', 'plugin:vue/vue3-recommended', '@vue/eslint-config-prettier'],
  rules: {
    // El estilo del proyecto (comillas simples, sin punto y coma) no es el de
    // Prettier por defecto: se deja el formato fuera del alcance de ESLint.
    'prettier/prettier': 'off',
    // El diagnóstico del proyecto (httpLogger y los stores) deja traza a
    // propósito: se permiten los console en todo el código.
    'no-console': ['warn', { allow: ['warn', 'error', 'log', 'info', 'debug'] }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    'vue/multi-word-component-names': 'off',
    'vue/require-default-prop': 'off',
    // Reglas de formato: las maneja el formateador, no ESLint
    'vue/max-attributes-per-line': 'off',
    'vue/singleline-html-element-content-newline': 'off',

    // --- Reglas desactivadas a propósito -------------------------------
    // Los props se declaran como array sin tipo en todo el proyecto. Tiparlos
    // uno por uno es un cambio invasivo y con riesgo de advertencias de Vue
    // cuando el valor real no coincide con el tipo declarado.
    'vue/require-prop-types': 'off',
    // Los props con mayúscula inicial (`Registro`, `Hoja`) forman parte del
    // contrato con los componentes padre. Vue 3 resuelve los props con
    // `camelize(key)`, así que renombrar la declaración a `registro` haría que
    // `:Registro` dejara de coincidir y el binding se pierde.
    'vue/prop-name-casing': 'off',
    // Por la misma razón no se kebab-casean los atributos: `:Registro` debe
    // seguir exactamente como lo declara el hijo.
    'vue/attribute-hyphenation': 'off'
  },
  overrides: [
    {
      // La capa de diagnostico existe para imprimir en la consola:
      // es parte de su contrato, no un descuido.
      files: ['src/utils/httpLogger.js', 'src/stores/logStore.js'],
      rules: {
        'no-console': 'off'
      }
    },
    {
      files: ['**/__tests__/**/*.{js,spec.js}', '**/*.spec.js'],
      env: { node: true },
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly'
      }
    }
  ],
  ignorePatterns: ['dist/', 'node_modules/', '*.min.js']
}
