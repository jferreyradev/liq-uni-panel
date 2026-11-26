// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import BloqueoLiquidaciones from "../components/BloqueoLiquidaciones.vue";

const mockUseFetch = vi.fn();
const mockEjecutarSP = vi.fn();
const mockLeerDatos = vi.fn();

vi.mock("@/composables/useFetch", () => ({
  useFetch: (...args) => mockUseFetch(...args),
}));

vi.mock("@/shared/services/apiService", () => ({
  ejecutarSP: (...args) => mockEjecutarSP(...args),
  leerDatos: (...args) => mockLeerDatos(...args),
}));

vi.mock("@/stores/filterStore", () => ({
  useFilterStore: () => ({
    filterStringLey: "TipoLiquidacionId=1&GrupoAdicionalId=0&Ley=0&Periodo=01/09/2026",
    periodoString: "Septiembre - 2026",
    periodoDMY: "01/09/2026",
    liqString: "Mensual-0 Septiembre-2026",
    tipoliq: 1,
    nroadi: 0,
    ley: 0,
    month: "09",
    year: 2026,
    serverIdRep: 400,
  }),
}));

vi.mock("@/composables/useEndPoints", () => ({
  useEndPoints: () => ({
    apiBase: { value: "https://api.test" },
    buildApiHeaders: () => ({ "x-project-key": "concepcion" }),
    getBoletasHeaders: () => ({ "x-project-key": "concepcion" }),
  }),
}));

const mockItems = [
  {
    LIQUIDACIONID: 67719,
    DOCUMENTO: 12414451,
    APELLIDO: "DIAZ",
    NOMBRE: "PEDRO PABLO",
    REPARTICIONID: 400,
    ORDEN: 261,
    AFILIADO: 168518,
    CUIL: 20124144516,
    CBU: "2850600140081000535857",
    HABERES: 1178200.07,
    RETENCIONES: 96075.88,
    NETO: 1082124.19,
    UNIORG: 2,
    BLOQ: 0,
    ESLEY: 0,
    PERIODO: "2026-09-01T03:00:00.000Z",
    FECHADEV: "2026-09-01T03:00:00.000Z",
    GRUPOADICIONALID: 0,
  },
  {
    LIQUIDACIONID: 67720,
    DOCUMENTO: 16541253,
    APELLIDO: "PORCEL",
    NOMBRE: "LILIANA",
    REPARTICIONID: 400,
    ORDEN: 14,
    AFILIADO: 194042,
    CUIL: 27165412538,
    CBU: "2850600140081000537211",
    HABERES: 1362725.93,
    RETENCIONES: 361636.58,
    NETO: 1001089.35,
    UNIORG: 1,
    BLOQ: 1,
    ESLEY: 1,
    PERIODO: "2026-09-01T03:00:00.000Z",
    FECHADEV: "2026-09-01T03:00:00.000Z",
    GRUPOADICIONALID: 0,
  },
];

describe("BloqueoLiquidaciones - Componente Principal de Bloqueo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFetch.mockReturnValue({
      data: ref([...mockItems]),
      error: ref(null),
      isPending: ref(false),
    });
    mockEjecutarSP.mockResolvedValue({
      operacionOk: true,
      salida: 0,
      estado: 200,
    });
  });

  it("renderiza el título destacado y la barra de búsqueda de cargo", async () => {
    const wrapper = mount(BloqueoLiquidaciones);
    await flushPromises();

    expect(wrapper.text()).toContain("Bloqueo de Liquidaciones / Cuentas Bancarias");
    expect(wrapper.text()).toContain("sp/acred_bloquearCtaBco");
    expect(wrapper.text()).toContain("Buscar cargo en la lista");
  });

  it("permite bloquear una liquidación individual vía sp/acred_bloquearCtaBco", async () => {
    const wrapper = mount(BloqueoLiquidaciones);
    await flushPromises();

    wrapper.vm.abrirConfirmacionIndividual(mockItems[0]);
    expect(wrapper.vm.mostrarDialogoBloqueo).toBe(true);
    expect(wrapper.vm.itemsABloquear).toHaveLength(1);

    await wrapper.vm.ejecutarBloqueoCtaBco();
    await flushPromises();

    expect(mockEjecutarSP).toHaveBeenCalledWith(
      "sp/acred_bloquearCtaBco",
      expect.objectContaining({
        vIDREP: 400,
        vORDEN: 261,
        vTIPOLIQ: 1,
        vNROADI: 0,
        vPERIODO: "2026-09-01T03:00:00.000Z",
        vVTO: "2026-09-01T03:00:00.000Z",
        vESLEY: 0,
      })
    );
    expect(wrapper.vm.mostrarAlert).toBe(true);
    expect(wrapper.vm.alertTipo).toBe("success");
  });

  it("permite seleccionar múltiples liquidaciones y forzar bloqueo para Ley Especial (vESLEY: 1)", async () => {
    const wrapper = mount(BloqueoLiquidaciones);
    await flushPromises();

    wrapper.vm.seleccionados = [...mockItems];
    wrapper.vm.abrirConfirmacionMultiple();

    expect(wrapper.vm.mostrarDialogoBloqueo).toBe(true);
    expect(wrapper.vm.itemsABloquear).toHaveLength(2);

    wrapper.vm.modoBloqueoEsLey = 1;
    await wrapper.vm.ejecutarBloqueoCtaBco();
    await flushPromises();

    expect(mockEjecutarSP).toHaveBeenCalledTimes(2);
    expect(mockEjecutarSP).toHaveBeenNthCalledWith(
      1,
      "sp/acred_bloquearCtaBco",
      expect.objectContaining({
        vORDEN: 261,
        vESLEY: 1,
      })
    );
    expect(mockEjecutarSP).toHaveBeenNthCalledWith(
      2,
      "sp/acred_bloquearCtaBco",
      expect.objectContaining({
        vORDEN: 14,
        vESLEY: 1,
      })
    );
  });

  it("permite buscar un cargo directamente por Orden si no está en la lista y bloquearlo", async () => {
    mockLeerDatos.mockResolvedValueOnce({
      operacionOk: true,
      datos: [
        {
          ID: 999,
          ORDEN: 555,
          PERSONAAPELLIDO: "GOMEZ",
          PERSONANOMBRE: "JUAN",
          PERSONADOCUMENTO: "30111222",
          REPARTICIONID: 400,
          CBU: "2850000000000000000000",
        },
      ],
    });

    const wrapper = mount(BloqueoLiquidaciones);
    await flushPromises();

    wrapper.vm.busquedaDirectaTexto = "555";
    await wrapper.vm.buscarCargoDirecto();
    await flushPromises();

    expect(wrapper.vm.cargoDirectoEncontrado).not.toBeNull();
    expect(wrapper.vm.cargoDirectoEncontrado.ORDEN).toBe(555);

    wrapper.vm.bloquearCargoDirecto();
    expect(wrapper.vm.mostrarDialogoBloqueo).toBe(true);
    expect(wrapper.vm.itemsABloquear[0].ORDEN).toBe(555);

    await wrapper.vm.ejecutarBloqueoCtaBco();
    await flushPromises();

    expect(mockEjecutarSP).toHaveBeenCalledWith(
      "sp/acred_bloquearCtaBco",
      expect.objectContaining({
        vORDEN: 555,
      })
    );
  });
});
