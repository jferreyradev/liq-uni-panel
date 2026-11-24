<script setup>
import { ref, computed, onMounted } from "vue";
import { useTenantStore } from "@/stores/tenantStore";
import { RepoHeader, ConfirmacionDialog, TooltipButton } from "@/shared/components";
import { usePII } from "@/composables/usePII";
import { getVto, getFechaDMY, financial } from "@/utils/formatos";
import { tipoLiq, estadosCargo, tiposEmpleo, tiposOS, getName } from "@/utils/tipos";
import { buildSearchValue } from "@/utils/query";
import { leerDatos, ejecutarSP } from "@/shared/services/apiService";
import { resolveSpErrorCode, extractSpMessage, SP_OK } from "@/utils/spRespuesta";
import BajaCargoDialog from "../components/BajaCargoDialog.vue";
import ConceptoLiqModal from "../components/ConceptoLiqModal.vue";
import EditarCargoModal from "../components/EditarCargoModal.vue";

const tenantStore = useTenantStore();
const { documento } = usePII();

// Filtros y Búsqueda
const tipoLiqOpciones = [
  { name: "Todas las liquidaciones", value: -1 },
  ...tipoLiq.map((t) => ({
    name: t.name === "Ayuida escolar" ? "Ayuda escolar" : t.name,
    value: t.value,
  })),
];
const tipoLiqSeleccionado = ref(1); // 1 = Mensual por defecto
const busquedaTexto = ref("");
const soloCargosVigentes = ref(true);
const buscandoCargos = ref(false);

// Cargos y Selección
const listaCargos = ref([]);
const sortByCargos = ref([]);
const cargoSeleccionado = ref(null);

function normalizarCargo(cargo) {
  if (!cargo || typeof cargo !== "object") return cargo;
  const id = getCargoId(cargo);
  const repId = cargo.ReparticionId ?? cargo.REPARTICIONID;
  const orden = cargo.Orden ?? cargo.ORDEN;
  const doc = cargo.PersonaDocumento ?? cargo.PERSONADOCUMENTO ?? cargo.DOCUMENTO ?? cargo.Documento;
  const apellido = cargo.PersonaApellido ?? cargo.PERSONAAPELLIDO ?? cargo.APELLIDO ?? cargo.Apellido ?? "";
  const nombre = cargo.PersonaNombre ?? cargo.PERSONANOMBRE ?? cargo.NOMBRE ?? cargo.Nombre ?? "";
  const cat = cargo.Categoria ?? cargo.CATEGORIA;
  const ant = cargo.Antiguedad ?? cargo.ANTIGUEDAD ?? 0;
  const vtoEsc = cargo.VtoEscalafon ?? cargo.VTOESCALAFON;
  const tipoEmpId = cargo.TipoEmpleoId ?? cargo.TIPOEMPLEOID;
  const tipoEmpDesc = cargo.TipoEmpleoDescripcion ?? cargo.TIPOEMPLEODESCRIPCION ?? getName(tiposEmpleo, tipoEmpId) ?? "";
  const sitRevDesc = cargo.SituacionRevistaDescripcion ?? cargo.SITUACIONREVISTADESCRIPCION ?? "";
  const fechaBaja = cargo.FechaBaja ?? cargo.FECHABAJA;
  const estadoCargoId = cargo.EstadoCargoId ?? cargo.ESTADOCARGOID;
  const estadoCargoDesc = cargo.EstadoCargoDescripcion ?? cargo.ESTADOCARGODESCRIPCION ?? getName(estadosCargo, estadoCargoId) ?? "";
  const tipoOsId = cargo.TipoObraSocialId ?? cargo.TIPOOBRASOCIALID;
  const tipoOsDesc = cargo.TipoObraSocialDescripcion ?? cargo.TIPOOBRASOCIALDESCRIPCION ?? getName(tiposOS, tipoOsId) ?? "";
  const tipoLiqId = cargo.TipoLiquidacionId ?? cargo.TIPOLIQUIDACIONID;
  const tipoLiqDesc = cargo.TipoLiquidacionDescripcion ?? cargo.TIPOLIQUIDACIONDESCRIPCION ?? getName(tipoLiq, tipoLiqId) ?? "";
  const salario = cargo.Salario ?? cargo.SALARIO;
  const uniOrg = cargo.UniOrg ?? cargo.UNIORG ?? cargo.UniOrgId ?? cargo.UNIORGID ?? "";
  const observacion = cargo.Observacion ?? cargo.OBSERVACION ?? cargo.observacion ?? cargo.OBS ?? "";

  return {
    ...cargo,
    ID: id,
    Id: id,
    ReparticionId: repId,
    REPARTICIONID: repId,
    Orden: orden,
    ORDEN: orden,
    PersonaDocumento: doc,
    PERSONADOCUMENTO: doc,
    PersonaApellido: apellido,
    PERSONAAPELLIDO: apellido,
    PersonaNombre: nombre,
    PERSONANOMBRE: nombre,
    Categoria: cat,
    CATEGORIA: cat,
    Antiguedad: ant,
    ANTIGUEDAD: ant,
    VtoEscalafon: vtoEsc,
    VTOESCALAFON: vtoEsc,
    TipoEmpleoId: tipoEmpId,
    TIPOEMPLEOID: tipoEmpId,
    TipoEmpleoDescripcion: tipoEmpDesc,
    SituacionRevistaDescripcion: sitRevDesc,
    FechaBaja: fechaBaja,
    FECHABAJA: fechaBaja,
    EstadoCargoId: estadoCargoId,
    ESTADOCARGOID: estadoCargoId,
    EstadoCargoDescripcion: estadoCargoDesc,
    TipoObraSocialId: tipoOsId,
    TIPOOBRASOCIALID: tipoOsId,
    TipoObraSocialDescripcion: tipoOsDesc,
    TipoLiquidacionId: tipoLiqId,
    TIPOLIQUIDACIONID: tipoLiqId,
    TipoLiquidacionDescripcion: tipoLiqDesc,
    Salario: salario,
    SALARIO: salario,
    UniOrg: uniOrg,
    UNIORG: uniOrg,
    Observacion: observacion,
    OBSERVACION: observacion,
  };
}
const personaSeleccionada = ref(null);
const personaCache = ref(new Map());

