// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { setActivePinia, createPinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import OperacionesView from "../views/OperacionesView.vue";
import OperacionTransformacion from "../components/OperacionTransformacion.vue";
import OperacionLiquidacion from "../components/OperacionLiquidacion.vue";
import OperacionBoletas from "../components/OperacionBoletas.vue";
import MonitorProcesos from "../components/MonitorProcesos.vue";
import { operacionesRoutes } from "../routes";

const mockLeerDatos = vi.fn();
const mockEjecutarSP_SinEspera = vi.fn();

vi.mock("@/shared/services/apiService", () => ({
  leerDatos: (...args) => mockLeerDatos(...args),
  ejecutarSP_SinEspera: (...args) => mockEjecutarSP_SinEspera(...args),
  ejecutarSP: vi.fn(async () => ({ operacionOk: true, salida: 0 })),
}));

describe("Módulo de Operaciones", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    mockLeerDatos.mockImplementation(async (url) => {
      if (url.includes("view/periodo")) {
        return {
          operacionOk: true,
          datos: [{ PERIODO: "2025-04-01" }],
        };
      }
      if (url.includes("view/logProcesos")) {
        return {
          operacionOk: true,
          datos: [
            {
              ID: 101,
              ESTADO: "TERMINADO",
              PROCEDIMIENTO: "sp/transform",
              INICIO: "10:00",
              FIN: "10:02",
              PARAMETROS: "Periodo: 04/2025",
              TIPO: 1,
            },
          ],
        };
      }
      if (url.includes("view/personaLista")) {
        return {
          operacionOk: true,
          datos: [
            {
              PERSONAID: 99,
              DOCUMENTO: "20123456",
              APELLIDOYNOMBRE: "PEREZ, JUAN",
            },
          ],
        };
      }
      return { operacionOk: true, datos: [] };
    });

    mockEjecutarSP_SinEspera.mockResolvedValue({ salida: 0 });
  });

  describe("Rutas del Módulo", () => {
    it("define la ruta /operaciones", () => {
      const rutaOperaciones = operacionesRoutes.find((r) => r.path === "/operaciones");
      expect(rutaOperaciones).toBeDefined();
      expect(rutaOperaciones.name).toBe("operaciones");
    });
  });

  describe("OperacionTransformacion", () => {
    it("inicializa con el período activo e invoca sp/transform al confirmar", async () => {
      const wrapper = mount(OperacionTransformacion);
      await flushPromises();

      expect(wrapper.text()).toContain("Transformación de Novedades");

      // Forzar validación exitosa y ejecutar
      await wrapper.vm.ejecutarTransformacion();
      await flushPromises();

      expect(mockEjecutarSP_SinEspera).toHaveBeenCalledWith(
        "sp/transform",
        expect.objectContaining({
          GrupoRep: 1,
          TipoLiq: 1,
        })
      );
      expect(wrapper.emitted("proceso-iniciado")).toBeTruthy();
    });
  });

  describe("OperacionLiquidacion", () => {
    it("permite liquidación masiva por repartición", async () => {
      const wrapper = mount(OperacionLiquidacion);
      await flushPromises();

      expect(wrapper.text()).toContain("Cálculo de Liquidación");
      await wrapper.vm.ejecutarLiquidacion();
      await flushPromises();

      expect(mockEjecutarSP_SinEspera).toHaveBeenCalledWith(
        "sp/liq",
        expect.objectContaining({
          IdPersona: 0,
        })
      );
      expect(wrapper.emitted("proceso-iniciado")).toBeTruthy();
    });

    it("consulta datos del agente por DNI en el modo individual", async () => {
      const wrapper = mount(OperacionLiquidacion);
      await flushPromises();

      wrapper.vm.formaLiquidarSelected = { name: "Individual", value: 2 };
      wrapper.vm.dni = "20123456";
      await wrapper.vm.consultarPersona();
      await flushPromises();

      expect(mockLeerDatos).toHaveBeenCalledWith(
        "view/personaLista",
        expect.objectContaining({ query: { Documento: "20123456" } })
      );
      expect(wrapper.vm.personaId).toBe(99);
      expect(wrapper.vm.apeynom).toBe("PEREZ, JUAN");

      await wrapper.vm.ejecutarLiquidacion();
      await flushPromises();

      expect(mockEjecutarSP_SinEspera).toHaveBeenCalledWith(
        "sp/liq",
        expect.objectContaining({
          IdPersona: 99,
          CargoId: 0,
        })
      );
    });

    it("permite liquidar por Cargo específico", async () => {
      const wrapper = mount(OperacionLiquidacion);
      await flushPromises();

      wrapper.vm.formaLiquidarSelected = { name: "Por Cargo", value: 3 };
      wrapper.vm.cargoId = 305;
      await wrapper.vm.ejecutarLiquidacion();
      await flushPromises();

      expect(mockEjecutarSP_SinEspera).toHaveBeenCalledWith(
        "sp/liq",
        expect.objectContaining({
          CargoId: 305,
        })
      );
    });
  });

  describe("OperacionBoletas", () => {
    it("invoca sp/generaResumenLiq al confirmar publicación", async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/boletas", component: { template: "<div>Boletas</div>" } }],
      });

      const wrapper = mount(OperacionBoletas, {
        global: { plugins: [router] },
      });
      await flushPromises();

      expect(wrapper.text()).toContain("Publicación y Generación de Boletas");
      await wrapper.vm.ejecutarPublicacion();
      await flushPromises();

      expect(mockEjecutarSP_SinEspera).toHaveBeenCalledWith(
        "sp/generaResumenLiq",
        expect.objectContaining({
          Idliq: 0,
          TipoLiquidacionId: 1,
        })
      );
      expect(wrapper.emitted("proceso-iniciado")).toBeTruthy();
    });
  });

  describe("MonitorProcesos", () => {
    it("carga y muestra el log de procesos desde view/logProcesos", async () => {
      const wrapper = mount(MonitorProcesos);
      await flushPromises();

      expect(mockLeerDatos).toHaveBeenCalledWith(expect.stringContaining("view/logProcesos"));
      expect(wrapper.text()).toContain("sp/transform");
      expect(wrapper.text()).toContain("TERMINADO");
    });
  });

  describe("OperacionesView", () => {
    it("renderiza las pestañas operativas y el monitor", async () => {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/operaciones", component: OperacionesView }],
      });

      const wrapper = mount(OperacionesView, {
        global: { plugins: [router] },
      });
      await flushPromises();

      expect(wrapper.text()).toContain("Módulo de Operaciones");
      expect(wrapper.text()).toContain("1. Transformación");
      expect(wrapper.text()).toContain("2. Liquidaciones");
      expect(wrapper.text()).toContain("3. Publicación Boletas");
      expect(wrapper.text()).toContain("Monitor de Procesos");
    });
  });
});
