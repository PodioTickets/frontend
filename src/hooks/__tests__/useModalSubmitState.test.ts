import { describe, it, expect } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useModalSubmitState } from "../useModalSubmitState";

describe("useModalSubmitState", () => {
  it("começa false (ou com o inicial informado)", () => {
    const { result } = renderHook(() => useModalSubmitState());
    expect(result.current.isSubmitting).toBe(false);
    const { result: r2 } = renderHook(() => useModalSubmitState(true));
    expect(r2.current.isSubmitting).toBe(true);
  });

  it("liga durante o trabalho e desliga ao concluir", async () => {
    const { result } = renderHook(() => useModalSubmitState());
    let resolve!: () => void;
    const pending = new Promise<void>((r) => { resolve = r; });

    let call!: Promise<unknown>;
    act(() => {
      call = result.current.runSubmit(() => pending);
    });
    await waitFor(() => expect(result.current.isSubmitting).toBe(true));

    await act(async () => {
      resolve();
      await call;
    });
    expect(result.current.isSubmitting).toBe(false);
  });

  it("desliga mesmo se fn lançar e propaga o erro", async () => {
    const { result } = renderHook(() => useModalSubmitState());
    await expect(
      act(async () => {
        await result.current.runSubmit(async () => {
          throw new Error("boom");
        });
      }),
    ).rejects.toThrow("boom");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("retorna o valor de fn", async () => {
    const { result } = renderHook(() => useModalSubmitState());
    let value: unknown;
    await act(async () => {
      value = await result.current.runSubmit(async () => 42);
    });
    expect(value).toBe(42);
  });
});
