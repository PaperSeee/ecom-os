import { NextResponse } from "next/server";
import { resolveSharedUserIds, supabaseAdmin } from "@/lib/server-supabase";

export async function GET() {
  const userIds = await resolveSharedUserIds();

  const { data, error } = await supabaseAdmin
    .from("cashflow_entries")
    .select("id, entry_type, label, amount, entry_date")
    .in("user_id", userIds)
    .order("entry_date", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const entries = (data ?? []).map((row) => ({
    id: row.id,
    type: row.entry_type,
    label: row.label,
    amount: Number(row.amount),
    date: row.entry_date,
  }));

  return NextResponse.json({ entries });
}
