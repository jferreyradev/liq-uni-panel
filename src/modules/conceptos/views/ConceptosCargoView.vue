<script setup>
import { ref, onMounted } from "vue";
import { useTenantStore } from "@/stores/tenantStore";
import { RepoHeader, ConfirmacionDialog, TooltipButton } from "@/shared/components";
import { usePII } from "@/composables/usePII";
import { getVto, financial } from "@/utils/formatos";
import { estadosCargo, getName } from "@/utils/tipos";
import { buildSearchValue } from "@/utils/query";
import { leerDatos, ejecutarSP } from "@/shared/services/apiService";
import BajaCargoDialog from "../components/BajaCargoDialog.vue";
import ConceptoLiqModal from "../components/ConceptoLiqModal.vue";

const tenantStore = useTenantStore();
const { documento } = usePII();

// Filtros y Búsqueda
const busquedaTexto = ref("");
const soloCargosVigentes = ref(true);
const buscandoCargos = ref(false);

// Cargos y Selección
const listaCargos = ref([]);
const cargoSeleccionado = ref(null);
const personaSeleccionada = ref(null);

// Conceptos de Liquidación
const cargandoConceptos = ref(false);
const listaConceptos = ref([]);
const conceptoModalAbierto = ref(false);
const conceptoEditar = ref(null);
const bajaCargoModalAbierto = ref(false);
const confirmacionEliminarConcepto = ref(false);
const idConceptoEliminar = ref(null);
const confirmacionCobraLey = ref(false);

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

