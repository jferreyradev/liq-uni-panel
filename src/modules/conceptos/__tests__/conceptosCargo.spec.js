// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import ConceptosCargoView from "../views/ConceptosCargoView.vue";
import BajaCargoDialog from "../components/BajaCargoDialog.vue";
import ConceptoLiqModal from "../components/ConceptoLiqModal.vue";
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
              COBRALEY: 1,
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
      if (url.includes("conceptoLiq")) {
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
    it("invoca sp/CargoUpd con vIDESTADOCARGO = 3 y vFECHABAJA", async () => {
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
        "sp/CargoUpd",
        expect.objectContaining({
          vIDCARGO: 301,
          vIDESTADOCARGO: 3,
        })
      );
      expect(wrapper.emitted("baja-confirmada")).toBeTruthy();
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
        "sp/ConceptoLiqIns",
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
        "sp/ConceptoLiqUpd",
        expect.objectContaining({
          vIDCONCEPTOLIQ: 801,
          vIDCARGO: 301,
        })
      );
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

      // Conceptos cargados
      expect(mockLeerDatos).toHaveBeenCalledWith(
        "view/conceptoLiq",
        expect.objectContaining({ query: expect.objectContaining({ CargoId: 301 }) })
      );
      expect(wrapper.vm.listaConceptos.length).toBe(1);
    });

    it("permite cambiar la condición de cobro de ley del cargo", async () => {
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

      expect(wrapper.vm.cargoSeleccionado.SALARIO).toBe(1);

      // Ejecutar toggle de cobro de ley
      await wrapper.vm.ejecutarToggleCobraLey();
      await flushPromises();

      expect(mockEjecutarSP).toHaveBeenCalledWith(
        "sp/CargoUpd",
        expect.objectContaining({
          vIDCARGO: 301,
          vSALARIO: 0,
        })
      );
      expect(wrapper.vm.cargoSeleccionado.SALARIO).toBe(0);
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

      expect(mockEjecutarSP).toHaveBeenCalledWith("sp/ConceptoLiqDel", {
        vIDCONCEPTOLIQ: 801,
      });
    });
  });
});
