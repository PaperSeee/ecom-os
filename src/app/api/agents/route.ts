import { NextRequest, NextResponse } from "next/server";
import { resolveSharedUserIds, resolveSharedWorkspaceId, supabaseAdmin } from "@/lib/server-supabase";

interface SeedAgent {
  name: string;
  phone: string;
  contactHandle: string;
  rating: number;
  notes: string;
}

const SEED_AGENTS: SeedAgent[] = [
  { name: "Sara", phone: "+86 135 7070 5010", contactHandle: "", rating: 4, notes: "" },
  { name: "Jessie", phone: "+86 185 6381 0176", contactHandle: "", rating: 4, notes: "" },
  { name: "Cherry", phone: "", contactHandle: "Lien fourni", rating: 3, notes: "Pas de numero" },
  { name: "Irene", phone: "+86 185 8377 5703", contactHandle: "", rating: 4, notes: "" },
  { name: "Sunny Yang", phone: "+86 191 638 635 43", contactHandle: "", rating: 4, notes: "" },
  { name: "Anny", phone: "+66 65 960 1044", contactHandle: "", rating: 4, notes: "" },
  { name: "Tina (Wei Assistante)", phone: "+852 5182 3672", contactHandle: "", rating: 4, notes: "" },
  { name: "Bellaluo", phone: "+86 134 2871 4608", contactHandle: "", rating: 3, notes: "" },
  { name: "Amy", phone: "+86 177 077 37962", contactHandle: "", rating: 3, notes: "" },
  { name: "Lay / Keer", phone: "+86 158 5453 0808", contactHandle: "", rating: 3, notes: "" },
  { name: "Bruce", phone: "+86 181 6889 2991", contactHandle: "", rating: 3, notes: "" },
  { name: "Chinois 23", phone: "+86 130 2795 6256", contactHandle: "", rating: 3, notes: "" },
  { name: "Jessie (2)", phone: "+86 138 1079 7615", contactHandle: "", rating: 3, notes: "" },
  { name: "Gloria", phone: "+86 130 6782 3207", contactHandle: "", rating: 3, notes: "" },
  { name: "Jessica", phone: "+86 151 8447 5253", contactHandle: "", rating: 4, notes: "" },
  { name: "Chinoise (Cathy)", phone: "+86 181 2392 0215", contactHandle: "", rating: 4, notes: "" },
  { name: "Linda", phone: "+86 150 7774 1001", contactHandle: "", rating: 3, notes: "" },
  { name: "David Supplier", phone: "", contactHandle: "live:.cid.b7671dc1baa2fcb", rating: 3, notes: "Skype uniquement" },
  { name: "Lishan / Lisa", phone: "+86 186 5720 829", contactHandle: "", rating: 4, notes: "" },
];

const seedIfEmpty = async (workspaceId: string, userId: string) => {
  const { count, error } = await supabaseAdmin
    .from("supplier_agents")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  if (error || (count ?? 0) > 0) {
    return;
  }

  const rows = SEED_AGENTS.map((agent) => ({
    workspace_id: workspaceId,
    user_id: userId,
    name: agent.name,
    phone: agent.phone || null,
    contact_handle: agent.contactHandle || null,
    rating: agent.rating,
    notes: agent.notes || null,
  }));

  await supabaseAdmin.from("supplier_agents").insert(rows);
};

export async function GET() {
  const workspaceId = await resolveSharedWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { error: "Workspace introuvable. Verifie SUPABASE_SECRET_KEY puis execute team_onboarding.sql et workspace_audit_migration.sql." },
      { status: 400 },
    );
  }

  const userIds = await resolveSharedUserIds();
  const actorUserId = userIds[0];

  await seedIfEmpty(workspaceId, actorUserId);

  const { data, error } = await supabaseAdmin
    .from("supplier_agents")
    .select("id, name, phone, contact_handle, rating, notes, created_at, updated_at, user_id")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const agents = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    contactHandle: row.contact_handle ?? "",
    rating: row.rating,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
  }));

  return NextResponse.json({ agents });
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as {
    actorUserId?: string;
    name: string;
    phone?: string;
    contactHandle?: string;
    rating?: number;
    notes?: string;
  };

  const workspaceId = await resolveSharedWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { error: "Workspace introuvable. Verifie SUPABASE_SECRET_KEY puis execute team_onboarding.sql et workspace_audit_migration.sql." },
      { status: 400 },
    );
  }

  const userIds = await resolveSharedUserIds();
  const actorUserId = payload.actorUserId && userIds.includes(payload.actorUserId) ? payload.actorUserId : userIds[0];

  const { error } = await supabaseAdmin.from("supplier_agents").insert({
    workspace_id: workspaceId,
    user_id: actorUserId,
    name: payload.name,
    phone: payload.phone?.trim() || null,
    contact_handle: payload.contactHandle?.trim() || null,
    rating: Math.min(5, Math.max(1, Number(payload.rating ?? 3))),
    notes: payload.notes?.trim() || null,
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
    name?: string;
    phone?: string;
    contactHandle?: string;
    rating?: number;
    notes?: string;
  };

  const userIds = await resolveSharedUserIds();
  const actorUserId = payload.actorUserId && userIds.includes(payload.actorUserId) ? payload.actorUserId : userIds[0];

  const { error } = await supabaseAdmin
    .from("supplier_agents")
    .update({
      user_id: actorUserId,
      name: payload.name,
      phone: payload.phone,
      contact_handle: payload.contactHandle,
      rating: payload.rating ? Math.min(5, Math.max(1, Number(payload.rating))) : undefined,
      notes: payload.notes,
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

  const { error } = await supabaseAdmin.from("supplier_agents").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
