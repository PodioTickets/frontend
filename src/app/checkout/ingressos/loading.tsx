import { CheckoutStepSkeleton } from "@/components/Checkout/CheckoutStepSkeleton";

export default function CheckoutIngressosLoading() {
  return <CheckoutStepSkeleton activeStep={1} variant="tickets" />;
}
