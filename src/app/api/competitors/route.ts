import { NextResponse } from "next/server";
import { resolveSharedUserIds, supabaseAdmin } from "@/lib/server-supabase";

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
