import { useEndPoints } from '@/composables/useEndPoints'

function getUrlApi() {
  const { apiBase } = useEndPoints()
  return `${apiBase.value}/api/`
}

function getUrlApiSp() {
  const { apiSp } = useEndPoints()
  return `${apiSp.value}/`
}

function getHeaders(extraHeaders = {}) {
  const { getBoletasHeaders } = useEndPoints()
  return getBoletasHeaders(extraHeaders)
}

export async function grabarRegistro(url = '', data = {}, metodo = 'POST') {
  let estado = 0
  let operacionOk = false
  let errmsg = ''
  let datos = null
  try {
    const response = await fetch(getUrlApi() + url, {
      method: metodo,
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
        ...getHeaders()
      },
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify(data)
    })
    estado = response.status
    operacionOk = response.ok
    if (response.ok) {
      datos = await response.json()
    } else {
      errmsg = 'Error al intentar grabar el registro'
    }
  } catch (error) {
    estado = 999
    operacionOk = false
    errmsg = 'Error en la Red'
    datos = null
  }
  return { estado, operacionOk, errmsg, datos }
}

export async function eliminarRegistro(url = '', metodo = 'DELETE') {
  let estado = 0
  let operacionOk = false
  let errmsg = ''
  let datos = null
  try {
    const response = await fetch(getUrlApi() + url, {
      method: metodo,
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        ...getHeaders()
      }
    })
    estado = response.status
    operacionOk = response.ok
    if (response.ok) {
      datos = await response.json()
    } else {
      errmsg = 'Error al intentar eliminar el registro'
    }
  } catch (error) {
    estado = 999
    operacionOk = false
    errmsg = 'Error en la Red'
    datos = null
  }
  return { estado, operacionOk, errmsg, datos }
}

export async function leerDatos(url = '') {
  let estado = 0
  let operacionOk = false
  let errmsg = ''
  let datos = null
  let response = null
  try {
    response = await fetch(getUrlApi() + url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getHeaders()
      }
    })
    estado = response.status

    if (response.ok) {
      datos = await response.json()
      operacionOk = true
    } else {
      errmsg = 'Error al intentar leer los datos'
      operacionOk = false
    }
  } catch (error) {
    estado = 999
    operacionOk = false
    errmsg = 'Error en la Red'
    datos = null
  }
  return { estado, operacionOk, errmsg, datos }
}

export async function ejecutarSP(url = '', data = {}, metodo = 'POST') {
  let estado = 0
  let operacionOk = false
  let valorSalida = 0
  let errorMsg = ''
  let datos = null
  console.log('dirección: ', getUrlApiSp() + url)

  try {
    const response = await fetch(getUrlApiSp() + url, {
      method: metodo,
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...getHeaders()
      },
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify(data)
    })
    estado = response.status
    operacionOk = response.ok
    if (response.ok) {
      datos = await response.json()
    } else {
      errorMsg = 'Error al intentar ejecutar el proceso'
    }
  } catch (error) {
    estado = 999
    operacionOk = false
    errorMsg = 'Error en la Red'
    datos = null
  }
  return { estado, operacionOk, errorMsg, datos, valorSalida }
}

export const ejecutaSP = ejecutarSP
