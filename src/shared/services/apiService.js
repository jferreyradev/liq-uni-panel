import { useEndPoints } from "@/composables/useEndPoints";

function getUrlApi() {
  const { apiBase } = useEndPoints();
  return `${apiBase.value}/api/`;
}

function getUrlApiSp() {
  const { apiSp } = useEndPoints();
  return `${apiSp.value}/`;
}

function getHeaders(extraHeaders = {}) {
  const { getBoletasHeaders } = useEndPoints();
  return getBoletasHeaders(extraHeaders);
}

export async function grabarRegistro(url = "", data = {}, metodo = "POST") {
  let estado = 0;
  let operacionOk = false;
  let errmsg = "";
  let datos = null;
  try {
    const response = await fetch(getUrlApi() + url, {
      method: metodo,
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
        ...getHeaders(),
      },
      redirect: "follow",
      referrerPolicy: "no-referrer",
      body: JSON.stringify(data),
    });
    estado = response.status;
    operacionOk = response.ok;
    if (response.ok) {
      datos = await response.json();
    } else {
      errmsg = "Error al intentar grabar el registro";
    }
  } catch (error) {
    estado = 999;
    operacionOk = false;
    errmsg = "Error en la Red";
    datos = null;
  }
  return { estado, operacionOk, errmsg, datos };
}

export async function eliminarRegistro(url = "", metodo = "DELETE") {
  let estado = 0;
  let operacionOk = false;
  let errmsg = "";
  let datos = null;
  try {
    const response = await fetch(getUrlApi() + url, {
      method: metodo,
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        ...getHeaders(),
      },
    });
    estado = response.status;
    operacionOk = response.ok;
    if (response.ok) {
      datos = await response.json();
    } else {
      errmsg = "Error al intentar eliminar el registro";
    }
  } catch (error) {
    estado = 999;
    operacionOk = false;
    errmsg = "Error en la Red";
    datos = null;
  }
  return { estado, operacionOk, errmsg, datos };
}

export async function leerDatos(url = "") {
  let estado = 0;
  let operacionOk = false;
  let errmsg = "";
  let datos = null;
  let response = null;
  try {
    response = await fetch(getUrlApi() + url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getHeaders(),
      },
    });
    estado = response.status;
    if (response.ok) {
      datos = await response.json();
      operacionOk = true;
    } else {
      errmsg = "Error al intentar leer los datos";
      operacionOk = response.status === 404;
    }
  } catch (error) {
    estado = 999;
    operacionOk = false;
    errmsg = "Error en la Red";
    datos = null;
  }
  return { estado, operacionOk, errmsg, datos };
}

export async function ejecutarSP(url = "", data = {}, metodo = "POST") {
  let estado = 0;
  let operacionOk = false;
  let errmsg = "";
  let valorError = -1;
  let valorSalida = 0;
  let errorMsg = "";
  let datos = null;
  let out = null;

  try {
    const response = await fetch(getUrlApiSp() + url, {
      method: metodo,
      mode: "cors",
      cache: "no-cache",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...getHeaders(),
      },
      redirect: "follow",
      referrerPolicy: "no-referrer",
      body: JSON.stringify(data),
    });
    estado = response.status;
    operacionOk = response.ok;
    datos = await response.json();
    if (response.ok) {
      const payload = (datos && datos.out) ? datos.out : datos;
      if (payload) {
        valorError = payload.vError !== undefined ? payload.vError : (payload.ValorError !== undefined ? payload.ValorError : (payload.VALORERROR !== undefined ? payload.VALORERROR : 0));
        valorSalida = payload.vSALIDA !== undefined ? payload.vSALIDA : (payload.vSalida !== undefined ? payload.vSalida : (payload.VSALIDA !== undefined ? payload.VSALIDA : 0));
        errorMsg = payload.vErrorMsg || payload.vErrorMsj || payload.errorMsg || payload.ErrorMsg || "";
        out = datos && datos.out ? datos.out : payload;
      }
    } else {
      errmsg = "Error al intentar ejecutar el proceso";
    }
  } catch (error) {
    estado = 999;
    operacionOk = false;
    errmsg = "Error en la Red";
    errorMsg = "Error en la Red";
    datos = null;
  }

  return {
    estado,
    operacionOk,
    errmsg,
    valorError,
    valorSalida,
    errorMsg,
    datos,
    out,
  };
}

export const ejecutaSP = ejecutarSP;

export async function ejecutarSP_SinEspera(
  url = "",
  data = {},
  metodo = "POST",
) {
  let salida = 0;
  let response = null;

  try {
    response = fetch(getUrlApiSp() + url, {
      method: metodo,
      mode: "cors",
      cache: "no-cache",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...getHeaders(),
      },
      redirect: "follow",
      referrerPolicy: "no-referrer",
      body: JSON.stringify(data),
    });
  } catch (error) {
    salida = 1;
  }

  return { response, salida };
}

export async function ejecutarSPStream(url = "", data = {}, metodo = "POST") {
  let estado = 0;
  let operacionOk = false;
  let errmsg = "";
  let datos = null;
  try {
    const response = await fetch(getUrlApiSp() + url, {
      method: metodo,
      mode: "cors",
      cache: "no-cache",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...getHeaders(),
      },
      redirect: "follow",
      referrerPolicy: "no-referrer",
      body: JSON.stringify(data),
    });
    estado = response.status;
    operacionOk = response.ok;
    if (response.ok) {
      const datosr = await response.json();
      datos = datosr?.out?.Cursor;
    } else {
      errmsg = "Error al intentar obtener el stream del archivo";
    }
  } catch (error) {
    estado = 999;
    operacionOk = false;
    errmsg = "Error en la Red";
    datos = null;
  }
  return { estado, operacionOk, errmsg, datos };
}

export async function descargaTXT(url) {
  const urlDescargar = getUrlApi() + url;
  const response = await fetch(urlDescargar, {
    method: "GET",
    headers: {
      "Content-Type": "text/plain",
      ...getHeaders(),
    },
  });
  if (!response.ok) {
    return null;
  }
  const datos = await response.blob();
  return window.URL.createObjectURL(datos);
}
