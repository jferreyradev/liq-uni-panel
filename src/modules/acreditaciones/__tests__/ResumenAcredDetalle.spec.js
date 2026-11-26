// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { ref } from "vue";
import ResumenAcredDetalle from "../components/ResumenAcredDetalle.vue";

const mockUseFetch = vi.fn();
const mockEjecutarSP = vi.fn();

vi.mock("@/composables/useFetch", () => ({
  useFetch: (...args) => mockUseFetch(...args),
}));

vi.mock("@/shared/services/apiService", () => ({
  ejecutarSP: (...args) => mockEjecutarSP(...args),
}));

vi.mock("@/stores/filterStore", () => ({
  useFilterStore: () => ({
    filterStringLey: "TipoLiquidacionId=1&GrupoAdicionalId=0&Ley=0&Periodo=01/09/2026",
    periodoString: "Septiembre - 2026",
    periodoDMY: "01/09/2026",
    liqString: "Mensual-0 Septiembre-2026",
    liqCompactString: "2026SepM0",
    tipoliq: 1,
    nroadi: 0,
    ley: 0,
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

vi.mock("@/shared/components/RepoHeader.vue", () => ({
  default: {
    name: "RepoHeader",
    props: ["title", "subtitle"],
    template: "<div class='repo-header'><h2>{{ title }}</h2><slot /></div>",
  },
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

describe("ResumenAcredDetalle - Bloqueo de Cuenta Banco", () => {
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

  it("renderiza la tabla con los registros de detalleAcred y el buscador de cargo", async () => {
    const wrapper = mount(ResumenAcredDetalle);
    await flushPromises();

    expect(wrapper.text()).toContain("Detalle Acreditaciones");
    expect(wrapper.text()).toContain("Buscar cargo");
    expect(wrapper.find("input").exists()).toBe(true);
  });

  it("permite abrir el diálogo de confirmación individual y ejecutar sp/acred_bloquearCtaBco", async () => {
    const wrapper = mount(ResumenAcredDetalle);
    await flushPromises();

    // Invocar acción individual de la fila 1 (Orden 261, Efectivo vESLEY: 0)
    wrapper.vm.abrirConfirmacionIndividual(mockItems[0]);
    expect(wrapper.vm.mostrarDialogoBloqueo).toBe(true);
    expect(wrapper.vm.itemsABloquear).toHaveLength(1);
    expect(wrapper.vm.itemsABloquear[0].ORDEN).toBe(261);

    // Confirmar bloqueo
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

  it("permite seleccionar múltiples liquidaciones y bloquearlas para Ley (vESLEY: 1)", async () => {
    const wrapper = mount(ResumenAcredDetalle);
    await flushPromises();

    // Seleccionar los 2 ítems
    wrapper.vm.seleccionados = [...mockItems];
    wrapper.vm.abrirConfirmacionMultiple();

    expect(wrapper.vm.mostrarDialogoBloqueo).toBe(true);
    expect(wrapper.vm.itemsABloquear).toHaveLength(2);

    // Forzar modo bloqueo para Ley Especial (vESLEY = 1)
    wrapper.vm.modoBloqueoEsLey = 1;

    await wrapper.vm.ejecutarBloqueoCtaBco();
    await flushPromises();

    expect(mockEjecutarSP).toHaveBeenCalledTimes(2);

    // Primer llamado con vESLEY = 1
    expect(mockEjecutarSP).toHaveBeenNthCalledWith(
      1,
      "sp/acred_bloquearCtaBco",
      expect.objectContaining({
        vIDREP: 400,
        vORDEN: 261,
        vESLEY: 1,
      })
    );

    // Segundo llamado con vESLEY = 1
    expect(mockEjecutarSP).toHaveBeenNthCalledWith(
      2,
      "sp/acred_bloquearCtaBco",
      expect.objectContaining({
        vIDREP: 400,
        vORDEN: 14,
        vESLEY: 1,
      })
    );

    // Se limpia la selección tras el éxito
    expect(wrapper.vm.seleccionados).toHaveLength(0);
  });

  it("filtra registros según filtroEstado (activos, bloqueados, todos)", async () => {
    const wrapper = mount(ResumenAcredDetalle);
    await flushPromises();

    expect(wrapper.vm.itemsFiltrados).toHaveLength(2);

    wrapper.vm.filtroEstado = "activos";
    expect(wrapper.vm.itemsFiltrados).toHaveLength(1);
    expect(wrapper.vm.itemsFiltrados[0].ORDEN).toBe(261);

    wrapper.vm.filtroEstado = "bloqueados";
    expect(wrapper.vm.itemsFiltrados).toHaveLength(1);
    expect(wrapper.vm.itemsFiltrados[0].ORDEN).toBe(14);
  });

  it("maneja errores del backend al ejecutar sp/acred_bloquearCtaBco", async () => {
    mockEjecutarSP.mockResolvedValueOnce({
      operacionOk: false,
      salida: 1,
      errmsg: "Cuenta ya bloqueada o error en base de datos",
    });

    const wrapper = mount(ResumenAcredDetalle);
    await flushPromises();

    wrapper.vm.abrirConfirmacionIndividual(mockItems[0]);
    await wrapper.vm.ejecutarBloqueoCtaBco();
    await flushPromises();

    expect(wrapper.vm.mostrarAlert).toBe(true);
    expect(wrapper.vm.alertTipo).toBe("error");
    expect(wrapper.vm.alertMensaje).toContain("Cuenta ya bloqueada");
  });
});
