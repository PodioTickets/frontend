import { CheckoutStepSkeleton } from "@/components/Checkout/CheckoutStepSkeleton";

export default function CheckoutProdutosLoading() {
  return <CheckoutStepSkeleton activeStep={3} variant="products" />;
}