// Conceptos de Liquidación y Cargos
const cargandoConceptos = ref(false);
const listaConceptos = ref([]);
const conceptoModalAbierto = ref(false);
const conceptoEditar = ref(null);
const bajaCargoModalAbierto = ref(false);
const editarCargoModalAbierto = ref(false);
const confirmacionEliminarConcepto = ref(false);
const idConceptoEliminar = ref(null);
const conceptoAEliminar = ref(null);

// Período activo del sistema
const periodoActivo = ref("");

// Alertas de feedback
const alert = ref({
  show: false,
  mensaje: "",
  tipo: "success",
});

function mostrarMensaje(mensaje, tipo = "success") {
  alert.value = {
    show: true,
    mensaje,
    tipo,
  };
}

async function cargarPeriodoActivo() {
  try {
    const { datos, operacionOk } = await leerDatos("view/periodo", {
      query: { Activo: 1 },
    });
    if (operacionOk && Array.isArray(datos) && datos.length > 0) {
      periodoActivo.value = getVto(datos[0].PERIODO) || "";
    }
  } catch {
    // Fallback silencioso
  }
}

// Determinación certera de si el agente cobra ley (en view/personaLista campo 'no cobra ley = 1')
function extractNoCobraLeyValue(obj) {
  if (!obj || typeof obj !== "object") return null;

  // 1. Campos específicos de "no cobra ley"
  const noCobraKeys = [
    "NOCOBRALEY",
    "nocobraley",
    "NoCobraLey",
    "NO_COBRA_LEY",
    "no_cobra_ley",
    "NO COBRA LEY",
    "no cobra ley",
    "No Cobra Ley",
  ];
  for (const k of noCobraKeys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") {
      return Number(obj[k]);
    }
  }

  return null;
}

function getRawNoCobraLey(cargo) {
  if (!cargo) return 0;

  const rawFromCargo = extractNoCobraLeyValue(cargo);
  if (rawFromCargo !== null) return rawFromCargo;

  const doc = String(cargo.PERSONADOCUMENTO || cargo.Documento || "");
  if (doc && personaCache.value.has(doc)) {
    const raw = extractNoCobraLeyValue(personaCache.value.get(doc));
    if (raw !== null) return raw;
  }

  const pId = cargo.PERSONAID || cargo.PersonaId;
  if (pId && personaCache.value.has(pId)) {
    const raw = extractNoCobraLeyValue(personaCache.value.get(pId));
    if (raw !== null) return raw;
  }

  if (personaSeleccionada.value) {
    const docSel = String(personaSeleccionada.value.DOCUMENTO || personaSeleccionada.value.Documento || "");
    const idSel = personaSeleccionada.value.PERSONAID || personaSeleccionada.value.ID || personaSeleccionada.value.Id;
    if ((doc && doc === docSel) || (pId && pId === idSel)) {
      const raw = extractNoCobraLeyValue(personaSeleccionada.value);
      if (raw !== null) return raw;
    }
  }

  return 0;
}

// 1 = no cobra ley (excluido de ley)
function noCobraLey(cargo) {
  return getRawNoCobraLey(cargo) === 1;
}

// Cobra ley si NO está excluido (NOCOBRALEY !== 1)
function cobraLey(cargo) {
  return !noCobraLey(cargo);
}

// Alias de compatibilidad que retorna 1 si cobra ley y 0 si no cobra ley
function getCobraLey(cargo) {
  return cobraLey(cargo) ? 1 : 0;
}

async function cargarPersonasParaCargos(cargos) {
  if (!Array.isArray(cargos) || cargos.length === 0) return;
  // Pre-cachear los primeros registros visibles para respuesta inmediata
  const docsToFetch = [...new Set(cargos.slice(0, 10).map((c) => c.PERSONADOCUMENTO || c.Documento).filter(Boolean))]
    .filter((doc) => !personaCache.value.has(String(doc)));

  if (docsToFetch.length > 0) {
    await Promise.allSettled(
      docsToFetch.map(async (doc) => {
        try {
          const res = await leerDatos("view/personaLista", { query: { Documento: doc } });
          if (res.operacionOk && Array.isArray(res.datos) && res.datos.length > 0) {
            const p = res.datos[0];
            personaCache.value.set(String(doc), p);
            const pId = p.PERSONAID ?? p.ID ?? p.Id;
            if (pId) personaCache.value.set(pId, p);
          }
        } catch {
          // Fallback silencioso
        }
      })
    );
  }
}

// 1. Carga de Cargos con filtros (Tipo de Liquidación, vigencia y búsqueda)
async function cargarCargos() {
  buscandoCargos.value = true;
  try {
    const query = {
      sort: JSON.stringify({ ReparticionId: "asc", Orden: "asc" }),
    };

    if (soloCargosVigentes.value) {
      query.EstadoCargoId = 1;
    }

    if (tipoLiqSeleccionado.value && tipoLiqSeleccionado.value !== -1) {
      query.TipoLiquidacionId = tipoLiqSeleccionado.value;
    }

    const q = (busquedaTexto.value || "").trim();
    if (q) {
      if (/^\d+$/.test(q)) {
        if (q.length <= 6) {
          query.Id = q;
        } else {
          query.PersonaDocumento = q;
        }
      } else {
        const val = buildSearchValue("PersonaApellido", q);
        if (val) query.search = val;
      }
    }

    const { datos, operacionOk, errmsg } = await leerDatos("view/cargo", { query });
    if (operacionOk && Array.isArray(datos)) {
      listaCargos.value = datos.map(normalizarCargo);
      cargarPersonasParaCargos(listaCargos.value);
      if (datos.length === 0) {
        cargoSeleccionado.value = null;
        listaConceptos.value = [];
        if (q) {
          mostrarMensaje("No se encontraron cargos con el criterio ingresado.", "info");
        }
      }
    } else {
      listaCargos.value = [];
      mostrarMensaje(errmsg || "No se pudieron obtener los cargos.", "error");
    }
  } catch (err) {
    mostrarMensaje(err.message || "Error al conectar con el servidor.", "error");
  } finally {
    buscandoCargos.value = false;
  }
}

