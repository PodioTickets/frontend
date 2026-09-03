import { describe, expect, it } from "vitest";
import {
  buildAdvisorWhatsappUrl,
  DEFAULT_ADVISOR_ID,
  ORGANIZER_ADVISOR_OPTIONS,
  ORGANIZER_ADVISORS,
  resolveOrganizerAdvisor,
} from "../organizerAdvisors";

describe("resolveOrganizerAdvisor", () => {
  it("resolve o assessor pelo id do enum do backend", () => {
    expect(resolveOrganizerAdvisor("LUCAS_SANTOS").name).toBe("Lucas Santos");
    expect(resolveOrganizerAdvisor("GUARIM").name).toBe("Guarim");
  });

  it("organização sem assessor cai no padrão", () => {
    // Orgs criadas antes do campo existir chegam com undefined/null.
    expect(resolveOrganizerAdvisor(undefined).id).toBe(DEFAULT_ADVISOR_ID);
    expect(resolveOrganizerAdvisor(null).id).toBe(DEFAULT_ADVISOR_ID);
  });

  it("valor desconhecido cai no padrão em vez de quebrar", () => {
    // Cenário real: backend ganha um assessor novo e o front ainda não subiu.
    expect(resolveOrganizerAdvisor("ASSESSOR_QUE_NAO_EXISTE").id).toBe(
      DEFAULT_ADVISOR_ID,
    );
  });

  it("nunca devolve undefined — o widget sempre tem alguém para exibir", () => {
    for (const value of ["", "  ", "gu arim", "guarim"]) {
      expect(resolveOrganizerAdvisor(value)).toBeDefined();
    }
  });
});

describe("buildAdvisorWhatsappUrl", () => {
  it("monta o link com o telefone do assessor e o nome da organização", () => {
    const url = buildAdvisorWhatsappUrl(
      ORGANIZER_ADVISORS.GUARIM,
      "Corrida da Cidade",
    );
    expect(url).toContain(`phone=${ORGANIZER_ADVISORS.GUARIM.whatsappPhone}`);
    expect(url).toContain(encodeURIComponent("Minha organização é Corrida da Cidade"));
  });

  it("sem nome da organização usa só a mensagem base", () => {
    const url = buildAdvisorWhatsappUrl(ORGANIZER_ADVISORS.GUARIM);
    expect(url).not.toContain("Minha%20organiza");
  });

  it("acento e espaço no nome são encodados (não quebra a URL)", () => {
    const url = buildAdvisorWhatsappUrl(ORGANIZER_ADVISORS.GUARIM, "Ação & Cia");
    expect(url).toContain(encodeURIComponent("Ação & Cia"));
    expect(url).not.toContain("Ação & Cia");
  });

  it("assessor sem telefone devolve null (widget esconde o botão)", () => {
    // Guarda contra o pior caso: mandar o organizador pro WhatsApp errado.
    expect(
      buildAdvisorWhatsappUrl({
        id: "LUCAS_SANTOS",
        name: "Lucas Santos",
        photoUrl: "/images/lucas-santos.jpeg",
        whatsappPhone: "",
      }),
    ).toBeNull();
    expect(
      buildAdvisorWhatsappUrl({
        id: "LUCAS_SANTOS",
        name: "Lucas Santos",
        photoUrl: "/images/lucas-santos.jpeg",
        whatsappPhone: "   ",
      }),
    ).toBeNull();
  });
});

describe("catálogo", () => {
  it("as opções do select cobrem todos os assessores do catálogo", () => {
    // Evita adicionar um assessor e esquecer de expô-lo no admin.
    expect(ORGANIZER_ADVISOR_OPTIONS.map((o) => o.id).sort()).toEqual(
      Object.keys(ORGANIZER_ADVISORS).sort(),
    );
  });

  it("cada entrada tem a chave igual ao próprio id", () => {
    for (const [key, advisor] of Object.entries(ORGANIZER_ADVISORS)) {
      expect(advisor.id).toBe(key);
    }
  });
});
