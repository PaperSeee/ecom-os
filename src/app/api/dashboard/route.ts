import { NextResponse } from "next/server";
import { calculateProductMetrics, formatCurrency } from "@/lib/financial";
import { resolveSharedUserIds, supabaseAdmin } from "@/lib/server-supabase";

interface ExternalMetrics {
  roas?: number;
  cpa?: number;
}

const fetchExternalMetrics = async (): Promise<ExternalMetrics | null> => {
  const endpoint = process.env.EXTERNAL_METRICS_API_URL;
  if (!endpoint) {
    return null;
  }

  try {
    const response = await fetch(endpoint, {
      headers: process.env.EXTERNAL_METRICS_API_KEY
        ? { Authorization: `Bearer ${process.env.EXTERNAL_METRICS_API_KEY}` }
        : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ExternalMetrics;
    return payload;
  } catch {
    return null;
  }
};

export async function GET() {
  const userIds = await resolveSharedUserIds();

  const [productsRes, tasksRes, alertsRes, cashflowRes] = await Promise.all([
    supabaseAdmin
      .from("products")
      .select("sale_price, cpa_estimated, product_cost, shipping_cost")
      .in("user_id", userIds),
    supabaseAdmin
      .from("checklist_tasks")
      .select("title, is_critical, validated_at")
      .in("user_id", userIds),
    supabaseAdmin
      .from("alerts")
      .select("id, title, description, severity")
      .in("user_id", userIds)
      .eq("is_resolved", false)
      .order("created_at", { ascending: false })
      .limit(3),
    supabaseAdmin
      .from("cashflow_entries")
      .select("entry_date, amount, entry_type")
      .in("user_id", userIds)
      .order("entry_date", { ascending: true }),
  ]);

  const firstError = [productsRes.error, tasksRes.error, alertsRes.error, cashflowRes.error].find(Boolean);
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const products = productsRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const alerts = alertsRes.data ?? [];
  const cashflow = cashflowRes.data ?? [];

  let revenue = 0;
  let spend = 0;
  let profit = 0;

  for (const row of products) {
    const metrics = calculateProductMetrics({
      name: "",
      price: Number(row.sale_price),
      productCost: Number(row.product_cost),
      shippingCost: Number(row.shipping_cost),
      cpaEstimated: Number(row.cpa_estimated),
    });

    revenue += Number(row.sale_price);
    spend += Number(row.cpa_estimated);
    profit += metrics.unitProfit;
  }

  const roas = spend > 0 ? revenue / spend : 0;
  const externalMetrics = await fetchExternalMetrics();
  const roasDisplay = typeof externalMetrics?.roas === "number" ? externalMetrics.roas : roas;
  const cpaDisplay = typeof externalMetrics?.cpa === "number" ? externalMetrics.cpa : spend > 0 && products.length > 0 ? spend / products.length : 0;

  const blockers = tasks.filter((task) => task.is_critical && !task.validated_at);
  const progress = tasks.length > 0 ? Math.round((tasks.filter((task) => task.validated_at).length / tasks.length) * 100) : 0;

  const byDate = new Map<string, { revenue: number; spend: number }>();
  for (const row of cashflow) {
    const key = row.entry_date;
    const entry = byDate.get(key) ?? { revenue: 0, spend: 0 };
    if (row.entry_type === "inflow") {
      entry.revenue += Number(row.amount);
    } else {
      entry.spend += Number(row.amount);
    }
    byDate.set(key, entry);
  }

  const chartData = Array.from(byDate.entries())
    .slice(-7)
    .map(([date, values]) => ({
      label: new Date(date).toLocaleDateString("fr-FR", { weekday: "short" }),
      revenue: values.revenue,
      spend: values.spend,
      profit: values.revenue - values.spend,
    }));

  const kpis = [
    { id: "ca", label: "CA", value: formatCurrency(revenue), trend: "up", trendValue: `${products.length} SKU` },
    { id: "spend", label: "Spend", value: formatCurrency(spend), trend: "up", trendValue: "Acquisition" },
    {
      id: "profit",
      label: "Profit",
      value: formatCurrency(profit),
      trend: profit >= 0 ? "up" : "down",
      trendValue: profit >= 0 ? "Profitable" : "Sous seuil",
    },
    { id: "roas", label: "ROAS", value: roasDisplay.toFixed(2), trend: roasDisplay >= 2 ? "up" : "down", trendValue: externalMetrics ? "API" : "Live" },
    { id: "cpa", label: "CPA", value: formatCurrency(cpaDisplay), trend: cpaDisplay <= 18 ? "up" : "down", trendValue: externalMetrics ? "API" : "Estimate" },
  ];

  return NextResponse.json({
    kpis,
    blockers,
    alerts,
    progress,
    chartData,
  });
}
