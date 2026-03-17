import { NextRequest, NextResponse } from "next/server";
import { resolveSharedUserIds, resolveSharedWorkspaceId, supabaseAdmin } from "@/lib/server-supabase";

export async function GET() {
  const userIds = await resolveSharedUserIds();

  const [campaignsRes, logsRes] = await Promise.all([
    supabaseAdmin
      .from("campaigns")
      .select("id, platform, name, budget, roas, status")
      .in("user_id", userIds)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("scaling_logs")
      .select("id, campaign_id, decision, note, author, created_at")
      .in("user_id", userIds)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (campaignsRes.error || logsRes.error) {
    return NextResponse.json({ error: campaignsRes.error?.message ?? logsRes.error?.message }, { status: 500 });
  }

  return NextResponse.json({ campaigns: campaignsRes.data ?? [], logs: logsRes.data ?? [] });
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as
    | {
        entity: "campaign";
        actorUserId?: string;
        platform: "Meta" | "TikTok";
        name: string;
        budget: number;
        roas: number;
        status: "active" | "testing" | "paused";
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
    const { error } = await supabaseAdmin.from("campaigns").insert({
      workspace_id: workspaceId,
      user_id: actorUserId,
      platform: payload.platform,
      name: payload.name,
      budget: payload.budget,
      roas: payload.roas,
      status: payload.status,
    });

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
    roas?: number;
    status?: "active" | "testing" | "paused";
    name?: string;
  };

  const userIds = await resolveSharedUserIds();
  const actorUserId = payload.actorUserId && userIds.includes(payload.actorUserId) ? payload.actorUserId : userIds[0];

  const { error } = await supabaseAdmin
    .from("campaigns")
    .update({
      user_id: actorUserId,
      budget: payload.budget,
      roas: payload.roas,
      status: payload.status,
      name: payload.name,
    })
    .eq("id", payload.id);

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
