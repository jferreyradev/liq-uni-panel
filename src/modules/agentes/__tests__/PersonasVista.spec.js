// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import PersonasVista from "../components/PersonasVista.vue";

const vuetify = createVuetify({
  components,
  directives,
});

describe("PersonasVista - Pestañas y campos bancarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const personaMock = {
    ID: 10,
    DOCUMENTO: "30123456",
    APELLIDO: "Pérez",
    NOMBRE: "Juan",
    CUIL: "20301234568",
    SEXO: "M",
    FECHANACIMIENTO: "1985-05-15",
    FECHAINGRESO: "2010-02-01",
    TIPODOCUMENTOID: 1,
    ESTADOCIVILID: 1,
    DOMICILIOCALLE: "San Martín",
    DOMICILIONUMERO: "123",
    PISO: "2",
    DEPARTAMENTO: "B",
    TELEFONO: "3811234567",
    EMAIL: "juan.perez@test.com",
    LOCALIDADID: 100,
    LOCALIDADDESCRIPCION: "CONCEPCION",
    LOCALIDADCODIGOPOSTAL: "4146",
    PROVINCIADESCRIPCION: "TUCUMAN",
    PAISDESCRIPCION: "ARGENTINA",
    CBU: "0110123400000012345678",
    CUENTA: "1234567890",
  };

  it("renderiza las tres solapas (Personales, Contacto, Bancarios)", () => {
    const wrapper = mount(PersonasVista, {
      props: {
        Registro: personaMock,
        cerrar: vi.fn(),
        funcion: vi.fn(),
        soloLectura: false,
      },
      global: {
        plugins: [vuetify],
      },
    });

    const texto = wrapper.text();
    expect(texto).toContain("Datos Personales");
    expect(texto).toContain("Domicilio y Contacto");
    expect(texto).toContain("Datos Bancarios");
  });

  it("muestra los campos CBU y Cuenta en la pestaña bancaria", () => {
    const wrapper = mount(PersonasVista, {
      props: {
        Registro: personaMock,
        cerrar: vi.fn(),
        funcion: vi.fn(),
        soloLectura: false,
      },
      global: {
        plugins: [vuetify],
      },
    });

    const cbuInput = wrapper.find('input[placeholder="Ingrese los 22 dígitos del CBU"]');
    const cuentaInput = wrapper.find('input[placeholder="Número de cuenta bancaria"]');

    expect(cbuInput.exists()).toBe(true);
    expect(cuentaInput.exists()).toBe(true);
    expect(cbuInput.element.value).toBe(personaMock.CBU);
    expect(cuentaInput.element.value).toBe(personaMock.CUENTA);
  });

  it("muestra el CUIL y DNI en la pestaña de datos personales", () => {
    const wrapper = mount(PersonasVista, {
      props: {
        Registro: personaMock,
        cerrar: vi.fn(),
        funcion: vi.fn(),
        soloLectura: false,
      },
      global: {
        plugins: [vuetify],
      },
    });

    const inputs = wrapper.findAll("input");
    const valores = inputs.map((i) => i.element.value);

    expect(valores).toContain(personaMock.DOCUMENTO);
    expect(valores).toContain(personaMock.CUIL);
  });

  it("envía vCBU y vCUENTA a la función de guardado al grabar", async () => {
    const funcionGuardar = vi.fn().mockResolvedValue(null);
    const cerrar = vi.fn();

    const wrapper = mount(PersonasVista, {
      props: {
        Registro: personaMock,
        cerrar,
        funcion: funcionGuardar,
        soloLectura: false,
      },
      global: {
        plugins: [vuetify],
      },
    });

    await flushPromises();

    // Simular clic en grabar
    const btnGrabar = wrapper
      .findAll("button")
      .find((b) => b.text().includes("Grabar"));
    expect(btnGrabar).toBeDefined();

    await btnGrabar.trigger("click");
    await flushPromises();

    expect(funcionGuardar).toHaveBeenCalledTimes(1);
    const payload = funcionGuardar.mock.calls[0][0];
    expect(payload.vCBU).toBe("0110123400000012345678");
    expect(payload.vCUENTA).toBe("1234567890");
    expect(payload.vCUIL).toBe("20301234568");
    expect(payload.vDNI).toBe("30123456");
    expect(cerrar).toHaveBeenCalledTimes(1);
  });
});
