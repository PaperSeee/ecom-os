import { NextResponse } from "next/server";
import { calculateProductMetrics, formatCurrency } from "@/lib/financial";
import { resolveSharedUserIds, supabaseAdmin } from "@/lib/server-supabase";

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
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

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
    { id: "roas", label: "ROAS", value: roas.toFixed(2), trend: roas >= 2 ? "up" : "down", trendValue: "Live" },
    { id: "margin", label: "Marge nette", value: `${margin.toFixed(1)}%`, trend: "flat", trendValue: "Live" },
  ];

  return NextResponse.json({
    kpis,
    blockers,
    alerts,
    progress,
    chartData,
  });
}
