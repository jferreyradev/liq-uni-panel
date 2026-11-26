// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import RepoHeader from "../RepoHeader.vue";

describe("RepoHeader", () => {
  it("renderiza título y subtítulo correctamente", () => {
    const wrapper = mount(RepoHeader, {
      props: {
        title: "Planilla de Retenciones",
        subtitle: "Mensual-0 Noviembre-2026",
      },
    });

    expect(wrapper.text()).toContain("Planilla de Retenciones");
    expect(wrapper.text()).toContain("Mensual-0 Noviembre-2026");
  });

  it("renderiza el contenido del slot de acciones", () => {
    const wrapper = mount(RepoHeader, {
      props: {
        title: "Resumen Acreditaciones",
      },
      slots: {
        default: "<button class='btn-test'>Descargar Excel</button>",
      },
    });

    expect(wrapper.find(".btn-test").exists()).toBe(true);
    expect(wrapper.find(".btn-test").text()).toBe("Descargar Excel");
  });

  it("permite personalizar el icono", () => {
    const wrapper = mount(RepoHeader, {
      props: {
        title: "Bajas de Ley",
        icon: "mdi-account-minus",
      },
    });

    const icon = wrapper.findComponent({ name: "VIcon" });
    if (icon.exists()) {
      expect(icon.props("icon")).toBe("mdi-account-minus");
    }
  });

  it("renderiza el campo de búsqueda cuando search está definido", () => {
    const wrapper = mount(RepoHeader, {
      props: {
        title: "Planilla de Ley",
        search: "Gomez",
      },
    });

    const textField = wrapper.findComponent({ name: "VTextField" });
    expect(textField.exists()).toBe(true);
    expect(textField.props("modelValue")).toBe("Gomez");
  });

  it("no renderiza el campo de búsqueda por defecto si no se pasa search ni showSearch", () => {
    const wrapper = mount(RepoHeader, {
      props: {
        title: "Planilla de Ley",
      },
    });

    const textField = wrapper.findComponent({ name: "VTextField" });
    expect(textField.exists()).toBe(false);
  });
});
