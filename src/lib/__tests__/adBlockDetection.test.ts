import { describe, expect, it, vi } from "vitest";
import {
  AD_BLOCK_NOTICE_STORAGE_KEY,
  AD_PROBE_URLS,
  detectAdBlockNetwork,
  dismissAdBlockNotice,
  isAdBlockNoticeDismissed,
  isParticipantPath,
} from "../adBlockDetection";

/** Storage em memória (evita depender do sessionStorage do jsdom). */
function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value),
  } as Storage;
}

describe("isParticipantPath", () => {
  it("aceita rotas públicas do participante", () => {
    for (const path of ["/", "/search", "/events/corrida", "/checkout/ingressos", "/user"]) {
      expect(isParticipantPath(path)).toBe(true);
    }
  });

  it("recusa painéis de organizador e admin", () => {
    for (const path of ["/organizer", "/organizer/events", "/admin", "/admin/usuarios"]) {
      expect(isParticipantPath(path)).toBe(false);
    }
  });

  it("não confunde prefixo parcial com painel", () => {
    expect(isParticipantPath("/organizers-guide")).toBe(true);
    expect(isParticipantPath("/administrativo")).toBe(true);
  });
});

describe("detectAdBlockNetwork", () => {
  const okResponse = () => Promise.resolve(new Response(null, { status: 200 }));

  it("acusa quando o controle passa e uma sonda falha", async () => {
    const fetchImpl = vi.fn((input: RequestInfo | URL) =>
      String(input) === AD_PROBE_URLS[0]
        ? Promise.reject(new TypeError("blocked"))
        : okResponse(),
    ) as unknown as typeof fetch;

    await expect(detectAdBlockNetwork({ fetchImpl })).resolves.toBe(true);
  });

  it("não acusa quando todas as sondas passam", async () => {
    const fetchImpl = vi.fn(okResponse) as unknown as typeof fetch;
    await expect(detectAdBlockNetwork({ fetchImpl })).resolves.toBe(false);
  });

  it("não acusa quando a rede está fora (controle também falha)", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.reject(new TypeError("offline")),
    ) as unknown as typeof fetch;

    await expect(detectAdBlockNetwork({ fetchImpl })).resolves.toBe(false);
  });

  it("não acusa quando o sinal externo já foi abortado", async () => {
    const fetchImpl = vi.fn(okResponse) as unknown as typeof fetch;
    const controller = new AbortController();
    controller.abort();

    await expect(
      detectAdBlockNetwork({ fetchImpl, signal: controller.signal }),
    ).resolves.toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sonda o controle e todas as URLs em paralelo", async () => {
    const fetchImpl = vi.fn(okResponse) as unknown as typeof fetch;
    await detectAdBlockNetwork({ fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(AD_PROBE_URLS.length + 1);
  });
});

describe("dispensa do aviso", () => {
  it("persiste e lê a dispensa", () => {
    const storage = memoryStorage();
    expect(isAdBlockNoticeDismissed(storage)).toBe(false);
    dismissAdBlockNotice(storage);
    expect(storage.getItem(AD_BLOCK_NOTICE_STORAGE_KEY)).toBe("1");
    expect(isAdBlockNoticeDismissed(storage)).toBe(true);
  });

  it("é tolerante a storage indisponível (Safari privado)", () => {
    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    } as unknown as Storage;

    expect(() => dismissAdBlockNotice(broken)).not.toThrow();
    expect(isAdBlockNoticeDismissed(broken)).toBe(false);
    expect(isAdBlockNoticeDismissed(null)).toBe(false);
  });
});
