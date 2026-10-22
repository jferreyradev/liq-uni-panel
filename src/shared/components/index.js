/**
 * Barrel de componentes compartidos.
 *
 * Punto de entrada único para los componentes transversales del proyecto.
 * Los módulos NO deben re-exportar ni envolver estos componentes: se importan
 * desde acá. El test-guard `src/shared/__tests__/reglasOro.spec.js` falla si
 * vuelve a aparecer un wrapper local.
 */
export { default as ConfirmacionDialog } from "./ConfirmacionDialog.vue";
export { default as TooltipButton } from "./TooltipButton.vue";
export { default as RepoHeader } from "./RepoHeader.vue";
export { default as LiqInputPanel } from "./LiqInputPanel.vue";
export { default as TenantSelector } from "./TenantSelector.vue";
export { default as DiagnosticDialog } from "./DiagnosticDialog.vue";