// 2. Búsqueda por Agente o Cargo
async function buscarPersonas() {
  const q = (busquedaTexto.value || "").trim();
  if (!q) {
    await cargarCargos();
    return;
  }

  buscandoCargos.value = true;
  try {
    const esNumero = /^\d+$/.test(q);
    if (esNumero && q.length > 6) {
      const resP = await leerDatos("view/personaLista", { query: { Documento: q } });
      if (resP.operacionOk && Array.isArray(resP.datos) && resP.datos.length > 0) {
        seleccionarPersona(resP.datos[0]);
        return;
      }
    }

    await cargarCargos();
  } catch (err) {
    mostrarMensaje(err.message || "Error al buscar.", "error");
  } finally {
    buscandoCargos.value = false;
  }
}

function seleccionarPersona(persona) {
  personaSeleccionada.value = persona;
  const doc = persona.DOCUMENTO || persona.Documento;
  const pId = persona.PERSONAID ?? persona.ID ?? persona.Id;
  if (doc) personaCache.value.set(String(doc), persona);
  if (pId) personaCache.value.set(pId, persona);
  cargarCargosPorPersona(pId);
}

async function cargarCargosPorPersona(personaId) {
  if (!personaId) return;
  buscandoCargos.value = true;
  try {
    const query = { PersonaId: personaId };
    if (soloCargosVigentes.value) {
      query.EstadoCargoId = 1;
    }
    if (tipoLiqSeleccionado.value && tipoLiqSeleccionado.value !== -1) {
      query.TipoLiquidacionId = tipoLiqSeleccionado.value;
    }
    const { datos, operacionOk, errmsg } = await leerDatos("view/cargo", { query });
    if (operacionOk && Array.isArray(datos)) {
      if (datos.length > 0) {
        listaCargos.value = datos.map(normalizarCargo);
        seleccionarCargo(listaCargos.value[0], false);
      } else {
        // Si no tiene cargos en la liquidación actualmente seleccionada, buscar si tiene en otras
        if (tipoLiqSeleccionado.value !== -1) {
          const resOtros = await leerDatos("view/cargo", {
            query: {
              PersonaId: personaId,
              ...(soloCargosVigentes.value ? { EstadoCargoId: 1 } : {}),
            },
          });
          if (resOtros.operacionOk && Array.isArray(resOtros.datos) && resOtros.datos.length > 0) {
            listaCargos.value = resOtros.datos.map(normalizarCargo);
            tipoLiqSeleccionado.value = -1;
            seleccionarCargo(listaCargos.value[0], false);
            mostrarMensaje(
              "El agente no registra cargos en la liquidación previamente seleccionada; se muestran todos sus cargos.",
              "info"
            );
            return;
          }
        }
        cargoSeleccionado.value = null;
        listaConceptos.value = [];
        listaCargos.value = [];
        mostrarMensaje("El agente no registra cargos vigentes.", "info");
      }
    } else {
      mostrarMensaje(errmsg || "Error al consultar los cargos del agente.", "error");
    }
  } catch (err) {
    mostrarMensaje(err.message || "Error al cargar los cargos.", "error");
  } finally {
    buscandoCargos.value = false;
  }
}

function onTipoLiqChange() {
  cargarCargos();
}

function limpiarFiltros() {
  busquedaTexto.value = "";
  soloCargosVigentes.value = true;
  tipoLiqSeleccionado.value = 1;
  cargarCargos();
}

// 3. Selección y Apertura de Ventana Flotante de Conceptos
const modalConceptosAbierto = ref(false);

async function seleccionarCargo(cargo, cargar = false) {
  if (!cargo) return;
  cargoSeleccionado.value = cargo;
  const doc = cargo.PersonaDocumento || cargo.PERSONADOCUMENTO || cargo.Documento || "";
  const pId = cargo.PersonaId || cargo.PERSONAID || 0;

  personaSeleccionada.value = {
    PERSONAID: pId,
    DOCUMENTO: doc,
    APELLIDO: cargo.PersonaApellido || cargo.PERSONAAPELLIDO || cargo.Apellido || "",
    NOMBRE: cargo.PersonaNombre || cargo.PERSONANOMBRE || cargo.Nombre || "",
    APELLIDOYNOMBRE:
      cargo.APELLIDOYNOMBRE ||
      `${cargo.PersonaApellido || cargo.PERSONAAPELLIDO || cargo.Apellido || ""}, ${cargo.PersonaNombre || cargo.PERSONANOMBRE || cargo.Nombre || ""}`.trim(),
    PERSONACUIL: cargo.PERSONACUIL || "",
    COBRALEY: getCobraLey(cargo),
    NOCOBRALEY: getRawNoCobraLey(cargo),
  };

  if (doc && !personaCache.value.has(String(doc))) {
    try {
      const resP = await leerDatos("view/personaLista", { query: { Documento: doc } });
      if (resP.operacionOk && Array.isArray(resP.datos) && resP.datos.length > 0) {
        const p = resP.datos[0];
        personaCache.value.set(String(doc), p);
        if (p.PERSONAID) personaCache.value.set(p.PERSONAID, p);
        if (personaSeleccionada.value && personaSeleccionada.value.DOCUMENTO === doc) {
          personaSeleccionada.value.NOCOBRALEY = extractNoCobraLeyValue(p);
          personaSeleccionada.value.COBRALEY = cobraLey(cargo) ? 1 : 0;
        }
      }
    } catch {
      // Fallback no bloqueante
    }
  }

  if (cargar) {
    await cargarConceptos(cargo.ID || cargo.Id);
  }
}

function getCargoId(cargo) {
  if (!cargo) return 0;
  return Number(
    cargo.idcargo ??
    cargo.IdCargo ??
    cargo.idCargo ??
    cargo.IDCARGO ??
    cargo.CargoId ??
    cargo.CARGOID ??
    cargo.ID ??
    cargo.Id ??
    0
  );
}

// Cargar si solo si se solicita mediante el botón en el cargo
async function abrirConceptosLiq(cargo) {
  if (!cargo) return;
  await seleccionarCargo(cargo, false);
  modalConceptosAbierto.value = true;
  await cargarConceptos(getCargoId(cargo));
}

