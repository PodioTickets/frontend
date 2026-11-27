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
});
