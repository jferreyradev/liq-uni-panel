// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import ConceptosCargoView from "../views/ConceptosCargoView.vue";
import BajaCargoDialog from "../components/BajaCargoDialog.vue";
import ConceptoLiqModal from "../components/ConceptoLiqModal.vue";
import EditarCargoModal from "../components/EditarCargoModal.vue";
import { conceptosRoutes } from "../routes";

const mockLeerDatos = vi.fn();
const mockEjecutarSP = vi.fn();

vi.mock("@/shared/services/apiService", () => ({
  leerDatos: (...args) => mockLeerDatos(...args),
  ejecutarSP: (...args) => mockEjecutarSP(...args),
}));

describe("Módulo de Conceptos por Cargo", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    mockLeerDatos.mockImplementation(async (url) => {
      if (url.includes("view/periodo")) {
        return {
          operacionOk: true,
          datos: [{ PERIODO: "2025-05-01" }],
        };
      }
      if (url.includes("view/personaLista")) {
        return {
          operacionOk: true,
          datos: [
            {
              PERSONAID: 50,
              DOCUMENTO: "28111222",
              PERSONACUIL: "20281112223",
              APELLIDO: "GOMEZ",
              NOMBRE: "CARLOS",
              APELLIDOYNOMBRE: "GOMEZ, CARLOS",
              COBRALEY: 0,
            },
          ],
        };
      }
      if (url.includes("view/cargo")) {
        return {
          operacionOk: true,
          datos: [
            {
              ID: 301,
              PERSONAID: 50,
              REPARTICIONID: 469,
              ORDEN: 1,
              TIPOEMPLEOID: 1,
              CATEGORIA: 15,
              ESTADOCARGOID: 1,
              SALARIO: 1,
              PERSONAAPELLIDO: "GOMEZ",
              PERSONANOMBRE: "CARLOS",
            },
          ],
        };
      }
      if (url.includes("conceptoLiq") || url.includes("conceptosLiq")) {
        return {
          operacionOk: true,
          datos: [
            {
              ID: 801,
              CARGOID: 301,
              CODIGO: 101,
              SUBCODIGO: 0,
              PARAMETRO1: 1,
              PARAMETRO2: 0,
              IMPORTE: 125000.5,
              VENCIMIENTO: "2025-12-01",
              PERIODO: "2025-05-01",
              GRUPOADICIONALID: 0,
              PENLEY: 1,
            },
          ],
        };
      }
      return { operacionOk: true, datos: [] };
    });

    mockEjecutarSP.mockResolvedValue({
      operacionOk: true,
      valorError: 0,
      datos: null,
      out: { vError: 0 },
    });
  });

  describe("Rutas", () => {
    it("define la ruta /conceptos y alias /conceptos-cargo", () => {
      const ruta = conceptosRoutes.find((r) => r.path === "/conceptos");
      expect(ruta).toBeDefined();
      expect(ruta.name).toBe("conceptosCargo");
      expect(ruta.alias).toBe("/conceptos-cargo");
    });
  });

  describe("BajaCargoDialog", () => {
    it("invoca sp/cargos_spuCargo con vIDESTADOCARGO = 3 y vFECHABAJA", async () => {
      const cargo = {
        ID: 301,
        REPARTICIONID: 469,
        ORDEN: 1,
        TIPOEMPLEOID: 1,
        CATEGORIA: 15,
        ESTADOCARGOID: 1,
      };

      const wrapper = mount(BajaCargoDialog, {
        props: {
          modelValue: true,
          cargo,
        },
      });
      await flushPromises();

      wrapper.vm.fechaBaja = "15/05/2025";
      await wrapper.vm.confirmarBaja();
      await flushPromises();

      expect(mockEjecutarSP).toHaveBeenCalledWith(
        "sp/cargos_spuCargo",
        expect.objectContaining({
          vIDCARGO: 301,
          vIDESTADOCARGO: 3,
        })
      );
      expect(wrapper.emitted("baja-confirmada")).toBeTruthy();
    });
  });

  describe("EditarCargoModal", () => {
    it("invoca sp/cargos_spuCargo al guardar cambios de los campos del cargo", async () => {
      const cargo = {
        ID: 301,
        REPARTICIONID: 469,
        ORDEN: 2,
        AFILIADO: 10,
        ANTIGUEDAD: 5,
        TIPOEMPLEOID: 1,
        SITUACIONREVISTAID: 1,
        CATEGORIA: 18,
        TIPOOBRASOCIALID: 1,
        TIPOLIQUIDACIONID: 1,
        ESTADOCARGOID: 1,
      };

      const wrapper = mount(EditarCargoModal, {
        props: {
          modelValue: true,
          cargo,
        },
      });
      await flushPromises();

      wrapper.vm.categoria = 20;
      wrapper.vm.orden = 3;
      await wrapper.vm.guardar();
      await flushPromises();

      expect(mockEjecutarSP).toHaveBeenCalledWith(
        "sp/cargos_spuCargo",
        expect.objectContaining({
          vIDCARGO: 301,
          vCATEGORIA: 20,
          vORDEN: 3,
        })
      );
      expect(wrapper.emitted("cargo-actualizado")).toBeTruthy();
    });

    it("actualiza el cargo con éxito cuando el SP devuelve código 0 como string o en out.vError", async () => {
      mockEjecutarSP.mockResolvedValueOnce({
        operacionOk: true,
        valorError: "0",
        out: { vError: 0, error: "0" },
      });

      const cargo = {
        Id: 302,
        REPARTICIONID: 469,
        ORDEN: 2,
        AFILIADO: 0,
        ANTIGUEDAD: 5,
        TIPOEMPLEOID: 1,
        SITUACIONREVISTAID: 1,
        TIPOOBRASOCIALID: 1,
        CATEGORIA: 18,
        TIPOLIQUIDACIONID: 1,
        ESTADOCARGOID: 1,
      };

      const wrapper = mount(EditarCargoModal, {
        props: {
          modelValue: true,
          cargo,
        },
      });
      await flushPromises();

      await wrapper.vm.guardar();
      await flushPromises();

      expect(wrapper.vm.errorMessage).toBe("");
      expect(wrapper.emitted("cargo-actualizado")).toBeTruthy();
    });

    it("recupera el cargoId consultando la entidad base cargo si el objeto no traía ID", async () => {
      mockLeerDatos.mockImplementation(async (url) => {
        if (url.includes("cargo")) {
          return {
            operacionOk: true,
            datos: [{ ID: 999, ReparticionId: 469, Orden: 5 }],
          };
        }
        return { operacionOk: true, datos: [] };
      });

      const cargoSinId = {
        ReparticionId: 469,
        Orden: 5,
        TipoEmpleoId: 1,
        SituacionRevistaId: 1,
        TipoObraSocialId: 1,
        TipoLiquidacionId: 1,
        EstadoCargoId: 1,
        Categoria: 10,
      };

      const wrapper = mount(EditarCargoModal, {
        props: {
          modelValue: true,
          cargo: cargoSinId,
        },
      });
      await flushPromises();

      await wrapper.vm.guardar();
      await flushPromises();

      expect(mockEjecutarSP).toHaveBeenCalledWith(
        "sp/cargos_spuCargo",
        expect.objectContaining({
          vIDCARGO: 999,
          vIDREP: 469,
          vORDEN: 5,
        })
      );
      expect(wrapper.emitted("cargo-actualizado")).toBeTruthy();
    });

    it("actualiza el cargo reconociendo idcargo tanto en el objeto como en el payload enviado al SP", async () => {
      const cargoConIdCargo = {
        idcargo: 450,
        ReparticionId: 469,
        Orden: 1,
        TipoEmpleoId: 1,
        SituacionRevistaId: 1,
        TipoObraSocialId: 1,
        TipoLiquidacionId: 1,
        EstadoCargoId: 1,
        Categoria: 12,
      };

      const wrapper = mount(EditarCargoModal, {
        props: {
          modelValue: true,
          cargo: cargoConIdCargo,
        },
      });
      await flushPromises();

      await wrapper.vm.guardar();
      await flushPromises();

      expect(mockEjecutarSP).toHaveBeenCalledWith(
        "sp/cargos_spuCargo",
        expect.objectContaining({
          vIDCARGO: 450,
          idcargo: 450,
          IdCargo: 450,
          vIDREP: 469,
          vORDEN: 1,
        })
      );
      expect(wrapper.emitted("cargo-actualizado")).toBeTruthy();
    });

    it("incluye el campo observacion y envía null en fechas vacías para evitar errores en SQL Server", async () => {
      const cargoConObs = {
        Id: 501,
        ReparticionId: 469,
        Orden: 1,
        TipoEmpleoId: 1,
        SituacionRevistaId: 1,
        TipoObraSocialId: 1,
        TipoLiquidacionId: 1,
        EstadoCargoId: 1,
        Categoria: 10,
        Observacion: "Observación inicial",
      };

      const wrapper = mount(EditarCargoModal, {
        props: {
          modelValue: true,
          cargo: cargoConObs,
        },
      });
      await flushPromises();

      expect(wrapper.vm.observacion).toBe("Observación inicial");

      // Modificar la observación
      wrapper.vm.observacion = "Cambio de categoría por resolución 123";
      await wrapper.vm.guardar();
      await flushPromises();

      expect(mockEjecutarSP).toHaveBeenCalledWith(
        "sp/cargos_spuCargo",
        expect.objectContaining({
          vIDCARGO: 501,
          vOBSERVACION: "Cambio de categoría por resolución 123",
          vFECHABAJA: null,
          vVTOESC: null,
        })
      );
    });

    it("no permite editar el Tipo de Empleo ni el Tipo de Liquidación", async () => {
      const cargo = {
        Id: 502,
        ReparticionId: 469,
        Orden: 1,
        TipoEmpleoId: 1,
        TipoLiquidacionId: 1,
        SituacionRevistaId: 1,
        TipoObraSocialId: 1,
        EstadoCargoId: 1,
      };

      const wrapper = mount(EditarCargoModal, {
        props: {
          modelValue: true,
          cargo,
        },
      });
      await flushPromises();

      const selects = wrapper.findAllComponents({ name: "VSelect" });
      const selectTipoEmpleo = selects.find((s) => s.props("label")?.includes("Tipo de Empleo"));
      const selectTipoLiq = selects.find((s) => s.props("label")?.includes("Tipo Liquidación"));

      expect(selectTipoEmpleo.props("disabled")).toBe(true);
      expect(selectTipoLiq.props("disabled")).toBe(true);
    });
  });

  describe("ConceptoLiqModal", () => {
    it("invoca sp/ConceptoLiqIns al guardar un concepto nuevo", async () => {
      const wrapper = mount(ConceptoLiqModal, {
        props: {
          modelValue: true,
          cargoId: 301,
          periodoDefault: "05/2025",
        },
      });
      await flushPromises();

      wrapper.vm.concepto.CODIGO = "102";
      wrapper.vm.concepto.IMPORTE = "50000.00";
      wrapper.vm.periodo = "05/2025";
      wrapper.vm.concepto.PENLEY = true;
      await wrapper.vm.$nextTick();

      await wrapper.vm.guardar();
      await flushPromises();

      expect(mockEjecutarSP).toHaveBeenCalledWith(
        "sp/conceptoliq_spiConceptoliq",
        expect.objectContaining({
          vIDCARGO: 301,
          vCODIGO: 102,
          vPENLEY: 1,
        })
      );
      expect(wrapper.emitted("guardado")).toBeTruthy();
    });

    it("invoca sp/ConceptoLiqUpd al modificar un concepto existente", async () => {
      const registro = {
        ID: 801,
        CODIGO: 101,
        SUBCODIGO: 0,
        PARAMETRO1: 1,
        PARAMETRO2: 0,
        IMPORTE: 125000.5,
        PERIODO: "2025-05-01",
        PENLEY: 1,
      };

      const wrapper = mount(ConceptoLiqModal, {
        props: {
          modelValue: true,
          registro,
          cargoId: 301,
        },
      });
      await flushPromises();

      wrapper.vm.concepto.IMPORTE = "130000.00";
      await wrapper.vm.guardar();
      await flushPromises();

      expect(mockEjecutarSP).toHaveBeenCalledWith(
        "sp/conceptoliq_spuConceptoliq",
        expect.objectContaining({
          vIDCONCEPTOLIQ: 801,
          vIDCARGO: 301,
        })
      );
    });

    it("permite guardar concepto con código 0 y lo trata como éxito cuando el SP devuelve código 0", async () => {
      mockEjecutarSP.mockResolvedValueOnce({
        operacionOk: true,
        valorError: "0",
        out: { vError: 0, error: "0" },
      });

      const wrapper = mount(ConceptoLiqModal, {
        props: {
          modelValue: true,
          cargoId: 301,
          periodoDefault: "05/2025",
        },
      });
      await flushPromises();

      wrapper.vm.concepto.CODIGO = "0";
      wrapper.vm.concepto.IMPORTE = "15000.00";
      await wrapper.vm.$nextTick();

      await wrapper.vm.guardar();
      await flushPromises();

      expect(mockEjecutarSP).toHaveBeenCalledWith(
        "sp/conceptoliq_spiConceptoliq",
        expect.objectContaining({
          vIDCARGO: 301,
          vCODIGO: 0,
        })
      );
      expect(wrapper.vm.errorMessage).toBe("");
      expect(wrapper.emitted("guardado")).toBeTruthy();
    });

    it("trata el alta de concepto como éxito cuando el SP devuelve el ID insertado en valorError y envía null en vVTO vacío", async () => {
      mockEjecutarSP.mockResolvedValueOnce({
        operacionOk: true,
        valorError: 850,
      });

      const wrapper = mount(ConceptoLiqModal, {
        props: {
          modelValue: true,
          cargoId: 301,
          periodoDefault: "05/2025",
        },
      });
      await flushPromises();

      wrapper.vm.concepto.CODIGO = "105";
      wrapper.vm.concepto.IMPORTE = "25000.00";
      wrapper.vm.periodo = "05/2025";
      wrapper.vm.vencimiento = ""; // Sin vencimiento
      await wrapper.vm.$nextTick();

      await wrapper.vm.guardar();
      await flushPromises();

      expect(mockEjecutarSP).toHaveBeenCalledWith(
        "sp/conceptoliq_spiConceptoliq",
        expect.objectContaining({
          vIDCARGO: 301,
          vCODIGO: 105,
          vVTO: null,
        })
      );
      expect(wrapper.vm.errorMessage).toBe("");
      expect(wrapper.emitted("guardado")).toBeTruthy();
    });

    it("ejecuta fallback a sp/ConceptoLiqIns si sp/conceptoliq_spiConceptoliq no se encuentra", async () => {
      mockEjecutarSP
        .mockResolvedValueOnce({
          operacionOk: false,
          estado: 500,
          errmsg: "Could not find stored procedure 'conceptoliq_spiConceptoliq'",
        })
        .mockResolvedValueOnce({
          operacionOk: true,
          valorError: 0,
        });

      const wrapper = mount(ConceptoLiqModal, {
        props: {
          modelValue: true,
          cargoId: 301,
          periodoDefault: "05/2025",
        },
      });
      await flushPromises();

      wrapper.vm.concepto.CODIGO = "110";
      wrapper.vm.concepto.IMPORTE = "30000.00";
      await wrapper.vm.$nextTick();

      await wrapper.vm.guardar();
      await flushPromises();

      expect(mockEjecutarSP).toHaveBeenCalledWith(
        "sp/ConceptoLiqIns",
        expect.objectContaining({
          vIDCARGO: 301,
          vCODIGO: 110,
        })
      );
      expect(wrapper.vm.errorMessage).toBe("");
      expect(wrapper.emitted("guardado")).toBeTruthy();
    });
  });

  describe("ConceptosCargoView", () => {
    it("permite buscar una persona, ver sus cargos y listar conceptos", async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/conceptos", component: ConceptosCargoView }],
      });

      const wrapper = mount(ConceptosCargoView, {
        global: { plugins: [router] },
      });
      await flushPromises();

      // Buscar persona por documento
      wrapper.vm.busquedaTexto = "28111222";
      await wrapper.vm.buscarPersonas();
      await flushPromises();

      expect(mockLeerDatos).toHaveBeenCalledWith(
        "view/personaLista",
        expect.objectContaining({ query: { Documento: "28111222" } })
      );
      expect(wrapper.vm.personaSeleccionada).toBeDefined();
      expect(wrapper.vm.personaSeleccionada.PERSONAID).toBe(50);

      // Cargos cargados y seleccionados
      expect(mockLeerDatos).toHaveBeenCalledWith(
        "view/cargo",
        expect.objectContaining({ query: expect.objectContaining({ PersonaId: 50 }) })
      );
      expect(wrapper.vm.cargoSeleccionado).toBeDefined();
      expect(wrapper.vm.cargoSeleccionado.ID).toBe(301);
      // No se cargan conceptos automáticamente (solo si se solicita)
      expect(wrapper.vm.listaConceptos.length).toBe(0);

      // Cargar conceptos bajo demanda al presionar el botón en el cargo
      await wrapper.vm.abrirConceptosLiq(wrapper.vm.cargoSeleccionado);
      await flushPromises();

      expect(mockLeerDatos).toHaveBeenCalledWith(
        "view/conceptosLiq",
        expect.objectContaining({ query: expect.objectContaining({ idCargo: 301 }) })
      );
      expect(wrapper.vm.modalConceptosAbierto).toBe(true);
      expect(wrapper.vm.listaConceptos.length).toBe(1);
    });

    it("refleja certeramente la condición de cobra ley a partir de view/personaLista (0 = cobra ley, 1 = no cobra ley)", async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/conceptos", component: ConceptosCargoView }],
      });

      const wrapper = mount(ConceptosCargoView, {
        global: { plugins: [router] },
      });
      await flushPromises();

      wrapper.vm.busquedaTexto = "28111222";
      await wrapper.vm.buscarPersonas();
      await flushPromises();

      // En el mock la persona tiene COBRALEY: 0 => SÍ cobra ley (cobraLey = true, getCobraLey = 1)
      expect(wrapper.vm.cobraLey(wrapper.vm.cargoSeleccionado)).toBe(true);
      expect(wrapper.vm.getCobraLey(wrapper.vm.cargoSeleccionado)).toBe(1);

      // Si NOCOBRALEY es 1 => NO cobra ley (cobraLey = false, getCobraLey = 0)
      const cargoNoCobra = { ID: 999, PERSONADOCUMENTO: "99999999", NOCOBRALEY: 1 };
      expect(wrapper.vm.cobraLey(cargoNoCobra)).toBe(false);
      expect(wrapper.vm.getCobraLey(cargoNoCobra)).toBe(0);

      // Si NOCOBRALEY es 0 => SÍ cobra ley (cobraLey = true, getCobraLey = 1)
      const cargoSiCobra = { ID: 998, PERSONADOCUMENTO: "88888888", NOCOBRALEY: 0 };
      expect(wrapper.vm.cobraLey(cargoSiCobra)).toBe(true);
      expect(wrapper.vm.getCobraLey(cargoSiCobra)).toBe(1);
    });

    it("permite eliminar un concepto de liquidación", async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/conceptos", component: ConceptosCargoView }],
      });

      const wrapper = mount(ConceptosCargoView, {
        global: { plugins: [router] },
      });
      await flushPromises();

      wrapper.vm.busquedaTexto = "28111222";
      await wrapper.vm.buscarPersonas();
      await flushPromises();

      await wrapper.vm.eliminarConcepto(801);
      await flushPromises();

      expect(mockEjecutarSP).toHaveBeenCalledWith("sp/conceptoliq_spdConceptoliq", {
        vIDCONCEPTOLIQ: 801,
      });
    });

    it("permite filtrar cargos por tipo de liquidación", async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/conceptos", component: ConceptosCargoView }],
      });

      const wrapper = mount(ConceptosCargoView, {
        global: { plugins: [router] },
      });
      await flushPromises();

      // Cambiar tipo de liquidación a SAC (value: 2)
      wrapper.vm.tipoLiqSeleccionado = 2;
      await wrapper.vm.onTipoLiqChange();
      await flushPromises();

      expect(mockLeerDatos).toHaveBeenCalledWith(
        "view/cargo",
        expect.objectContaining({
          query: expect.objectContaining({ TipoLiquidacionId: 2, EstadoCargoId: 1 }),
        })
      );
    });

    it("permite filtrar cargos combinando tipo de liquidación e input de búsqueda", async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/conceptos", component: ConceptosCargoView }],
      });

      const wrapper = mount(ConceptosCargoView, {
        global: { plugins: [router] },
      });
      await flushPromises();

      // Búsqueda por apellido dentro de Adicional (value: 5)
      wrapper.vm.tipoLiqSeleccionado = 5;
      wrapper.vm.busquedaTexto = "PEREZ";
      await wrapper.vm.cargarCargos();
      await flushPromises();

      expect(mockLeerDatos).toHaveBeenCalledWith(
        "view/cargo",
        expect.objectContaining({
          query: expect.objectContaining({
            TipoLiquidacionId: 5,
            search: expect.stringContaining("PEREZ"),
          }),
        })
      );
    });

    it("calcula la suma total de importes de conceptos del cargo seleccionado", async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/conceptos", component: ConceptosCargoView }],
      });

      const wrapper = mount(ConceptosCargoView, {
        global: { plugins: [router] },
      });
      await flushPromises();

      wrapper.vm.listaConceptos = [
        { ID: 1, CODIGO: 101, IMPORTE: 50000 },
        { ID: 2, CODIGO: 201, IMPORTE: 12500.5 },
      ];
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.totalImporteConceptos).toBe(62500.5);
    });

    it("permite limpiar los filtros y restaurar valores por defecto", async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/conceptos", component: ConceptosCargoView }],
      });

      const wrapper = mount(ConceptosCargoView, {
        global: { plugins: [router] },
      });
      await flushPromises();

      wrapper.vm.busquedaTexto = "FILTRO";
      wrapper.vm.tipoLiqSeleccionado = 5;
      wrapper.vm.soloCargosVigentes = false;

      await wrapper.vm.limpiarFiltros();
      await flushPromises();

      expect(wrapper.vm.busquedaTexto).toBe("");
      expect(wrapper.vm.tipoLiqSeleccionado).toBe(1);
      expect(wrapper.vm.soloCargosVigentes).toBe(true);
    });

    it("define las columnas requeridas para el listado de cargos a partir del schema de view/cargo", async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/conceptos", component: ConceptosCargoView }],
      });

      const wrapper = mount(ConceptosCargoView, {
        global: { plugins: [router] },
      });
      await flushPromises();

      const keys = wrapper.vm.headersCargos.map((h) => h.key);
      expect(keys).toEqual([
        "ACCIONES",
        "ReparticionId",
        "Orden",
        "PersonaDocumento",
        "PersonaApellido",
        "PersonaNombre",
        "Categoria",
        "Antiguedad",
        "VtoEscalafon",
        "TipoEmpleoDescripcion",
        "SituacionRevistaDescripcion",
        "FechaBaja",
        "EstadoCargoDescripcion",
        "TipoObraSocialDescripcion",
        "TipoLiquidacionDescripcion",
        "Salario",
        "UniOrg",
      ]);
    });

    it("abre ventana flotante y consulta view/conceptosLiq solo si se solicita", async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/conceptos", component: ConceptosCargoView }],
      });

      const wrapper = mount(ConceptosCargoView, {
        global: { plugins: [router] },
      });
      await flushPromises();

      // Al inicio no debe haber cargado conceptos ni abierto la ventana
      expect(wrapper.vm.modalConceptosAbierto).toBe(false);
      expect(wrapper.vm.listaConceptos.length).toBe(0);

      // Abrir conceptos del cargo bajo demanda
      const cargo = { ID: 301, Orden: 1, PersonaApellido: "GOMEZ", PersonaNombre: "CARLOS" };
      await wrapper.vm.abrirConceptosLiq(cargo);
      await flushPromises();

      expect(wrapper.vm.modalConceptosAbierto).toBe(true);
      expect(mockLeerDatos).toHaveBeenCalledWith(
        "view/conceptosLiq",
        expect.objectContaining({ query: expect.objectContaining({ idCargo: 301 }) })
      );
      expect(wrapper.vm.listaConceptos.length).toBe(1);

      // Cerrar ventana flotante
      wrapper.vm.cerrarModalConceptos();
      expect(wrapper.vm.modalConceptosAbierto).toBe(false);
    });

    it("permite ordenar la grilla de cargos por sus columnas numéricas y de texto", async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/conceptos", component: ConceptosCargoView }],
      });

      const wrapper = mount(ConceptosCargoView, {
        global: { plugins: [router] },
      });
      await flushPromises();

      const headers = wrapper.vm.headersCargos;
      const repHeader = headers.find((h) => h.key === "ReparticionId");
      const apellidoHeader = headers.find((h) => h.key === "PersonaApellido");
      const ordenHeader = headers.find((h) => h.key === "Orden");
      const salarioHeader = headers.find((h) => h.key === "Salario");

      expect(typeof repHeader.value).toBe("function");
      expect(typeof apellidoHeader.value).toBe("function");
      expect(typeof ordenHeader.value).toBe("function");
      expect(typeof salarioHeader.value).toBe("function");

      const cargoA = { REPARTICIONID: 469, ORDEN: 2, PERSONAAPELLIDO: "ZAPATA", SALARIO: 1 };
      const cargoB = { ReparticionId: 460, Orden: 1, PersonaApellido: "ALVAREZ", Salario: 0 };

      expect(repHeader.value(cargoA)).toBe(469);
      expect(repHeader.value(cargoB)).toBe(460);
      expect(apellidoHeader.value(cargoA)).toBe("zapata");
      expect(apellidoHeader.value(cargoB)).toBe("alvarez");
      expect(ordenHeader.value(cargoA)).toBe(2);
      expect(ordenHeader.value(cargoB)).toBe(1);
      expect(salarioHeader.value(cargoA)).toBe(1);
      expect(salarioHeader.value(cargoB)).toBe(0);
    });

    it("carga la nómina de cargos sin imponer un límite artificial de 50 registros", async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/conceptos", component: ConceptosCargoView }],
      });

      const wrapper = mount(ConceptosCargoView, {
        global: { plugins: [router] },
      });
      await flushPromises();

      mockLeerDatos.mockClear();
      await wrapper.vm.cargarCargos();
      await flushPromises();

      expect(mockLeerDatos).toHaveBeenCalledWith(
        "view/cargo",
        expect.objectContaining({
          query: expect.not.objectContaining({ limit: 50 }),
        })
      );
    });

    it("ubica la columna de vencimiento inmediatamente después del parámetro 2 en los conceptos", async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/conceptos", component: ConceptosCargoView }],
      });

      const wrapper = mount(ConceptosCargoView, {
        global: { plugins: [router] },
      });
      await flushPromises();

      const keys = wrapper.vm.headersConceptos.map((h) => h.key);
      const idxParam2 = keys.indexOf("PARAMETRO2");
      const idxVto = keys.indexOf("VENCIMIENTO");
      const idxImporte = keys.indexOf("IMPORTE");

      expect(idxVto).toBe(idxParam2 + 1);
      expect(idxImporte).toBe(idxVto + 1);
    });
  });
});