function cerrarModalConceptos() {
  modalConceptosAbierto.value = false;
}

// 4. Carga de Conceptos del Cargo (consulta view/conceptosLiq solo si se solicita)
async function cargarConceptos(cargoId) {
  const idC = Number(cargoId) || getCargoId(cargoSeleccionado.value);
  if (!idC) return;
  cargandoConceptos.value = true;

  try {
    // Consultar view/conceptosLiq con el parámetro permitido idCargo, y conceptoLiq para asociar el ID del registro
    let [resView, resEntidad] = await Promise.all([
      leerDatos("view/conceptosLiq", { query: { idCargo: idC } }),
      leerDatos("conceptoLiq", { query: { CargoId: idC } }),
    ]);

    let datos = [];
    if (resView.operacionOk && Array.isArray(resView.datos) && resView.datos.length > 0) {
      datos = resView.datos;
    } else if (resEntidad.operacionOk && Array.isArray(resEntidad.datos)) {
      datos = resEntidad.datos;
    }

    const mapEntidad = new Map();
    if (resEntidad.operacionOk && Array.isArray(resEntidad.datos)) {
      for (const item of resEntidad.datos) {
        const k = `${item.CODIGO ?? item.Codigo}-${item.SUBCODIGO ?? item.SubCodigo ?? 0}`;
        mapEntidad.set(k, item);
      }
    }

    listaConceptos.value = datos
      .map((c) => {
        const cod = Number(c.CODIGO ?? c.Codigo ?? 0);
        const sub = Number(c.SUBCODIGO ?? c.SubCodigo ?? 0);
        const key = `${cod}-${sub}`;
        const ent = mapEntidad.get(key) || {};
        return {
          ID: c.ID || c.Id || c.IDCONCEPTOLIQ || ent.ID || ent.Id || 0,
          CARGOID: c.IDCARGO || c.CARGOID || c.CargoId || idC,
          CODIGO: cod,
          SUBCODIGO: sub,
          PARAMETRO1: c.PARAM1 ?? c.PARAMETRO1 ?? ent.PARAMETRO1 ?? 0,
          PARAMETRO2: c.PARAM2 ?? c.PARAMETRO2 ?? ent.PARAMETRO2 ?? 0,
          IMPORTE: c.IMPORTE ?? ent.IMPORTE ?? 0,
          VENCIMIENTO: c.VTO || c.VENCIMIENTO || ent.VENCIMIENTO || null,
          PERIODO: c.PERIODO || ent.PERIODO || null,
          GRUPOADICIONALID: c.GRUPOADICIONALID ?? ent.GRUPOADICIONALID ?? 0,
          PENLEY: c.PENLEY ?? ent.PENLEY ?? 0,
          TIPOLIQUIDACIONID: c.TIPOLIQUIDACIONID ?? ent.TIPOLIQUIDACIONID,
          TIPOLIQUIDACIONDESCRIPCION: c.TIPOLIQUIDACIONDESCRIPCION ?? ent.TIPOLIQUIDACIONDESCRIPCION,
        };
      })
      .sort((a, b) => {
        if (a.CODIGO !== b.CODIGO) return a.CODIGO - b.CODIGO;
        return a.SUBCODIGO - b.SUBCODIGO;
      });
  } catch (err) {
    mostrarMensaje(err.message || "Error al cargar conceptos del cargo.", "error");
    listaConceptos.value = [];
  } finally {
    cargandoConceptos.value = false;
  }
}

// 5. Operaciones sobre el Cargo (Baja y Actualización)
function abrirEditarCargo(cargo = null) {
  if (cargo) {
    seleccionarCargo(cargo, false);
  }
  if (!cargoSeleccionado.value) return;
  editarCargoModalAbierto.value = true;
}

function onCargoActualizado({ cargoId }) {
  mostrarMensaje(`Cargo #${cargoId} actualizado exitosamente.`, "success");
  if (personaSeleccionada.value?.PERSONAID) {
    cargarCargosPorPersona(personaSeleccionada.value.PERSONAID);
  } else {
    cargarCargos();
  }
}

function abrirBajaCargo(cargo = null) {
  if (cargo) {
    seleccionarCargo(cargo, false);
  }
  if (!cargoSeleccionado.value) return;
  bajaCargoModalAbierto.value = true;
}

function onBajaConfirmada({ fechaBaja }) {
  const cId = getCargoId(cargoSeleccionado.value);
  mostrarMensaje(
    `El cargo #${cId} fue dado de baja con fecha ${fechaBaja}.`,
    "success"
  );
  if (personaSeleccionada.value?.PERSONAID) {
    cargarCargosPorPersona(personaSeleccionada.value.PERSONAID);
  } else {
    cargarCargos();
  }
}

// 6. ABM de Conceptos de Liquidación
function agregarConcepto() {
  conceptoEditar.value = null;
  conceptoModalAbierto.value = true;
}

function editarConcepto(item) {
  conceptoEditar.value = item;
  conceptoModalAbierto.value = true;
}

function onConceptoGuardado({ isEdit }) {
  mostrarMensaje(
    isEdit ? "Concepto de liquidación actualizado." : "Concepto de liquidación agregado al cargo.",
    "success"
  );
  cargarConceptos(getCargoId(cargoSeleccionado.value));
}

function solicitarEliminarConcepto(item) {
  const obj = typeof item === "object" && item !== null ? item : listaConceptos.value.find((c) => c.ID === item);
  conceptoAEliminar.value = obj || null;
  idConceptoEliminar.value = (typeof item === "object" && item !== null ? (item.ID || item.Id || item.IDCONCEPTOLIQ) : item) || 0;
  confirmacionEliminarConcepto.value = true;
}

