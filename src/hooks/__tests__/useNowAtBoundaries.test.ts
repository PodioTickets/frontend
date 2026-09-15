import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNowAtBoundaries } from "../useNowAtBoundaries";
import {
  __resetServerClockForTests,
  applyServerTime,
  serverNow,
} from "@/lib/serverClock";

describe("useNowAtBoundaries (hora do servidor)", () => {
  // Servidor: 15/09 12:00 UTC. Dispositivo com relógio ERRADO (1 dia adiantado).
  const serverStart = new Date("2026-09-15T12:00:00.000Z").getTime();
  const wrongDeviceClock = serverStart + 24 * 60 * 60 * 1000;

  beforeEach(() => {
    __resetServerClockForTests();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date", "performance"] });
    vi.setSystemTime(wrongDeviceClock);
  });
  afterEach(() => {
    vi.useRealTimers();
    __resetServerClockForTests();
  });

  const syncServer = () => {
    act(() => applyServerTime(new Date(serverStart).toISOString()));
  };

  it("sem hora do servidor devolve null (não usa o relógio do dispositivo)", () => {
    const { result } = renderHook(() => useNowAtBoundaries([serverStart + 1000]));
    expect(result.current).toBeNull();
  });

  it("usa a hora do servidor mesmo com o relógio do dispositivo errado", () => {
    const endsAt = serverStart + 3 * 60 * 60 * 1000 + 8 * 60 * 1000; // 03h08 à frente
    const { result } = renderHook(() => {
      const now = useNowAtBoundaries([endsAt]);
      return { now, ended: now !== null && now >= endsAt };
    });
    syncServer();
    // Pelo relógio do dispositivo já teria encerrado; pela hora do servidor, não.
    expect(result.current.ended).toBe(false);
    expect(Math.abs((result.current.now ?? 0) - serverStart)).toBeLessThan(1000);

    act(() => {
      vi.advanceTimersByTime(endsAt - serverStart - 1000);
    });
    expect(result.current.ended).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(result.current.ended).toBe(true);
  });

  it("mudar o relógio do dispositivo no meio não afeta o 'agora'", () => {
    syncServer();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    vi.setSystemTime(0); // usuário "atrasa" o relógio do sistema
    expect(Math.round(((serverNow() ?? 0) - serverStart) / 1000)).toBe(5);
  });

  it("encadeia limites: abre e depois encerra", () => {
    const opensAt = serverStart + 60_000;
    const endsAt = serverStart + 120_000;
    const { result } = renderHook(() => {
      const now = useNowAtBoundaries([opensAt, endsAt, null, NaN]);
      return {
        open: now !== null && now >= opensAt && now < endsAt,
        ended: now !== null && now >= endsAt,
      };
    });
    syncServer();
    expect(result.current.open).toBe(false);

    act(() => {
      vi.advanceTimersByTime(60_100);
    });
    expect(result.current.open).toBe(true);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.ended).toBe(true);
  });
});
