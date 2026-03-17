export type Trend = "up" | "down" | "flat";

export type TimeRange = "day" | "week" | "month";

export type Associate = "Associate A" | "Associate B";

export type ChecklistCategory = "Research" | "Shop" | "Creatives" | "Technical";

export interface Product {
  id: string;
  name: string;
  price: number;
  productCost: number;
  shippingCost: number;
  cpaEstimated: number;
  createdAt: string;
}

export interface ProductMetrics {
  stripeFee: number;
  shopifyFee: number;
  totalCost: number;
  unitProfit: number;
  netMarginPercent: number;
  breakEvenRoas: number;
}

export interface DashboardKpi {
  id: string;
  label: string;
  value: string;
  trend: Trend;
  trendValue: string;
}

export interface LaunchpadTask {
  id: string;
  title: string;
  category: ChecklistCategory;
  isCritical: boolean;
  assignee: Associate;
  validatedAt: string | null;
  validatedBy: Associate | null;
  sortOrder: number;
}

export interface AlertItem {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
}

export interface Competitor {
  id: string;
  brandName: string;
  niche: string;
  storeUrl: string;
  adLibraryUrl: string;
  marketingAngle: string;
  observations: string;
  threatScore: number;
}

export interface Campaign {
  id: string;
  platform: "Meta" | "TikTok";
  name: string;
  budget: number;
  roas: number;
  status: "active" | "testing" | "paused";
}

export interface ScalingLog {
  id: string;
  campaignId: string;
  decision: "Increase Budget" | "Cut" | "Test New Angle";
  note: string;
  author: string;
  createdAt: string;
}

export interface CashflowEntry {
  id: string;
  type: "inflow" | "outflow";
  label: string;
  amount: number;
  date: string;
}
