// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  descargarResumenExcel,
  descargarDetalleExcel,
  descargarArchivoBancoTxt,
  descargarTodosArchivos,
} from "../services/acreditacionDescargas";

const mockLeerDatos = vi.fn();
const mockDescargaArchivo = vi.fn();
const mockDescargarDesdeUrl = vi.fn();
const mockDescargarDesdeBlob = vi.fn();
const mockWriteFileXLSX = vi.fn();

vi.mock("@/shared/services/apiService", () => ({
  leerDatos: (...args) => mockLeerDatos(...args),
  descargaArchivo: (...args) => mockDescargaArchivo(...args),
}));

vi.mock("@/utils/descargas", () => ({
  descargarDesdeUrl: (...args) => mockDescargarDesdeUrl(...args),
  descargarDesdeBlob: (...args) => mockDescargarDesdeBlob(...args),
}));

vi.mock("xlsx", () => ({
  utils: {
    aoa_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFileXLSX: (...args) => mockWriteFileXLSX(...args),
}));

const mockStore = {
  filterStringLey: "TipoLiquidacionId=1&GrupoAdicionalId=0&Ley=0&Periodo=01/11/2026",
  liqString: "Mensual-0 Noviembre-2026",
  periodoString: "Noviembre - 2026",
  liqCompactString: "2026NovM0",
  ley: 0,
};

describe("acreditacionDescargas service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("descargarResumenExcel", () => {
    it("obtiene datos de view/resumenAcred y genera el archivo Excel", async () => {
      mockLeerDatos.mockResolvedValueOnce({
        operacionOk: true,
        datos: [
          {
            PERIODO: "2026-11-01",
            FECHADEV: "2026-11-01",
            IMPORTE: 150000.5,
            CANTIDAD: 45,
            BLOQ: "0",
            ESLEY: "0",
          },
        ],
      });

      const fileName = await descargarResumenExcel(mockStore);

      expect(mockLeerDatos).toHaveBeenCalledWith(
        `view/resumenAcred?${mockStore.filterStringLey}`
      );
      expect(mockWriteFileXLSX).toHaveBeenCalledTimes(1);
      expect(fileName).toBe("Resumen_Acred_Noviembre_2026.xlsx");
    });

    it("lanza un error si no hay datos disponibles en la vista", async () => {
      mockLeerDatos.mockResolvedValueOnce({
        operacionOk: true,
        datos: [],
      });

      await expect(descargarResumenExcel(mockStore)).rejects.toThrow(
        "No hay datos de resumen de acreditaciones para el período seleccionado."
      );
    });
  });

  describe("descargarDetalleExcel", () => {
    it("obtiene datos de view/detalleAcred y genera el archivo Excel", async () => {
      mockLeerDatos.mockResolvedValueOnce({
        operacionOk: true,
        datos: [
          {
            GRUPOADICIONALID: 0,
            PERIODO: "2026-11-01",
            FECHADEV: "2026-11-01",
            LIQUIDACIONID: 101,
            DOCUMENTO: 12345678,
            APELLIDO: "PEREZ",
            NOMBRE: "JUAN",
            REPARTICIONID: 400,
            ORDEN: 1,
            AFILIADO: 0,
            CUIL: "20123456789",
            CBU: "2850140230000000000001",
            HABERES: 200000,
            RETENCIONES: 50000,
            NETO: 150000,
            UNIORG: 1,
            BLOQ: 0,
            ESLEY: 0,
          },
        ],
      });

      const fileName = await descargarDetalleExcel(mockStore);

      expect(mockLeerDatos).toHaveBeenCalledWith(
        `view/detalleAcred?${mockStore.filterStringLey}`
      );
      expect(mockWriteFileXLSX).toHaveBeenCalledTimes(1);
      expect(fileName).toBe("Detalle_Acred_Noviembre_2026.xlsx");
    });

    it("lanza un error si el backend responde con error", async () => {
      mockLeerDatos.mockResolvedValueOnce({
        operacionOk: false,
        errmsg: "Fallo de conexión",
      });

      await expect(descargarDetalleExcel(mockStore)).rejects.toThrow(
        "Fallo de conexión"
      );
    });
  });

  describe("descargarArchivoBancoTxt", () => {
    it("descarga el archivo TXT directamente si el endpoint responde con URL", async () => {
      mockDescargaArchivo.mockResolvedValueOnce({
        operacionOk: true,
        url: "blob:https://api.test/12345",
      });

      const fileName = await descargarArchivoBancoTxt(
        mockStore,
        "https://api.test",
        () => ({ "x-project-key": "concepcion" })
      );

      expect(mockDescargaArchivo).toHaveBeenCalledWith(
        `https://api.test/api/txt/archivoAcred?${mockStore.filterStringLey}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-project-key": "concepcion",
            "Content-Type": "text/plain",
          }),
        })
      );
      expect(mockDescargarDesdeUrl).toHaveBeenCalledWith(
        "blob:https://api.test/12345",
        "Acreditaciones_Noviembre_2026.txt"
      );
      expect(fileName).toBe("Acreditaciones_Noviembre_2026.txt");
    });

    it("usa fallback de view/archivoAcred si endpoint txt falla", async () => {
      mockDescargaArchivo.mockResolvedValueOnce({
        operacionOk: false,
      });

      mockLeerDatos.mockResolvedValueOnce({
        operacionOk: true,
        datos: [{ CADENA: "REGISTRO_BANCO_1" }, { CADENA: "REGISTRO_BANCO_2" }],
      });

      const fileName = await descargarArchivoBancoTxt(
        mockStore,
        "https://api.test",
        () => ({})
      );

      expect(mockLeerDatos).toHaveBeenCalledWith(
        `view/archivoAcred?${mockStore.filterStringLey}`
      );
      expect(mockDescargarDesdeBlob).toHaveBeenCalledWith(
        expect.any(Blob),
        "Acreditaciones_Noviembre_2026.txt"
      );
      expect(fileName).toBe("Acreditaciones_Noviembre_2026.txt");
    });
  });

  describe("descargarTodosArchivos", () => {
    it("ejecuta las 3 descargas y devuelve los nombres de archivo", async () => {
      // Mock Resumen
      mockLeerDatos.mockResolvedValueOnce({
        operacionOk: true,
        datos: [{ IMPORTE: 100, CANTIDAD: 1 }],
      });
      // Mock Detalle
      mockLeerDatos.mockResolvedValueOnce({
        operacionOk: true,
        datos: [{ DOCUMENTO: 1234, NETO: 100 }],
      });
      // Mock TXT
      mockDescargaArchivo.mockResolvedValueOnce({
        operacionOk: true,
        url: "blob:https://api.test/txt",
      });

      const archivos = await descargarTodosArchivos(
        mockStore,
        "https://api.test",
        () => ({})
      );

      expect(archivos).toHaveLength(3);
      expect(archivos[0]).toContain("Resumen_Acred");
      expect(archivos[1]).toContain("Detalle_Acred");
      expect(archivos[2]).toContain("Acreditaciones_");
    });
  });
});
