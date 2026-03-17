import { NextRequest, NextResponse } from "next/server";
import { resolveSharedUserIds, supabaseAdmin } from "@/lib/server-supabase";

export async function GET() {
  const userIds = await resolveSharedUserIds();
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, name, product_cost, shipping_cost, cpa_estimated, sale_price, created_at, updated_at, user_id")
    .in("user_id", userIds)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const products = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    productCost: Number(row.product_cost),
    shippingCost: Number(row.shipping_cost),
    cpaEstimated: Number(row.cpa_estimated),
    price: Number(row.sale_price),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
  }));

  return NextResponse.json({ products });
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as {
    actorUserId?: string;
    name: string;
    productCost: number;
    shippingCost: number;
    cpaEstimated: number;
    price: number;
  };

  const userIds = await resolveSharedUserIds();
  const actorUserId = payload.actorUserId && userIds.includes(payload.actorUserId) ? payload.actorUserId : userIds[0];

  const { data, error } = await supabaseAdmin
    .from("products")
    .insert({
      user_id: actorUserId,
      name: payload.name,
      product_cost: payload.productCost,
      shipping_cost: payload.shippingCost,
      cpa_estimated: payload.cpaEstimated,
      sale_price: payload.price,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const actorUserId = request.nextUrl.searchParams.get("actorUserId");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  if (actorUserId) {
    await supabaseAdmin.from("products").update({ user_id: actorUserId }).eq("id", id);
  }

  const { error } = await supabaseAdmin.from("products").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