async function eliminarConcepto(id) {
  confirmacionEliminarConcepto.value = false;
  let idEliminar = Number(id) || Number(idConceptoEliminar.value);

  if (!idEliminar && conceptoAEliminar.value) {
    try {
      const cId = getCargoId(cargoSeleccionado.value);
      const resEnt = await leerDatos("conceptoLiq", { query: { CargoId: cId } });
      if (resEnt.operacionOk && Array.isArray(resEnt.datos)) {
        const match = resEnt.datos.find(
          (e) =>
            Number(e.CODIGO ?? e.Codigo) === Number(conceptoAEliminar.value.CODIGO) &&
            Number(e.SUBCODIGO ?? e.SubCodigo ?? 0) === Number(conceptoAEliminar.value.SUBCODIGO ?? 0)
        );
        if (match && (match.ID || match.Id)) {
          idEliminar = Number(match.ID || match.Id);
        }
      }
    } catch {
      // ignore
    }
  }

  if (!idEliminar) {
    mostrarMensaje("No se pudo identificar el concepto a eliminar.", "error");
    return;
  }

  try {
    let res = await ejecutarSP("sp/conceptoliq_spdConceptoliq", {
      vIDCONCEPTOLIQ: idEliminar,
    });
    if (!res.operacionOk) {
      res = await ejecutarSP("sp/ConceptoLiqDel", {
        vIDCONCEPTOLIQ: idEliminar,
      });
    }
    const errCode = resolveSpErrorCode(res);
    const esExito = res.operacionOk && (errCode === SP_OK || Number(res.valorError) === 0);

    if (esExito) {
      mostrarMensaje("Concepto de liquidación eliminado del cargo.", "success");
      cargarConceptos(getCargoId(cargoSeleccionado.value));
    } else {
      mostrarMensaje(extractSpMessage(res, "No se pudo eliminar el concepto."), "error");
    }
  } catch (err) {
    mostrarMensaje(err.message || "Error al eliminar el concepto.", "error");
  }
}

const headersCargos = [
  { title: "Acciones", key: "ACCIONES", width: "150px", align: "center", sortable: false },
  {
    title: "Rep.",
    key: "ReparticionId",
    value: (item) => Number(item.ReparticionId ?? item.REPARTICIONID) || 0,
    align: "center",
    width: "70px",
  },
  {
    title: "Orden",
    key: "Orden",
    value: (item) => Number(item.Orden ?? item.ORDEN) || 0,
    align: "center",
    width: "70px",
  },
  {
    title: "DNI",
    key: "PersonaDocumento",
    value: (item) => Number(item.PersonaDocumento ?? item.PERSONADOCUMENTO ?? item.DOCUMENTO ?? item.Documento) || 0,
    align: "end",
    width: "105px",
  },
  {
    title: "Apellido",
    key: "PersonaApellido",
    value: (item) => String(item.PersonaApellido ?? item.PERSONAAPELLIDO ?? item.APELLIDO ?? item.Apellido ?? "").toLowerCase(),
    align: "start",
  },
  {
    title: "Nombre",
    key: "PersonaNombre",
    value: (item) => String(item.PersonaNombre ?? item.PERSONANOMBRE ?? item.NOMBRE ?? item.Nombre ?? "").toLowerCase(),
    align: "start",
  },
  {
    title: "Categoría",
    key: "Categoria",
    value: (item) => Number(item.Categoria ?? item.CATEGORIA) || 0,
    align: "center",
    width: "85px",
  },
  {
    title: "Antigüedad",
    key: "Antiguedad",
    value: (item) => Number(item.Antiguedad ?? item.ANTIGUEDAD) || 0,
    align: "center",
    width: "85px",
  },
  {
    title: "Vto. Escalafón",
    key: "VtoEscalafon",
    value: (item) => String(item.VtoEscalafon ?? item.VTOESCALAFON ?? ""),
    align: "center",
    width: "115px",
  },
  {
    title: "Tipo Empleo",
    key: "TipoEmpleoDescripcion",
    value: (item) => String(item.TipoEmpleoDescripcion ?? item.TIPOEMPLEODESCRIPCION ?? getName(tiposEmpleo, item.TipoEmpleoId ?? item.TIPOEMPLEOID) ?? "").toLowerCase(),
    align: "start",
    width: "135px",
  },
  {
    title: "Sit. Revista",
    key: "SituacionRevistaDescripcion",
    value: (item) => String(item.SituacionRevistaDescripcion ?? item.SITUACIONREVISTADESCRIPCION ?? "").toLowerCase(),
    align: "start",
    width: "125px",
  },
  {
    title: "Fecha Baja",
    key: "FechaBaja",
    value: (item) => String(item.FechaBaja ?? item.FECHABAJA ?? ""),
    align: "center",
    width: "105px",
  },
  {
    title: "Estado Cargo",
    key: "EstadoCargoDescripcion",
    value: (item) => String(item.EstadoCargoDescripcion ?? item.ESTADOCARGODESCRIPCION ?? getName(estadosCargo, item.EstadoCargoId ?? item.ESTADOCARGOID) ?? "").toLowerCase(),
    align: "center",
    width: "115px",
  },
  {
    title: "Tipo O.S.",
    key: "TipoObraSocialDescripcion",
    value: (item) => String(item.TipoObraSocialDescripcion ?? item.TIPOOBRASOCIALDESCRIPCION ?? getName(tiposOS, item.TipoObraSocialId ?? item.TIPOOBRASOCIALID) ?? "").toLowerCase(),
    align: "start",
    width: "125px",
  },
  {
    title: "Tipo Liquidación",
    key: "TipoLiquidacionDescripcion",
    value: (item) => String(item.TipoLiquidacionDescripcion ?? item.TIPOLIQUIDACIONDESCRIPCION ?? getName(tipoLiq, item.TipoLiquidacionId ?? item.TIPOLIQUIDACIONID) ?? "").toLowerCase(),
    align: "center",
    width: "130px",
  },
  {
    title: "Salario",
    key: "Salario",
    value: (item) => Number(item.Salario ?? item.SALARIO) || 0,
    align: "center",
    width: "80px",
  },
  {
    title: "Uni. Org.",
    key: "UniOrg",
    value: (item) => String(item.UniOrg ?? item.UNIORG ?? item.UniOrgId ?? item.UNIORGID ?? ""),
    align: "center",
    width: "95px",
  },
];

const totalImporteConceptos = computed(() => {
  if (!Array.isArray(listaConceptos.value)) return 0;
  return listaConceptos.value.reduce((acc, curr) => acc + (Number(curr.IMPORTE) || 0), 0);
});

