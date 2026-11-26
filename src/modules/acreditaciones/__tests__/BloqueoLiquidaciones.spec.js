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
    filterString: "Periodo=01/09/2026&TipoLiquidacionId=1&GrupoAdicionalId=0",
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
    PERSONAID: 526,
    DOCUMENTO: 14039193,
    APELLIDO: "MOLINA",
    NOMBRE: "M. AGUSTINA",
    PERSONACUIL: 27140391935,
    CARGOID: 526,
    REPARTICIONID: 400,
    ORDEN: 914,
    AFILIADO: 193895,
    TIPOEMPLEOID: 1,
    SITUACIONREVISTAID: 1,
    LIQUIDACIONID: 68119,
    PERIODO: "2026-09-01T03:00:00.000Z",
    FECHADEV: "2026-09-01T03:00:00.000Z",
    TIPOLIQUIDACIONID: 1,
    TIPOLIQUIDACIONDESCRIPCION: "MENSUAL",
    GRUPOADICIONALID: 0,
    UNIORG: 3,
  },
  {
    PERSONAID: 528,
    DOCUMENTO: 20239637,
    APELLIDO: "GONZALEZ",
    NOMBRE: "JUAN PABLO",
    PERSONACUIL: 20202396373,
    CARGOID: 528,
    REPARTICIONID: 400,
    ORDEN: 924,
    AFILIADO: 0,
    TIPOEMPLEOID: 1,
    SITUACIONREVISTAID: 1,
    LIQUIDACIONID: 68121,
    PERIODO: "2026-09-01T03:00:00.000Z",
    FECHADEV: "2026-09-01T03:00:00.000Z",
    TIPOLIQUIDACIONID: 1,
    TIPOLIQUIDACIONDESCRIPCION: "MENSUAL",
    GRUPOADICIONALID: 0,
    UNIORG: 2,
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

    expect(wrapper.text()).toContain("Bloqueo de Liquidaciones para Acreditación Bancaria");
    expect(wrapper.text()).toContain("sp/acred_bloquearCtaBco");
    expect(wrapper.text()).toContain("Buscar cargo");
    expect(wrapper.text()).toContain("Bloquear como:");
  });

  it("consulta view/liq usando store.filterString sin imponer ReparticionId en la URL", async () => {
    mount(BloqueoLiquidaciones);
    await flushPromises();

    expect(mockUseFetch).toHaveBeenCalled();
    const getUrlFn = mockUseFetch.mock.calls[0][0];
    const generatedUrl = getUrlFn();
    expect(generatedUrl).toBe(
      "https://api.test/api/view/liq?Periodo=01/09/2026&TipoLiquidacionId=1&GrupoAdicionalId=0&sort={\"Orden\":\"asc\"}"
    );
    expect(generatedUrl).not.toContain("ReparticionId=");
  });

  it("permite cambiar el modo de bloqueo entre Efectivo (0), Ley (1) y Ambos (2)", async () => {
    const wrapper = mount(BloqueoLiquidaciones);
    await flushPromises();

    expect(wrapper.vm.modoBloqueoEsLey).toBe(0);
    wrapper.vm.cambiarModoBloqueo(1);
    expect(wrapper.vm.modoBloqueoEsLey).toBe(1);
    expect(wrapper.vm.descripcionModoBloqueo).toBe("Ley Especial (vESLEY = 1)");

    wrapper.vm.cambiarModoBloqueo(2);
    expect(wrapper.vm.modoBloqueoEsLey).toBe(2);
    expect(wrapper.vm.descripcionModoBloqueo).toBe("Ambos (Efectivo y Ley)");
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
        vORDEN: 914,
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
        vORDEN: 914,
        vESLEY: 1,
      })
    );
    expect(mockEjecutarSP).toHaveBeenNthCalledWith(
      2,
      "sp/acred_bloquearCtaBco",
      expect.objectContaining({
        vORDEN: 924,
        vESLEY: 1,
      })
    );
  });

  it("permite bloquear para ambos (Efectivo y Ley Especial) ejecutando 2 llamadas por liquidación", async () => {
    const wrapper = mount(BloqueoLiquidaciones);
    await flushPromises();

    wrapper.vm.abrirConfirmacionIndividual(mockItems[0]);
    wrapper.vm.modoBloqueoEsLey = 2; // Ambos

    await wrapper.vm.ejecutarBloqueoCtaBco();
    await flushPromises();

    expect(mockEjecutarSP).toHaveBeenCalledTimes(2);
    expect(mockEjecutarSP).toHaveBeenNthCalledWith(
      1,
      "sp/acred_bloquearCtaBco",
      expect.objectContaining({
        vORDEN: 914,
        vESLEY: 0,
      })
    );
    expect(mockEjecutarSP).toHaveBeenNthCalledWith(
      2,
      "sp/acred_bloquearCtaBco",
      expect.objectContaining({
        vORDEN: 914,
        vESLEY: 1,
      })
    );
  });
});
