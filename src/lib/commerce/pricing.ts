export interface PricingInputs {
  supplierCost: number;
  shippingCost?: number;
  paymentFee?: number;
  platformFee?: number;
  fulfillmentCost?: number;
  returnReserve?: number;
  operationsCost?: number;
  targetContributionMargin?: number;
}

export interface PricingResult {
  landedCost: number;
  minimumSellingPrice: number;
  contributionAtPrice: (sellingPrice: number) => number;
  contributionMarginAtPrice: (sellingPrice: number) => number;
}

const n = (value: number | undefined) => Math.max(0, Math.round(value ?? 0));

export function calculateCommercePrice(input: PricingInputs): PricingResult {
  const landedCost = [
    input.supplierCost,
    input.shippingCost,
    input.paymentFee,
    input.platformFee,
    input.fulfillmentCost,
    input.returnReserve,
    input.operationsCost,
  ].reduce((sum, value) => sum + n(value), 0);

  const target = Math.min(0.95, Math.max(0.01, input.targetContributionMargin ?? 0.25));
  const minimumSellingPrice = Math.ceil(landedCost / (1 - target));

  const contributionAtPrice = (sellingPrice: number) => Math.round(sellingPrice - landedCost);
  const contributionMarginAtPrice = (sellingPrice: number) =>
    sellingPrice > 0 ? contributionAtPrice(sellingPrice) / sellingPrice : 0;

  return { landedCost, minimumSellingPrice, contributionAtPrice, contributionMarginAtPrice };
}
