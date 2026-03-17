import { NextRequest, NextResponse } from "next/server";
import { resolveSharedUserIds, resolveSharedWorkspaceId, supabaseAdmin } from "@/lib/server-supabase";

export async function GET() {
  const workspaceId = await resolveSharedWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ recurring: [] });
  }

  const { data, error } = await supabaseAdmin
    .from("recurring_costs")
    .select("id, label, amount, cost_type, cadence, user_id, updated_at")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const recurring = (data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    amount: Number(row.amount),
    costType: row.cost_type as "fixed" | "variable",
    cadence: row.cadence,
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
    cadence: "monthly",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("recurring_costs").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
