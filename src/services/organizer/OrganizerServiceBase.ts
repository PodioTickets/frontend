import type { ApiClient } from "../base/ApiClient";

/**
 * Base do OrganizerService (Bloco 3, fase 2). Segura o `apiClient` compartilhado
 * pela cadeia de mixins de domínio (Reporting -> OrganizerService). `protected`
 * para os métodos das subclasses acessarem via `this.apiClient`.
 */
export class OrganizerServiceBase {
  constructor(protected apiClient: ApiClient) { }
}
