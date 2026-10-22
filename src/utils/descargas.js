/**
 * Utilidades para disparar la descarga de un archivo al navegador.
 *
 * El mismo bloque "crear un <a>, clickearla y liberar la object URL" estaba
 * copiado en los componentes de IPSST, acreditaciones y boletas. Acá vive una
 * sola vez, con la salvedad de liberar la URL con un retardo: si se revoca en
 * el mismo tick del click, algunos navegadores cancelan la descarga antes de
 * que empiece.
 */

/**
 * Dispara la descarga de un recurso ya disponible como object URL.
 *
 * @param {string} url object URL del recurso
 * @param {string} nombreArchivo nombre con el que se descarga
 * @returns {boolean} true si se pudo disparar la descarga
 */
export function descargarDesdeUrl(url, nombreArchivo) {
  if (!url) return false

  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  a.remove()

  setTimeout(() => {
    window.URL.revokeObjectURL(url)
  }, 1000)

  return true
}

/**
 * Dispara la descarga de un Blob (por ejemplo, un TXT armado en el cliente).
 *
 * @param {Blob} blob contenido a descargar
 * @param {string} nombreArchivo nombre con el que se descarga
 * @returns {boolean} true si se pudo disparar la descarga
 */
export function descargarDesdeBlob(blob, nombreArchivo) {
  if (!blob) return false
  return descargarDesdeUrl(window.URL.createObjectURL(blob), nombreArchivo)
}
