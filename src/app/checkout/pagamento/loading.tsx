import { CheckoutStepSkeleton } from "@/components/Checkout/CheckoutStepSkeleton";

export default function CheckoutPagamentoLoading() {
  return <CheckoutStepSkeleton activeStep={4} variant="payment" />;
}
