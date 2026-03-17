import type { Product, ProductMetrics } from "@/types/domain";

const STRIPE_PERCENT_FEE = 0.029;
const STRIPE_FIXED_FEE = 0.3;
const SHOPIFY_PERCENT_FEE = 0.02;

const round = (value: number): number => Math.round(value * 100) / 100;

export const calculateStripeFee = (salePrice: number): number =>
  round(salePrice * STRIPE_PERCENT_FEE + STRIPE_FIXED_FEE);

export const calculateShopifyFee = (salePrice: number): number =>
  round(salePrice * SHOPIFY_PERCENT_FEE);

export const calculateProductMetrics = (input: Omit<Product, "id" | "createdAt">): ProductMetrics => {
  const stripeFee = calculateStripeFee(input.price);
  const shopifyFee = calculateShopifyFee(input.price);

  const totalCost = round(
    input.productCost + input.shippingCost + input.cpaEstimated + stripeFee + shopifyFee,
  );

  const unitProfit = round(input.price - totalCost);
  const netMarginPercent = input.price > 0 ? round((unitProfit / input.price) * 100) : 0;

  const contributionAfterPlatformCosts =
    input.price - input.productCost - input.shippingCost - stripeFee - shopifyFee;

  const breakEvenRoas =
    contributionAfterPlatformCosts > 0
      ? round(input.price / contributionAfterPlatformCosts)
      : Number.POSITIVE_INFINITY;

  return {
    stripeFee,
    shopifyFee,
    totalCost,
    unitProfit,
    netMarginPercent,
    breakEvenRoas,
  };
};

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);

export const formatPercent = (value: number): string => `${value.toFixed(1)}%`;
