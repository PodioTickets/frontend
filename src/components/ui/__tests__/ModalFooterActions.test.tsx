import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ModalFooterActions } from "../ModalFooterActions";

describe("ModalFooterActions", () => {
  it("renderiza labels e dispara callbacks", () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    render(
      <ModalFooterActions
        submitLabel="Salvar"
        onCancel={onCancel}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByText("Cancelar"));
    fireEvent.click(screen.getByText("Salvar"));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("mostra o label de loading e desabilita ambos quando submetendo", () => {
    const onCancel = vi.fn();
    render(
      <ModalFooterActions
        submitLabel="Salvar"
        submitLoadingLabel="Salvando..."
        onCancel={onCancel}
        isSubmitting
      />,
    );
    expect(screen.getByText("Salvando...")).toBeInTheDocument();
    expect(screen.queryByText("Salvar")).not.toBeInTheDocument();
    // Cancelar desabilitado durante submit.
    fireEvent.click(screen.getByText("Cancelar"));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("desabilita o submit por validação sem travar o cancelar", () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    render(
      <ModalFooterActions
        submitLabel="Salvar"
        onCancel={onCancel}
        onSubmit={onSubmit}
        submitDisabled
      />,
    );
    fireEvent.click(screen.getByText("Salvar"));
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Cancelar"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("usa type=submit + form quando formId é dado", () => {
    render(
      <ModalFooterActions
        submitLabel="Enviar"
        onCancel={() => {}}
        formId="my-form"
      />,
    );
    const submit = screen.getByText("Enviar").closest("button")!;
    expect(submit).toHaveAttribute("type", "submit");
    expect(submit).toHaveAttribute("form", "my-form");
  });
});
