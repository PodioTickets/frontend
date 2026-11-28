import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { ProductsSection } from "../SubscriptionStep";
import type { Product } from "../SubscriptionStep.utils";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/checkout/produtos",
  useSearchParams: () => new URLSearchParams(),
}));

/** Kit opcional sem variação: só o opt-out + opções antigas sem grupo (variações removidas com vendas). */
const kit: Product = {
  id: "kit-1",
  name: "Kit Sem Variação",
  image: null,
  basePrice: 0,
  isRequired: false,
  isIncludedInTicket: true,
  variations: [
    { id: "no", name: "Sem interesse", price: 0, stock: 0, groupId: null },
    { id: "old-p", name: "P", price: 0, stock: 0, groupId: null },
  ],
  variationGroups: [],
};

function renderSection(selection: string[] | undefined, onSelectionChange = vi.fn()) {
  const { container } = render(
    <ProductsSection
      title="Produtos adicionais"
      products={[kit]}
      participantIndex={0}
      selectedVariations={selection ? { "0::kit-1": selection } : {}}
      onSelectionChange={onSelectionChange}
      variant="desktop"
    />,
  );
  const trigger = container.querySelector("[data-variation-kit-1-button]") as HTMLElement;
  /** Abre o select e clica na opção (o menu vai para um portal no body). */
  const choose = async (label: string) => {
    await act(async () => fireEvent.click(trigger));
    const menu = document.querySelector("[data-variation-kit-1-dropdown]") as HTMLElement;
    await act(async () => fireEvent.click(within(menu).getByText(label)));
  };
  return { onSelectionChange, trigger, choose };
}

describe("Kit sem variação (só opt-out) no checkout", () => {
  it("pergunta 'Quer receber este item?' com Sim por padrão, sem as opções antigas", () => {
    const { trigger } = renderSection(undefined);
    expect(screen.getByText("Quer receber este item?")).toBeInTheDocument();
    expect(screen.queryByText("Escolha a variação")).not.toBeInTheDocument();
    expect(trigger).toHaveTextContent("Sim");
    expect(screen.queryByText("P")).not.toBeInTheDocument();
  });

  it("'Não' grava o opt-out", async () => {
    const { onSelectionChange, choose } = renderSection(undefined);
    await choose("Não");
    expect(onSelectionChange).toHaveBeenLastCalledWith(0, "kit-1", ["no"]);
  });

  it("com o opt-out escolhido mostra 'Não'; 'Sim' limpa a seleção", async () => {
    const { onSelectionChange, trigger, choose } = renderSection(["no"]);
    expect(trigger).toHaveTextContent("Não");
    await choose("Sim");
    expect(onSelectionChange).toHaveBeenLastCalledWith(0, "kit-1", []);
  });

  it("kit obrigatório sem variação: 'Sim' travado, sem opção de 'Não'", () => {
    render(
      <ProductsSection
        title="Produtos do kit"
        products={[{ ...kit, id: "obr", isRequired: true, variations: [] }]}
        participantIndex={0}
        selectedVariations={{}}
        onSelectionChange={vi.fn()}
        variant="desktop"
      />,
    );
    expect(screen.getByText("Quer receber este item?")).toBeInTheDocument();
    expect(screen.getByText("Sim")).toBeInTheDocument();
    expect(screen.queryByText("Não")).not.toBeInTheDocument();
    expect(document.querySelector("[aria-disabled]")).toHaveTextContent("Sim");
  });

  it("kit obrigatório com variação não oferece 'Sem interesse' (mesmo com a opção antiga no banco)", async () => {
    const obrigatorio: Product = {
      ...kit,
      id: "kit-2",
      isRequired: true,
      variations: [
        { id: "no", name: "Sem interesse", price: 0, stock: 0, groupId: null },
        { id: "c-p", name: "P", price: 0, stock: 0, groupId: "g" },
        { id: "c-m", name: "M", price: 0, stock: 0, groupId: "g" },
      ],
      variationGroups: [
        {
          id: "g",
          name: "Camisa",
          variations: [
            { id: "c-p", name: "P", price: 0, stock: 0, groupId: "g" },
            { id: "c-m", name: "M", price: 0, stock: 0, groupId: "g" },
          ],
        },
      ],
    };
    const { container } = render(
      <ProductsSection
        title="Produtos do kit"
        products={[obrigatorio]}
        participantIndex={0}
        selectedVariations={{}}
        onSelectionChange={vi.fn()}
        variant="desktop"
      />,
    );
    await act(async () => fireEvent.click(container.querySelector("[data-variation-kit-2-button]") as HTMLElement));
    expect(screen.getByText("M")).toBeInTheDocument();
    expect(screen.queryByText("Sem interesse")).not.toBeInTheDocument();
  });
});
