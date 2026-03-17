import { NextResponse } from "next/server";
import { resolveSharedUserIds, supabaseAdmin } from "@/lib/server-supabase";

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
