import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Dropdown } from "../index";

function Two() {
  return (
    <>
      {["A", "B"].map((k) => (
        <Dropdown key={k} menuInPortal width="w-[160px]" align="end" trigger={<span>abrir {k}</span>}>
          {() => <div>menu {k}</div>}
        </Dropdown>
      ))}
    </>
  );
}

describe("Dropdown — um aberto por vez", () => {
  it("abrir o segundo fecha o primeiro", async () => {
    render(<Two />);
    await act(async () => fireEvent.click(screen.getByText("abrir A")));
    expect(screen.getByText("menu A")).toBeInTheDocument();
    await act(async () => {
      fireEvent.mouseDown(screen.getByText("abrir B"));
      fireEvent.click(screen.getByText("abrir B"));
    });
    expect(screen.queryByText("menu A")).not.toBeInTheDocument();
    expect(screen.getByText("menu B")).toBeInTheDocument();
  });

  it("clique dentro do próprio menu não fecha", async () => {
    render(<Two />);
    await act(async () => fireEvent.click(screen.getByText("abrir A")));
    await act(async () => fireEvent.mouseDown(screen.getByText("menu A")));
    expect(screen.getByText("menu A")).toBeInTheDocument();
  });
});