const headersConceptos = [
  { title: "Acciones", key: "ACCIONES", width: "100px", align: "center", sortable: false },
  { title: "Código", key: "CODIGO", align: "end", width: "80px" },
  { title: "Subcód.", key: "SUBCODIGO", align: "end", width: "80px" },
  { title: "Parámetro 1", key: "PARAMETRO1", align: "end", width: "100px" },
  { title: "Parámetro 2", key: "PARAMETRO2", align: "end", width: "100px" },
  { title: "Vencimiento", key: "VENCIMIENTO", align: "center", width: "110px" },
  { title: "Importe ($)", key: "IMPORTE", align: "end", width: "120px" },
  { title: "Período", key: "PERIODO", align: "center", width: "110px" },
  { title: "Grupo Adic.", key: "GRUPOADICIONALID", align: "center", width: "100px" },
  { title: "Es Ley", key: "PENLEY", align: "center", width: "80px" },
];

onMounted(async () => {
  await cargarPeriodoActivo();
  await cargarCargos();
});
</script>

<template>
  <v-container fluid class="pa-4">
    <RepoHeader
      title="Cargos y Conceptos de Liquidación"
      :subtitle="`Nómina de cargos por tipo de liquidación y conceptos asociados (CC) — ${tenantStore.tenantName}`"
    />

    <!-- Feedback Alert -->
    <v-alert
      v-model="alert.show"
      :type="alert.tipo"
      variant="tonal"
      density="comfortable"
      closable
      class="mt-4"
    >
      {{ alert.mensaje }}
    </v-alert>

    <!-- 1. Filtros de Búsqueda de Cargos -->
    <v-card class="mt-4 elevation-1 border" rounded="lg">
      <div class="pa-3 bg-grey-lighten-4 border-b d-flex flex-wrap align-center justify-space-between ga-3">
        <div class="d-flex align-center flex-wrap ga-2">
          <span class="text-subtitle-2 font-weight-bold text-grey-darken-3 me-1">
            <v-icon icon="mdi-filter-variant" class="me-1 text-primary" size="small" />
            Tipo de Liquidación:
          </span>
          <v-btn-toggle
            v-model="tipoLiqSeleccionado"
            mandatory
            color="primary"
            density="compact"
            variant="outlined"
            divided
            @update:model-value="onTipoLiqChange"
          >
            <v-btn :value="1">Mensual</v-btn>
            <v-btn :value="2">SAC</v-btn>
            <v-btn :value="5">Adicional</v-btn>
            <v-btn :value="10">Ayuda Escolar</v-btn>
            <v-btn :value="21">Liq. Final</v-btn>
            <v-btn :value="-1">Todas</v-btn>
          </v-btn-toggle>
        </div>

        <div class="d-flex align-center ga-3">
          <v-switch
            v-model="soloCargosVigentes"
            label="Solo cargos vigentes (Activos)"
            color="primary"
            density="compact"
            hide-details
            @update:model-value="cargarCargos"
          ></v-switch>
        </div>
      </div>

      <v-card-text class="pa-3">
        <v-row align="center" dense>
          <v-col cols="12" md="8" sm="8">
            <v-text-field
              v-model="busquedaTexto"
              label="Buscar por DNI, Apellido o Nro. de Cargo"
              placeholder="Ej: 28920504, PEREZ o 753"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              :loading="buscandoCargos"
              @keydown.enter="buscarPersonas"
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="4" sm="4" class="d-flex ga-2">
            <v-btn
              color="primary"
              prepend-icon="mdi-magnify"
              :loading="buscandoCargos"
              @click="buscarPersonas"
            >
              Buscar
            </v-btn>
            <v-btn
              variant="outlined"
              prepend-icon="mdi-refresh"
              :disabled="buscandoCargos"
              @click="limpiarFiltros"
            >
              Limpiar
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- 2. Grilla de Selección de Cargos -->
    <v-card class="mt-4 elevation-1 border" rounded="lg">
      <v-card-title class="d-flex flex-wrap align-center justify-space-between py-3 px-4 bg-grey-lighten-4 border-b">
        <div class="d-flex align-center">
          <v-icon icon="mdi-badge-account" class="me-2 text-primary" />
          <span class="text-subtitle-1 font-weight-bold">
            Seleccionar Cargo ({{ listaCargos.length }} cargados)
          </span>
        </div>
        <div v-if="cargoSeleccionado" class="text-caption font-weight-bold text-primary">
          Cargo activo: #{{ getCargoId(cargoSeleccionado) }} ({{ personaSeleccionada?.APELLIDOYNOMBRE || 'Agente' }})
        </div>
      </v-card-title>

      <v-card-text class="pa-4">
        <div v-if="buscandoCargos" class="d-flex align-center justify-center pa-6">
          <v-progress-circular indeterminate color="primary" class="me-2"></v-progress-circular>
          Cargando nómina de cargos...
        </div>

        <v-data-table
          v-else
          v-model:sort-by="sortByCargos"
          :headers="headersCargos"
          :items="listaCargos"
          density="compact"
          hover
          class="border rounded text-caption"
          no-data-text="No se encontraron cargos para mostrar. Ingrese un DNI, Apellido o Cargo # para buscar."
        >
          <template #item="{ item }">
            <tr
              class="pa-0 ma-0 cursor-pointer"
              :class="{ 'bg-blue-lighten-5': (getCargoId(cargoSeleccionado) === getCargoId(item)) }"
              @click="seleccionarCargo(item)"
            >
              <!-- Acciones (al inicio) -->
              <td class="text-center pa-1 sticky-col">
                <div class="d-flex align-center justify-center ga-1">
                  <v-btn
                    size="x-small"
                    color="primary"
                    variant="flat"
                    prepend-icon="mdi-format-list-checks"
                    class="font-weight-bold"
                    @click.stop="abrirConceptosLiq(item)"
                  >
                    Conceptos Liq
                  </v-btn>
                  <v-tooltip location="top" text="Actualizar datos del cargo">
                    <template #activator="{ props: tooltipProps }">
                      <v-btn
                        v-bind="tooltipProps"
                        size="x-small"
                        icon="mdi-pencil"
                        color="primary"
                        variant="tonal"
                        @click.stop="abrirEditarCargo(item)"
                      />
                    </template>
                  </v-tooltip>
                  <v-tooltip
                    v-if="(item.EstadoCargoId ?? item.ESTADOCARGOID) === 1"
                    location="top"
                    text="Dar de baja al cargo"
                  >
                    <template #activator="{ props: tooltipProps }">
                      <v-btn
                        v-bind="tooltipProps"
                        size="x-small"
                        icon="mdi-account-arrow-down"
                        color="error"
                        variant="tonal"
                        @click.stop="abrirBajaCargo(item)"
                      />
                    </template>
                  </v-tooltip>
                </div>
              </td>

              <!-- 1. ReparticionId -->
              <td class="text-center pa-1">{{ item.ReparticionId ?? item.REPARTICIONID }}</td>

              <!-- 2. Orden -->
              <td class="text-center pa-1 font-weight-medium">{{ item.Orden ?? item.ORDEN }}</td>

              <!-- 3. PersonaDocumento -->
              <td class="text-right pa-1 font-weight-medium">
                {{ documento(item.PersonaDocumento ?? item.PERSONADOCUMENTO ?? item.DOCUMENTO) }}
              </td>

              <!-- 4. PersonaApellido -->
              <td class="text-left pa-1 font-weight-medium">
                {{ item.PersonaApellido ?? item.PERSONAAPELLIDO ?? item.APELLIDO ?? '—' }}
              </td>

              <!-- 5. PersonaNombre -->
              <td class="text-left pa-1">
                {{ item.PersonaNombre ?? item.PERSONANOMBRE ?? item.NOMBRE ?? '—' }}
              </td>

              <!-- 6. Categoria -->
              <td class="text-center pa-1 font-weight-bold">
                {{ item.Categoria ?? item.CATEGORIA ?? '—' }}
              </td>

              <!-- 7. Antiguedad -->
              <td class="text-center pa-1 font-weight-medium">
                {{ item.Antiguedad ?? item.ANTIGUEDAD ?? 0 }}
              </td>

              <!-- 8. VtoEscalafon -->
              <td class="text-center pa-1">
                {{ getVto(item.VtoEscalafon ?? item.VTOESCALAFON) || '—' }}
              </td>

              <!-- 9. TipoEmpleoDescripcion -->
              <td class="text-left pa-1">
                <v-chip size="x-small" variant="tonal" color="blue-grey">
                  {{ item.TipoEmpleoDescripcion ?? item.TIPOEMPLEODESCRIPCION ?? getName(tiposEmpleo, item.TipoEmpleoId ?? item.TIPOEMPLEOID) ?? '—' }}
                </v-chip>
              </td>

              <!-- 10. SituacionRevistaDescripcion -->
              <td class="text-left pa-1">
                {{ item.SituacionRevistaDescripcion ?? item.SITUACIONREVISTADESCRIPCION ?? '—' }}
              </td>

              <!-- 11. FechaBaja -->
              <td class="text-center pa-1">
                {{ getFechaDMY(item.FechaBaja ?? item.FECHABAJA) || '—' }}
              </td>

              <!-- 12. EstadoCargoDescripcion -->
              <td class="text-center pa-1">
                <v-chip
                  :color="(item.EstadoCargoId ?? item.ESTADOCARGOID) === 1 ? 'success' : 'error'"
                  size="x-small"
                  class="font-weight-bold"
                >
                  {{ item.EstadoCargoDescripcion ?? item.ESTADOCARGODESCRIPCION ?? getName(estadosCargo, item.EstadoCargoId ?? item.ESTADOCARGOID) ?? '—' }}
                </v-chip>
              </td>

              <!-- 13. TipoObraSocialDescripcion -->
              <td class="text-left pa-1">
                <v-chip size="x-small" variant="tonal" color="indigo">
                  {{ item.TipoObraSocialDescripcion ?? item.TIPOOBRASOCIALDESCRIPCION ?? getName(tiposOS, item.TipoObraSocialId ?? item.TIPOOBRASOCIALID) ?? '—' }}
                </v-chip>
              </td>

              <!-- 14. TipoLiquidacionDescripcion -->
              <td class="text-center pa-1">
                <v-chip size="x-small" variant="tonal" color="primary">
                  {{ item.TipoLiquidacionDescripcion ?? item.TIPOLIQUIDACIONDESCRIPCION ?? getName(tipoLiq, item.TipoLiquidacionId ?? item.TIPOLIQUIDACIONID) ?? '—' }}
                </v-chip>
              </td>

              <!-- 15. Salario -->
              <td class="text-center pa-1">
                <v-chip
                  size="x-small"
                  :color="(item.Salario ?? item.SALARIO) === 1 ? 'blue-grey' : 'grey-lighten-2'"
                >
                  {{ (item.Salario ?? item.SALARIO) === 1 ? 'SÍ' : 'NO' }}
                </v-chip>
              </td>

              <!-- 16. UniOrg -->
              <td class="text-center pa-1">
                {{ item.UniOrg ?? item.UNIORG ?? item.UniOrgId ?? item.UNIORGID ?? '—' }}
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Ventana Flotante de Conceptos de Liquidación (Carga bajo demanda: view/conceptosLiq) -->
    <v-dialog
      v-model="modalConceptosAbierto"
      max-width="1200px"
      scrollable
    >
      <v-card v-if="cargoSeleccionado" rounded="lg" class="elevation-4 border">
        <v-card-title class="d-flex flex-wrap align-center justify-space-between py-3 px-4 bg-primary text-white border-b">
          <div class="d-flex align-center">
            <v-icon icon="mdi-format-list-checks" class="me-2" />
            <div>
              <div class="text-subtitle-1 font-weight-bold">
                Conceptos de Liquidación (CC) — Cargo #{{ getCargoId(cargoSeleccionado) }} (Orden {{ cargoSeleccionado.Orden ?? cargoSeleccionado.ORDEN }})
              </div>
              <div class="text-caption text-white opacity-90">
                Agente: {{ personaSeleccionada?.APELLIDOYNOMBRE || `${cargoSeleccionado.PersonaApellido ?? cargoSeleccionado.PERSONAAPELLIDO ?? cargoSeleccionado.APELLIDO ?? ''}, ${cargoSeleccionado.PersonaNombre ?? cargoSeleccionado.PERSONANOMBRE ?? cargoSeleccionado.NOMBRE ?? ''}` }}
                | DNI: {{ documento(cargoSeleccionado.PersonaDocumento ?? cargoSeleccionado.PERSONADOCUMENTO ?? cargoSeleccionado.DOCUMENTO) }}
                | Rep: {{ cargoSeleccionado.ReparticionId ?? cargoSeleccionado.REPARTICIONID }}
                | Cat: {{ cargoSeleccionado.Categoria ?? cargoSeleccionado.CATEGORIA ?? '—' }}
                | Estado: {{ cargoSeleccionado.EstadoCargoDescripcion ?? cargoSeleccionado.ESTADOCARGODESCRIPCION ?? getName(estadosCargo, cargoSeleccionado.EstadoCargoId ?? cargoSeleccionado.ESTADOCARGOID) }}
              </div>
            </div>
          </div>

          <div class="d-flex align-center ga-2 mt-2 mt-sm-0">
            <v-btn
              color="white"
              variant="elevated"
              size="small"
              class="text-primary font-weight-bold"
              prepend-icon="mdi-plus"
              @click="agregarConcepto"
            >
              Agregar Concepto
            </v-btn>
            <v-btn
              icon="mdi-close"
              variant="text"
              color="white"
              density="compact"
              @click="cerrarModalConceptos"
            />
          </div>
        </v-card-title>

        <v-card-text class="pa-4" style="max-height: 75vh;">
          <div v-if="cargandoConceptos" class="d-flex align-center justify-center pa-8">
            <v-progress-circular indeterminate color="primary" class="me-2"></v-progress-circular>
            Consultando conceptos de liquidación en view/conceptosLiq...
          </div>

          <div v-else>
            <v-data-table
              :headers="headersConceptos"
              :items="listaConceptos"
              density="compact"
              hover
              class="border rounded text-caption"
              no-data-text="No hay conceptos de liquidación asignados a este cargo. Haga clic en '+ Agregar Concepto' para agregar uno."
            >
              <template #item="{ item }">
                <tr class="pa-0 ma-0">
                  <td class="text-center pa-1 sticky">
                    <div class="d-flex align-center justify-center ga-1">
                      <TooltipButton
                        icono="mdi-pencil"
                        toolMsg="Editar Concepto"
                        :funcion="() => editarConcepto(item)"
                        color="primary"
                      />
                      <TooltipButton
                        icono="mdi-delete"
                        toolMsg="Eliminar Concepto"
                        :funcion="solicitarEliminarConcepto"
                        :itemid="item"
                        color="error"
                      />
                    </div>
                  </td>
                  <td class="text-right pa-1 font-weight-medium">{{ item.CODIGO }}</td>
                  <td class="text-right pa-1">{{ item.SUBCODIGO }}</td>
                  <td class="text-right pa-1">{{ item.PARAMETRO1 }}</td>
                  <td class="text-right pa-1">{{ item.PARAMETRO2 }}</td>
                  <td class="text-center pa-1">{{ getVto(item.VENCIMIENTO) || '—' }}</td>
                  <td class="text-right pa-1 font-weight-bold">{{ financial(item.IMPORTE) }}</td>
                  <td class="text-center pa-1">{{ getVto(item.PERIODO) || '—' }}</td>
                  <td class="text-center pa-1">{{ item.GRUPOADICIONALID }}</td>
                  <td class="text-center pa-1">
                    <v-chip
                      :color="item.PENLEY === 1 ? 'teal' : 'grey'"
                      size="x-small"
                      class="font-weight-bold"
                    >
                      {{ item.PENLEY === 1 ? 'SÍ' : 'NO' }}
                    </v-chip>
                  </td>
                </tr>
              </template>
            </v-data-table>

            <!-- Resumen de Conceptos -->
            <div
              v-if="listaConceptos.length > 0"
              class="d-flex justify-space-between align-center px-4 py-2 mt-3 bg-grey-lighten-4 border rounded text-caption font-weight-bold"
            >
              <span class="text-grey-darken-2">
                <v-icon icon="mdi-counter" size="small" class="me-1" />
                Total de Conceptos: {{ listaConceptos.length }}
              </span>
              <span class="text-primary font-weight-bold text-subtitle-2">
                Suma de Importes: {{ financial(totalImporteConceptos) }}
              </span>
            </div>
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions class="px-4 py-2 bg-grey-lighten-4 d-flex justify-end">
          <v-btn variant="outlined" color="grey-darken-2" @click="cerrarModalConceptos">
            Cerrar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogos Modales -->
    <EditarCargoModal
      v-if="cargoSeleccionado"
      v-model="editarCargoModalAbierto"
      :cargo="cargoSeleccionado"
      @cargo-actualizado="onCargoActualizado"
    />

    <BajaCargoDialog
      v-model="bajaCargoModalAbierto"
      :cargo="cargoSeleccionado"
      @baja-confirmada="onBajaConfirmada"
    />

    <ConceptoLiqModal
      v-if="cargoSeleccionado"
      v-model="conceptoModalAbierto"
      :registro="conceptoEditar"
      :cargo-id="getCargoId(cargoSeleccionado)"
      :periodo-default="periodoActivo"
      @guardado="onConceptoGuardado"
    />

    <v-dialog v-model="confirmacionEliminarConcepto" max-width="500px" persistent>
      <ConfirmacionDialog
        titulo="Eliminar Concepto de Liquidación"
        :mensaje="`¿Está seguro de que desea eliminar el concepto ${conceptoAEliminar?.CODIGO ?? ''} (Subcód. ${conceptoAEliminar?.SUBCODIGO ?? 0}) del cargo?`"
        :cerrar="() => (confirmacionEliminarConcepto = false)"
        :aceptar="eliminarConcepto"
        :parametro="idConceptoEliminar"
      />
    </v-dialog>

  </v-container>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.sticky-col {
  position: sticky;
  left: 0;
  background-color: inherit;
  z-index: 2;
}
</style>
