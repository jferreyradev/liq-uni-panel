// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import AcreditacionView from "../views/AcreditacionView.vue";

const mockDescargarResumenExcel = vi.fn();
const mockDescargarDetalleExcel = vi.fn();
const mockDescargarArchivoBancoTxt = vi.fn();
const mockDescargarTodosArchivos = vi.fn();

vi.mock("vue-router", () => ({
  useRoute: () => ({
    query: { tab: "bloqueo" },
  }),
}));

vi.mock("@/stores/filterStore", () => ({
  useFilterStore: () => ({
    filterStringLey: "TipoLiquidacionId=1&GrupoAdicionalId=0&Ley=0&Periodo=01/11/2026",
    filterString: "TipoLiquidacionId=1&GrupoAdicionalId=0&Periodo=01/11/2026",
    liqString: "Mensual-0 Noviembre-2026",
    periodoString: "Noviembre - 2026",
    liqCompactString: "2026NovM0",
    ley: 0,
    tipoliq: 1,
    nroadi: 0,
  }),
}));

vi.mock("@/composables/useEndPoints", () => ({
  useEndPoints: () => ({
    apiBase: { value: "https://api.test" },
    buildApiHeaders: () => ({ "x-project-key": "concepcion" }),
    getBoletasHeaders: () => ({ "x-project-key": "concepcion" }),
  }),
}));

vi.mock("@/shared/components", () => ({
  LiqInputPanel: {
    template: "<div data-testid='liq-input-panel'>Panel Filtros</div>",
  },
}));

vi.mock("../components/BloqueoLiquidaciones.vue", () => ({
  default: {
    template: "<div data-testid='tab-bloqueo'>Bloqueo Liquidaciones</div>",
  },
}));

vi.mock("../components/ResumenAcredDetalle.vue", () => ({
  default: {
    template: "<div data-testid='tab-detalle'>Detalle Acreditaciones</div>",
  },
}));

vi.mock("../components/ResumenAcred.vue", () => ({
  default: {
    template: "<div data-testid='tab-resumen'>Resumen General</div>",
  },
}));

vi.mock("../components/ArchAcred.vue", () => ({
  default: {
    template: "<div data-testid='tab-archivo'>Archivo TXT</div>",
  },
}));

vi.mock("../services/acreditacionDescargas.js", () => ({
  descargarResumenExcel: (...args) => mockDescargarResumenExcel(...args),
  descargarDetalleExcel: (...args) => mockDescargarDetalleExcel(...args),
  descargarArchivoBancoTxt: (...args) => mockDescargarArchivoBancoTxt(...args),
  descargarTodosArchivos: (...args) => mockDescargarTodosArchivos(...args),
}));

describe("AcreditacionView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza el título y los botones de descarga de archivos", () => {
    const wrapper = mount(AcreditacionView);

    expect(wrapper.text()).toContain("Acreditaciones Bancarias");
    expect(wrapper.text()).toContain("Descargar Archivos");
    expect(wrapper.text()).toContain("Resumen");
    expect(wrapper.text()).toContain("Detalle");
    expect(wrapper.text()).toContain("Archivo TXT");
    expect(wrapper.text()).toContain("Descargar Todo");
  });

  it("dispara la descarga de Resumen al hacer clic en el botón", async () => {
    mockDescargarResumenExcel.mockResolvedValueOnce("Resumen_Acred_Noviembre_2026.xlsx");
    const wrapper = mount(AcreditacionView);

    await wrapper.vm.onDescargarResumen();
    await flushPromises();

    expect(mockDescargarResumenExcel).toHaveBeenCalledTimes(1);
    expect(wrapper.vm.alertDescarga.mostrar).toBe(true);
    expect(wrapper.vm.alertDescarga.tipo).toBe("success");
    expect(wrapper.vm.alertDescarga.mensaje).toContain("Resumen_Acred_Noviembre_2026.xlsx");
  });

  it("dispara la descarga de Detalle al hacer clic en el botón", async () => {
    mockDescargarDetalleExcel.mockResolvedValueOnce("Detalle_Acred_Noviembre_2026.xlsx");
    const wrapper = mount(AcreditacionView);

    await wrapper.vm.onDescargarDetalle();
    await flushPromises();

    expect(mockDescargarDetalleExcel).toHaveBeenCalledTimes(1);
    expect(wrapper.vm.alertDescarga.mostrar).toBe(true);
    expect(wrapper.vm.alertDescarga.mensaje).toContain("Detalle_Acred_Noviembre_2026.xlsx");
  });

  it("dispara la descarga de Archivo TXT", async () => {
    mockDescargarArchivoBancoTxt.mockResolvedValueOnce("Acreditaciones_Noviembre_2026.txt");
    const wrapper = mount(AcreditacionView);

    await wrapper.vm.onDescargarTxt();
    await flushPromises();

    expect(mockDescargarArchivoBancoTxt).toHaveBeenCalledTimes(1);
    expect(wrapper.vm.alertDescarga.mostrar).toBe(true);
    expect(wrapper.vm.alertDescarga.mensaje).toContain("Acreditaciones_Noviembre_2026.txt");
  });

  it("dispara la descarga de Todos los archivos", async () => {
    mockDescargarTodosArchivos.mockResolvedValueOnce([
      "Resumen_Acred_Noviembre_2026.xlsx",
      "Detalle_Acred_Noviembre_2026.xlsx",
      "Acreditaciones_Noviembre_2026.txt",
    ]);
    const wrapper = mount(AcreditacionView);

    await wrapper.vm.onDescargarTodos();
    await flushPromises();

    expect(mockDescargarTodosArchivos).toHaveBeenCalledTimes(1);
    expect(wrapper.vm.alertDescarga.mostrar).toBe(true);
    expect(wrapper.vm.alertDescarga.mensaje).toContain("Se descargaron exitosamente 3 archivo(s)");
  });

  it("muestra alerta de error si alguna descarga falla", async () => {
    mockDescargarResumenExcel.mockRejectedValueOnce(new Error("No hay datos calculados"));
    const wrapper = mount(AcreditacionView);

    await wrapper.vm.onDescargarResumen();
    await flushPromises();

    expect(wrapper.vm.alertDescarga.mostrar).toBe(true);
    expect(wrapper.vm.alertDescarga.tipo).toBe("error");
    expect(wrapper.vm.alertDescarga.mensaje).toBe("No hay datos calculados");
  });
});
