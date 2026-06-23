import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

/**
 * Servidor MSW compartilhado para testes de INTEGRAÇÃO (mock da API HTTP).
 *
 * NÃO está ligado no setup global de propósito: só os testes que chamam
 * {@link useMswServer} ligam a interceptação. Assim os ~436 testes de lógica
 * pura / RTL existentes seguem intactos (não esperam interceptação de rede).
 */
export const mswServer = setupServer();

/**
 * Liga o ciclo de vida do MSW para o arquivo de teste atual. Chamar no topo
 * do `describe`. `onUnhandledRequest: "error"` força cada teste a declarar
 * explicitamente os handlers que espera — qualquer chamada não-mockada falha
 * o teste (rede de segurança contra requests acidentais).
 */
export function useMswServer() {
  beforeAll(() => mswServer.listen({ onUnhandledRequest: "error" }));
  afterEach(() => mswServer.resetHandlers());
  afterAll(() => mswServer.close());
}