// 1. Carga de Cargos con límite para respuesta rápida
async function cargarCargos() {
  buscandoCargos.value = true;
  try {
    const query = {
      sort: JSON.stringify({ ReparticionId: "asc", Orden: "asc" }),
    };

    if (soloCargosVigentes.value) {
      query.EstadoCargoId = 1;
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
    } else {
      query.limit = 50;
    }

    const { datos, operacionOk, errmsg } = await leerDatos("view/cargo", { query });
    if (operacionOk && Array.isArray(datos)) {
      listaCargos.value = datos;
      if (datos.length > 0) {
        if (
          !cargoSeleccionado.value ||
          !datos.some((c) => (c.ID || c.Id) === (cargoSeleccionado.value.ID || cargoSeleccionado.value.Id))
        ) {
          seleccionarCargo(datos[0]);
        }
      } else {
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
  cargarCargosPorPersona(persona.PERSONAID ?? persona.ID ?? persona.Id);
}

async function cargarCargosPorPersona(personaId) {
  if (!personaId) return;
  buscandoCargos.value = true;
  try {
    const query = { PersonaId: personaId };
    if (soloCargosVigentes.value) {
      query.EstadoCargoId = 1;
    }
    const { datos, operacionOk, errmsg } = await leerDatos("view/cargo", { query });
    if (operacionOk && Array.isArray(datos)) {
      listaCargos.value = datos;
      if (datos.length > 0) {
        seleccionarCargo(datos[0]);
      } else {
        cargoSeleccionado.value = null;
        listaConceptos.value = [];
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

function limpiarFiltros() {
  busquedaTexto.value = "";
  soloCargosVigentes.value = true;
  cargarCargos();
}

// 3. Selección de Cargo
function seleccionarCargo(cargo) {
  if (!cargo) return;
  cargoSeleccionado.value = cargo;
  personaSeleccionada.value = {
    PERSONAID: cargo.PERSONAID ?? cargo.PersonaId ?? 0,
    DOCUMENTO: cargo.PERSONADOCUMENTO || cargo.Documento || "",
    APELLIDO: cargo.PERSONAAPELLIDO || cargo.Apellido || "",
    NOMBRE: cargo.PERSONANOMBRE || cargo.Nombre || "",
    APELLIDOYNOMBRE:
      cargo.APELLIDOYNOMBRE ||
      `${cargo.PERSONAAPELLIDO || cargo.Apellido || ""}, ${cargo.PERSONANOMBRE || cargo.Nombre || ""}`.trim(),
    PERSONACUIL: cargo.PERSONACUIL || "",
  };
  cargarConceptos(cargo.ID || cargo.Id);
}

// 4. Carga de Conceptos del Cargo
async function cargarConceptos(cargoId) {
  if (!cargoId) return;
  cargandoConceptos.value = true;

  try {
    const query = {
      CargoId: cargoId,
      sort: JSON.stringify({ codigo: "asc", subcod: "asc", vencimiento: "asc" }),
    };

    let res = await leerDatos("en/conceptoLiq", { query });
    if (!res.operacionOk || !Array.isArray(res.datos)) {
      res = await leerDatos("view/conceptoLiq", { query });
    }

    if (res.operacionOk && Array.isArray(res.datos)) {
      listaConceptos.value = res.datos;
    } else {
      listaConceptos.value = [];
    }
  } catch (err) {
    mostrarMensaje(err.message || "Error al cargar conceptos del cargo.", "error");
    listaConceptos.value = [];
  } finally {
    cargandoConceptos.value = false;
  }
}

// 5. Operaciones sobre el Cargo (Baja / Cobra Ley)
function abrirBajaCargo() {
  if (!cargoSeleccionado.value) return;
  bajaCargoModalAbierto.value = true;
}

function onBajaConfirmada({ fechaBaja }) {
  mostrarMensaje(
    `El cargo ${cargoSeleccionado.value.ID || cargoSeleccionado.value.Id} fue dado de baja con fecha ${fechaBaja}.`,
    "success"
  );
  cargarCargos();
}

function solicitarToggleCobraLey() {
  if (!cargoSeleccionado.value) return;
  confirmacionCobraLey.value = true;
}

async function ejecutarToggleCobraLey() {
  confirmacionCobraLey.value = false;
  const cargo = cargoSeleccionado.value;
  const nuevoValorSalario = cargo.SALARIO === 1 ? 0 : 1;
  const cargoId = cargo.ID || cargo.Id;

  const payload = {
    vIDCARGO: cargoId,
    vIDREP: cargo.REPARTICIONID,
    vORDEN: cargo.ORDEN,
    vAFILIADO: cargo.AFILIADO,
    vANTIG: cargo.ANTIGUEDAD,
    vIDTE: cargo.TIPOEMPLEOID,
    vIDSITREV: cargo.SITUACIONREVISTAID,
    vIDTIPOOS: cargo.TIPOOBRASOCIALID,
    vCATEGORIA: cargo.CATEGORIA,
    vIDTIPOLIQ: cargo.TIPOLIQUIDACIONID,
    vIDESTADOCARGO: cargo.ESTADOCARGOID,
    vSALARIO: nuevoValorSalario,
  };

  try {
    const { operacionOk, valorError, errorMsg, out } = await ejecutarSP("sp/CargoUpd", payload);
    const errCode =
      valorError !== undefined && valorError !== -1
        ? valorError
        : (out?.vError ?? (operacionOk ? 0 : -1));

    if (operacionOk && errCode === 0) {
      cargo.SALARIO = nuevoValorSalario;
      const estadoLeyTexto = nuevoValorSalario === 1 ? "ahora cobra ley" : "ya no cobra ley";
      mostrarMensaje(`Se actualizó la condición de ley del cargo #${cargoId}: ${estadoLeyTexto}.`, "success");
    } else {
      mostrarMensaje(errorMsg || out?.vErrorMsg || "No se pudo actualizar la condición de ley.", "error");
    }
  } catch (err) {
    mostrarMensaje(err.message || "Error al actualizar la condición de ley.", "error");
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
  cargarConceptos(cargoSeleccionado.value.ID || cargoSeleccionado.value.Id);
}

function solicitarEliminarConcepto(itemid) {
  idConceptoEliminar.value = itemid;
  confirmacionEliminarConcepto.value = true;
}

async function eliminarConcepto(id) {
  confirmacionEliminarConcepto.value = false;
  try {
    const { operacionOk, valorError, errorMsg, out } = await ejecutarSP("sp/ConceptoLiqDel", {
      vIDCONCEPTOLIQ: id,
    });
    const errCode =
      valorError !== undefined && valorError !== -1
        ? valorError
        : (out?.vError ?? (operacionOk ? 0 : -1));

    if (operacionOk && errCode === 0) {
      mostrarMensaje("Concepto de liquidación eliminado del cargo.", "success");
      cargarConceptos(cargoSeleccionado.value.ID || cargoSeleccionado.value.Id);
    } else {
      mostrarMensaje(errorMsg || out?.vErrorMsg || "No se pudo eliminar el concepto.", "error");
    }
  } catch (err) {
    mostrarMensaje(err.message || "Error al eliminar el concepto.", "error");
  }
}

const headersCargos = [
  { title: "Acciones", key: "ACCIONES", width: "150px", align: "center", sortable: false },
  { title: "Cargo #", key: "ID", align: "end", width: "90px" },
  { title: "Orden", key: "ORDEN", align: "center", width: "70px" },
  { title: "DNI", key: "PERSONADOCUMENTO", align: "end", width: "110px" },
  { title: "Apellido y Nombre", key: "AGENTE", align: "start" },
  { title: "Rep.", key: "REPARTICIONID", align: "center", width: "80px" },
  { title: "Estado Cargo", key: "ESTADOCARGOID", align: "center", width: "120px" },
  { title: "Cobra Ley", key: "SALARIO", align: "center", width: "110px" },
];

const headersConceptos = [
  { title: "Acciones", key: "ACCIONES", width: "100px", align: "center", sortable: false },
  { title: "Código", key: "CODIGO", align: "end", width: "80px" },
  { title: "Subcód.", key: "SUBCODIGO", align: "end", width: "80px" },
  { title: "Parámetro 1", key: "PARAMETRO1", align: "end", width: "100px" },
  { title: "Parámetro 2", key: "PARAMETRO2", align: "end", width: "100px" },
  { title: "Importe ($)", key: "IMPORTE", align: "end", width: "120px" },
  { title: "Vencimiento", key: "VENCIMIENTO", align: "center", width: "110px" },
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
      title="Conceptos de Liquidación por Cargo"
      :subtitle="`Gestión de conceptos, cobro de ley y estado de cargos — ${tenantStore.tenantName}`"
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
      <v-card-title class="d-flex flex-wrap align-center justify-space-between py-3 px-4 bg-grey-lighten-4 border-b">
        <div class="d-flex align-center">
          <v-icon icon="mdi-filter-variant" class="me-2 text-primary" />
          <span class="text-subtitle-1 font-weight-bold">Filtros de Búsqueda de Cargos</span>
        </div>
        <v-switch
          v-model="soloCargosVigentes"
          label="Solo cargos vigentes (Activos)"
          color="primary"
          density="compact"
          hide-details
          @update:model-value="cargarCargos"
        ></v-switch>
      </v-card-title>

      <v-card-text class="pa-4">
        <v-row align="center">
          <v-col cols="12" sm="8">
            <v-text-field
              v-model="busquedaTexto"
              label="Buscar por Documento (DNI), Apellido o Nro. de Cargo"
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
          <v-col cols="12" sm="4" class="d-flex ga-2">
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
          Cargo activo: #{{ cargoSeleccionado.ID || cargoSeleccionado.Id }} ({{ personaSeleccionada?.APELLIDOYNOMBRE || 'Agente' }})
        </div>
      </v-card-title>

      <v-card-text class="pa-4">
        <div v-if="buscandoCargos" class="d-flex align-center justify-center pa-6">
          <v-progress-circular indeterminate color="primary" class="me-2"></v-progress-circular>
          Cargando nómina de cargos...
        </div>

        <v-data-table
          v-else
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
              :class="{ 'bg-blue-lighten-5': (cargoSeleccionado?.ID === item.ID || cargoSeleccionado?.Id === item.Id) }"
              @click="seleccionarCargo(item)"
            >
              <td class="text-center pa-1 sticky">
                <div class="d-flex align-center justify-center ga-1">
                  <v-btn
                    size="x-small"
                    :color="(cargoSeleccionado?.ID === item.ID || cargoSeleccionado?.Id === item.Id) ? 'primary' : 'grey-lighten-2'"
                    :variant="(cargoSeleccionado?.ID === item.ID || cargoSeleccionado?.Id === item.Id) ? 'flat' : 'tonal'"
                    prepend-icon="mdi-format-list-checks"
                    @click.stop="seleccionarCargo(item)"
                  >
                    {{ (cargoSeleccionado?.ID === item.ID || cargoSeleccionado?.Id === item.Id) ? 'Activo' : 'Ver' }}
                  </v-btn>
                  <TooltipButton
                    v-if="item.ESTADOCARGOID === 1"
                    icono="mdi-account-arrow-down"
                    toolMsg="Dar de baja al cargo"
                    :funcion="() => { seleccionarCargo(item); abrirBajaCargo(); }"
                    color="error"
                  />
                </div>
              </td>
              <td class="text-right pa-1 font-weight-bold">{{ item.ID || item.Id }}</td>
              <td class="text-center pa-1">{{ item.ORDEN }}</td>
              <td class="text-right pa-1">{{ documento(item.PERSONADOCUMENTO || item.DOCUMENTO) }}</td>
              <td class="text-left pa-1">
                <div class="font-weight-medium">
                  {{ item.APELLIDOYNOMBRE || `${item.PERSONAAPELLIDO || item.APELLIDO || ''}, ${item.PERSONANOMBRE || item.NOMBRE || ''}`.trim() || '—' }}
                </div>
              </td>
              <td class="text-center pa-1">{{ item.REPARTICIONID }}</td>
              <td class="text-center pa-1">
                <v-chip
                  :color="item.ESTADOCARGOID === 1 ? 'success' : 'error'"
                  size="x-small"
                  class="font-weight-bold"
                >
                  {{ getName(estadosCargo, item.ESTADOCARGOID) }}
                </v-chip>
              </td>
              <td class="text-center pa-1">
                <v-chip
                  :color="item.SALARIO === 1 ? 'teal' : 'grey'"
                  size="x-small"
                  class="font-weight-bold"
                >
                  {{ item.SALARIO === 1 ? 'SÍ COBRA' : 'NO COBRA' }}
                </v-chip>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- 3. Panel de Conceptos del Cargo Seleccionado -->
    <v-card v-if="cargoSeleccionado" class="mt-4 elevation-2 border" rounded="lg">
      <v-card-title class="d-flex flex-wrap align-center justify-space-between py-3 px-4 bg-primary text-white border-b">
        <div>
          <div class="text-subtitle-1 font-weight-bold d-flex align-center">
            <v-icon icon="mdi-format-list-checks" class="me-2" />
            Conceptos de Liquidación — Cargo #{{ cargoSeleccionado.ID || cargoSeleccionado.Id }} (Orden {{ cargoSeleccionado.ORDEN }})
          </div>
          <div class="text-caption text-white opacity-90">
            Agente: {{ personaSeleccionada?.APELLIDOYNOMBRE || `${cargoSeleccionado.PERSONAAPELLIDO || ''}, ${cargoSeleccionado.PERSONANOMBRE || ''}` }}
            | DNI: {{ documento(cargoSeleccionado.PERSONADOCUMENTO || personaSeleccionada?.DOCUMENTO) }}
            | Repartición: {{ cargoSeleccionado.REPARTICIONID }}
          </div>
        </div>

        <!-- Acciones sobre el cargo seleccionado -->
        <div class="d-flex flex-wrap align-center ga-2 mt-2 mt-sm-0">
          <v-btn
            :color="cargoSeleccionado.SALARIO === 1 ? 'warning' : 'teal-lighten-4'"
            variant="flat"
            size="small"
            prepend-icon="mdi-scale-balance"
            @click="solicitarToggleCobraLey"
          >
            {{ cargoSeleccionado.SALARIO === 1 ? 'Establecer que Ya No Cobra Ley' : 'Habilitar Cobro de Ley' }}
          </v-btn>

          <v-btn
            v-if="cargoSeleccionado.ESTADOCARGOID === 1"
            color="red-lighten-4"
            variant="flat"
            size="small"
            class="text-red-darken-4 font-weight-bold"
            prepend-icon="mdi-account-arrow-down"
            @click="abrirBajaCargo"
          >
            Dar de Baja al Cargo
          </v-btn>

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
        </div>
      </v-card-title>

      <v-card-text class="pa-4">
        <div v-if="cargandoConceptos" class="d-flex align-center justify-center pa-6">
          <v-progress-circular indeterminate color="primary" class="me-2"></v-progress-circular>
          Cargando conceptos de liquidación del cargo...
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
                  <div class="d-flex align-center justify-center">
                    <TooltipButton
                      icono="mdi-pencil"
                      toolMsg="Editar Concepto"
                      :funcion="() => editarConcepto(item)"
                      color="primary"
                    />
                    <TooltipButton
                      icono="mdi-delete"
                      toolMsg="Eliminar Concepto"
                      :funcion="() => solicitarEliminarConcepto(item.ID || item.Id)"
                      color="error"
                    />
                  </div>
                </td>
                <td class="text-right pa-1 font-weight-medium">{{ item.CODIGO }}</td>
                <td class="text-right pa-1">{{ item.SUBCODIGO }}</td>
                <td class="text-right pa-1">{{ item.PARAMETRO1 }}</td>
                <td class="text-right pa-1">{{ item.PARAMETRO2 }}</td>
                <td class="text-right pa-1 font-weight-bold">{{ financial(item.IMPORTE) }}</td>
                <td class="text-center pa-1">{{ getVto(item.VENCIMIENTO) || '—' }}</td>
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
        </div>
      </v-card-text>
    </v-card>

    <!-- Diálogos Modales -->
    <BajaCargoDialog
      v-model="bajaCargoModalAbierto"
      :cargo="cargoSeleccionado"
      @baja-confirmada="onBajaConfirmada"
    />

    <ConceptoLiqModal
      v-if="cargoSeleccionado"
      v-model="conceptoModalAbierto"
      :registro="conceptoEditar"
      :cargo-id="cargoSeleccionado?.ID || cargoSeleccionado?.Id || 0"
      @guardado="onConceptoGuardado"
    />

    <ConfirmacionDialog
      v-model="confirmacionEliminarConcepto"
      titulo="Eliminar Concepto de Liquidación"
      mensaje="¿Está seguro de que desea eliminar este concepto de liquidación del cargo?"
      @confirmar="() => eliminarConcepto(idConceptoEliminar)"
    />

    <ConfirmacionDialog
      v-model="confirmacionCobraLey"
      titulo="Modificar Cobro de Ley"
      :mensaje="`¿Está seguro de que desea cambiar la condición de cobro de ley del Cargo #${cargoSeleccionado?.ID || cargoSeleccionado?.Id} a '${cargoSeleccionado?.SALARIO === 1 ? 'NO COBRA' : 'SÍ COBRA'}'?`"
      @confirmar="ejecutarToggleCobraLey"
    />
  </v-container>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
