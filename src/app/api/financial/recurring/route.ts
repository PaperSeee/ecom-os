import { NextRequest, NextResponse } from "next/server";
import { resolveSharedUserIds, resolveSharedWorkspaceId, supabaseAdmin } from "@/lib/server-supabase";

export async function GET() {
  const workspaceId = await resolveSharedWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ recurring: [] });
  }

  const { data, error } = await supabaseAdmin
    .from("recurring_costs")
    .select("id, label, amount, cost_type, cadence, next_charge_date, user_id, updated_at")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (error) {
    const { data: fallbackRows, error: fallbackError } = await supabaseAdmin
      .from("alerts")
      .select("id, title, description, user_id, created_at")
      .eq("severity", "info")
      .ilike("title", "RECURRING::%");

    if (fallbackError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const recurring = (fallbackRows ?? []).map((row) => {
      let parsed: { amount?: number; costType?: "fixed" | "variable"; cadence?: string; nextChargeDate?: string } = {};
      try {
        parsed = JSON.parse(row.description);
      } catch {
        parsed = {};
      }

      return {
        id: `alert_${row.id}`,
        label: row.title.replace("RECURRING::", ""),
        amount: Number(parsed.amount ?? 0),
        costType: (parsed.costType ?? "fixed") as "fixed" | "variable",
        cadence: parsed.cadence ?? "monthly",
        nextChargeDate: parsed.nextChargeDate ?? null,
        userId: row.user_id,
        updatedAt: row.created_at,
      };
    });

    return NextResponse.json({ recurring, mode: "fallback" });
  }

  const recurring = (data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    amount: Number(row.amount),
    costType: row.cost_type as "fixed" | "variable",
    cadence: row.cadence,
    nextChargeDate: row.next_charge_date,
    userId: row.user_id,
    updatedAt: row.updated_at,
  }));

  return NextResponse.json({ recurring });
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as {
    actorUserId?: string;
    label: string;
    amount: number;
    costType: "fixed" | "variable";
    cadence: "weekly" | "monthly" | "quarterly";
    nextChargeDate: string;
  };

  const workspaceId = await resolveSharedWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 400 });
  }

  const userIds = await resolveSharedUserIds();
  const actorUserId = payload.actorUserId && userIds.includes(payload.actorUserId) ? payload.actorUserId : userIds[0];

  const { error } = await supabaseAdmin.from("recurring_costs").insert({
    workspace_id: workspaceId,
    user_id: actorUserId,
    label: payload.label,
    amount: payload.amount,
    cost_type: payload.costType,
    cadence: payload.cadence,
    next_charge_date: payload.nextChargeDate,
  });

  if (error) {
    const fallback = await supabaseAdmin.from("alerts").insert({
      user_id: actorUserId,
      workspace_id: workspaceId,
      title: `RECURRING::${payload.label}`,
      description: JSON.stringify({
        amount: payload.amount,
        costType: payload.costType,
        cadence: payload.cadence,
        nextChargeDate: payload.nextChargeDate,
      }),
      severity: "info",
      is_resolved: false,
    });

    if (fallback.error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, mode: "fallback" }, { status: 201 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  if (id.startsWith("alert_")) {
    const alertId = id.replace("alert_", "");
    const { error } = await supabaseAdmin.from("alerts").delete().eq("id", alertId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  const { error } = await supabaseAdmin.from("recurring_costs").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
