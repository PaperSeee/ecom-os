import { NextRequest, NextResponse } from "next/server";
import { resolveSharedUserIds, resolveSharedWorkspaceId, supabaseAdmin } from "@/lib/server-supabase";

export async function GET() {
  const userIds = await resolveSharedUserIds();
  const { data, error } = await supabaseAdmin
    .from("competitors")
    .select("id, brand_name, niche, store_url, ad_library_url, marketing_angle, observations, threat_score")
    .in("user_id", userIds)
    .order("threat_score", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const competitors = (data ?? []).map((row) => ({
    id: row.id,
    brandName: row.brand_name,
    niche: row.niche,
    storeUrl: row.store_url,
    adLibraryUrl: row.ad_library_url,
    marketingAngle: row.marketing_angle,
    observations: row.observations,
    threatScore: row.threat_score,
  }));

  return NextResponse.json({ competitors });
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as {
    actorUserId?: string;
    brandName: string;
    niche: string;
    storeUrl: string;
    adLibraryUrl: string;
    marketingAngle: string;
    observations: string;
    threatScore: number;
  };

  const workspaceId = await resolveSharedWorkspaceId();
  const userIds = await resolveSharedUserIds();
  const actorUserId = payload.actorUserId && userIds.includes(payload.actorUserId) ? payload.actorUserId : userIds[0];

  const { error } = await supabaseAdmin.from("competitors").insert({
    workspace_id: workspaceId,
    user_id: actorUserId,
    brand_name: payload.brandName,
    niche: payload.niche,
    store_url: payload.storeUrl,
    ad_library_url: payload.adLibraryUrl,
    marketing_angle: payload.marketingAngle,
    observations: payload.observations,
    threat_score: payload.threatScore,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const payload = (await request.json()) as {
    id: string;
    actorUserId?: string;
    brandName?: string;
    niche?: string;
    storeUrl?: string;
    adLibraryUrl?: string;
    marketingAngle?: string;
    observations?: string;
    threatScore?: number;
  };

  const userIds = await resolveSharedUserIds();
  const actorUserId = payload.actorUserId && userIds.includes(payload.actorUserId) ? payload.actorUserId : userIds[0];

  const { error } = await supabaseAdmin
    .from("competitors")
    .update({
      user_id: actorUserId,
      brand_name: payload.brandName,
      niche: payload.niche,
      store_url: payload.storeUrl,
      ad_library_url: payload.adLibraryUrl,
      marketing_angle: payload.marketingAngle,
      observations: payload.observations,
      threat_score: payload.threatScore,
    })
    .eq("id", payload.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("competitors").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
