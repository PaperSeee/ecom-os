import { NextRequest, NextResponse } from "next/server";
import { resolveSharedWorkspaceId, resolveSharedUserIds, supabaseAdmin } from "@/lib/server-supabase";

export async function GET() {
  const workspaceId = await resolveSharedWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ startingCapital: 0 });
  }

  const { data, error } = await supabaseAdmin
    .from("financial_settings")
    .select("starting_capital")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ startingCapital: Number(data?.starting_capital ?? 0) });
}

export async function PATCH(request: NextRequest) {
  const payload = (await request.json()) as { startingCapital: number; actorUserId?: string };

  const workspaceId = await resolveSharedWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 400 });
  }

  const userIds = await resolveSharedUserIds();
  const actorUserId = payload.actorUserId && userIds.includes(payload.actorUserId) ? payload.actorUserId : userIds[0];

  const { error } = await supabaseAdmin.from("financial_settings").upsert(
    {
      workspace_id: workspaceId,
      starting_capital: payload.startingCapital,
      updated_by: actorUserId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
