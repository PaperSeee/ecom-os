import { NextRequest, NextResponse } from "next/server";
import { resolveSharedUserIds, resolveSharedWorkspaceId, supabaseAdmin } from "@/lib/server-supabase";

export async function GET() {
  const userIds = await resolveSharedUserIds();

  const logsPromise = supabaseAdmin
    .from("scaling_logs")
    .select("id, campaign_id, decision, note, author, created_at")
    .in("user_id", userIds)
    .order("created_at", { ascending: false })
    .limit(12);

  const campaignsWithDailyRes = await supabaseAdmin
    .from("campaigns")
    .select("id, platform, name, budget, daily_budget, roas, status")
    .in("user_id", userIds)
    .order("created_at", { ascending: false });

  let campaignsError = campaignsWithDailyRes.error;
  let campaignRows: Array<{ id: string; platform: string; name: string; budget: number; daily_budget?: number; roas: number; status: string }> =
    (campaignsWithDailyRes.data as Array<{ id: string; platform: string; name: string; budget: number; daily_budget?: number; roas: number; status: string }> | null) ?? [];

  if (campaignsError?.message.includes("daily_budget")) {
    const fallbackCampaignsRes = await supabaseAdmin
      .from("campaigns")
      .select("id, platform, name, budget, roas, status")
      .in("user_id", userIds)
      .order("created_at", { ascending: false });
    campaignsError = fallbackCampaignsRes.error;
    campaignRows =
      ((fallbackCampaignsRes.data as Array<{ id: string; platform: string; name: string; budget: number; roas: number; status: string }> | null) ?? []).map(
        (row) => ({ ...row, daily_budget: row.budget }),
      );
  }

  const logsRes = await logsPromise;

  if (campaignsError || logsRes.error) {
    return NextResponse.json({ error: campaignsError?.message ?? logsRes.error?.message }, { status: 500 });
  }

  const campaigns = campaignRows.map((row) => ({
    ...row,
    daily_budget: typeof row.daily_budget === "number" ? row.daily_budget : row.budget,
  }));

  return NextResponse.json({ campaigns, logs: logsRes.data ?? [] });
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as
    | {
        entity: "campaign";
        actorUserId?: string;
        platform: "Meta" | "TikTok";
        name: string;
        budget: number;
        dailyBudget?: number;
        roas: number;
        status: "testing" | "paused" | "stopped" | "scaling";
      }
    | {
        entity: "log";
        actorUserId?: string;
        campaignId: string;
        decision: "Increase Budget" | "Cut" | "Test New Angle";
        note: string;
        author: string;
      };

  const workspaceId = await resolveSharedWorkspaceId();
  const userIds = await resolveSharedUserIds();
  const actorUserId = payload.actorUserId && userIds.includes(payload.actorUserId) ? payload.actorUserId : userIds[0];

  if (payload.entity === "campaign") {
    let { error } = await supabaseAdmin.from("campaigns").insert({
      workspace_id: workspaceId,
      user_id: actorUserId,
      platform: payload.platform,
      name: payload.name,
      budget: payload.budget,
      daily_budget: payload.dailyBudget ?? payload.budget,
      roas: payload.roas,
      status: payload.status,
    });

    if (error?.message.includes("daily_budget") || error?.message.includes("status")) {
      const fallbackStatus = payload.status === "stopped" ? "paused" : payload.status === "scaling" ? "active" : payload.status;
      const fallback = await supabaseAdmin.from("campaigns").insert({
        workspace_id: workspaceId,
        user_id: actorUserId,
        platform: payload.platform,
        name: payload.name,
        budget: payload.dailyBudget ?? payload.budget,
        roas: payload.roas,
        status: fallbackStatus,
      });
      error = fallback.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (payload.entity === "log") {
    const { error } = await supabaseAdmin.from("scaling_logs").insert({
      workspace_id: workspaceId,
      user_id: actorUserId,
      campaign_id: payload.campaignId,
      decision: payload.decision,
      note: payload.note,
      author: payload.author,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const payload = (await request.json()) as {
    id: string;
    actorUserId?: string;
    budget?: number;
    dailyBudget?: number;
    roas?: number;
    status?: "testing" | "paused" | "stopped" | "scaling";
    name?: string;
  };

  const userIds = await resolveSharedUserIds();
  const actorUserId = payload.actorUserId && userIds.includes(payload.actorUserId) ? payload.actorUserId : userIds[0];

  let { error } = await supabaseAdmin
    .from("campaigns")
    .update({
      user_id: actorUserId,
      budget: payload.budget,
      daily_budget: payload.dailyBudget,
      roas: payload.roas,
      status: payload.status,
      name: payload.name,
    })
    .eq("id", payload.id);

  if (error?.message.includes("daily_budget") || error?.message.includes("status")) {
    const fallbackStatus = payload.status === "stopped" ? "paused" : payload.status === "scaling" ? "active" : payload.status;
    const fallback = await supabaseAdmin
      .from("campaigns")
      .update({
        user_id: actorUserId,
        budget: payload.dailyBudget ?? payload.budget,
        roas: payload.roas,
        status: fallbackStatus,
        name: payload.name,
      })
      .eq("id", payload.id);
    error = fallback.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const entity = request.nextUrl.searchParams.get("entity");
  if (!id || !entity) {
    return NextResponse.json({ error: "Missing id or entity" }, { status: 400 });
  }

  if (entity === "campaign") {
    const { error } = await supabaseAdmin.from("campaigns").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (entity === "log") {
    const { error } = await supabaseAdmin.from("scaling_logs").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
