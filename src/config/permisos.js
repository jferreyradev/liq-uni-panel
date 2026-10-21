/**
 * Configuracion central de permisos y proteccion de datos personales.
 *
 * Todo lo que dependa del rol del usuario se decide desde aca. Si hay que
 * cambiar que ve cada rol, se cambia en este archivo y no en los componentes.
 *
 * Contexto: la app expone listados de agentes con documento (DNI) y CUIL.
 * El backend devuelve el dato completo siempre; quien decide que se muestre
 * es el frontend, asi que la politica tiene que estar en un solo lugar y ser
 * explicita.
 */

/**
 * Roles conocidos.
 *
 * El backend envia el rol como numero en `user.ROL`. El unico valor
 * documentado en el codigo es el de administrador (5), que ya era el criterio
 * del getter `isAdmin` de `userStore`.
 */
export const ROLES = {
  ADMINISTRADOR: 5,
};

/**
 * Perfiles de acceso a datos personales.
 */
export const PERFILES = {
  /** Puede ver los datos sin enmascarar. */
  COMPLETO: "COMPLETO",
  /** Los datos sensibles se muestran enmascarados. */
  RESTRINGIDO: "RESTRINGIDO",
};

/**
 * Perfil asignado a los roles que nofiguraron explicitamente.
 *
 * COMPLETO conserva el comportamiento actual de la aplicacion: los listados
 * muestran el DNI y el CUIL. Si un rol debe verlos enmascarados, se agrega
 * su numero a `ROLES_RESTRINGIDOS`.
 */
export const PERFIL_POR_DEFECTO = PERFILES.COMPLETO;

/**
 * Roles con perfil restringido: ven los datos sensibles enmascarados.
 *
 * Ejemplo: `[1, 2]` -> los roles 1 y 2 ven "****5678" en lugar del DNI.
 */
export const ROLES_RESTRINGIDOS = [];

/**
 * Campos considered datos personales sensibles y como se enmascaran.
 *
 * `visibles` es cuantos caracteres del final se dejan a la vista; el resto
 * se reemplaza por `caracter`.
 */
export const CAMPOS_SENSIBLES = {
  DOCUMENTO: { visibles: 3, caracter: "*" },
  CUIL: { visibles: 2, caracter: "*" },
};
