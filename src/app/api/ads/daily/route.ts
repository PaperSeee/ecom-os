import { NextRequest, NextResponse } from "next/server";
import { resolveSharedUserIds, resolveSharedWorkspaceId, supabaseAdmin } from "@/lib/server-supabase";

export async function GET() {
  const userIds = await resolveSharedUserIds();

  const { data, error } = await supabaseAdmin
    .from("campaign_daily_stats")
    .select("id, campaign_id, stat_date, roas, cpm, spend, budget_reached, notes, created_at")
    .in("user_id", userIds)
    .order("stat_date", { ascending: false })
    .limit(40);

  if (error) {
    if (error.message.includes("campaign_daily_stats")) {
      return NextResponse.json({ stats: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ stats: data ?? [] });
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as {
    actorUserId?: string;
    campaignId: string;
    statDate: string;
    roas: number;
    cpm: number;
    spend: number;
    budgetReached: boolean;
    notes?: string;
  };

  const userIds = await resolveSharedUserIds();
  const actorUserId = payload.actorUserId && userIds.includes(payload.actorUserId) ? payload.actorUserId : userIds[0];
  const workspaceId = await resolveSharedWorkspaceId();

  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace introuvable. Lance la migration workspace d'abord." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("campaign_daily_stats").insert({
    workspace_id: workspaceId,
    user_id: actorUserId,
    campaign_id: payload.campaignId,
    stat_date: payload.statDate,
    roas: payload.roas,
    cpm: payload.cpm,
    spend: payload.spend,
    budget_reached: payload.budgetReached,
    notes: payload.notes ?? "",
  });

  if (error) {
    if (error.message.includes("campaign_daily_stats")) {
      return NextResponse.json({ error: "Migration manquante: execute supabase/product_campaign_todo_upgrade.sql" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("campaign_daily_stats").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
