import { NextRequest, NextResponse } from "next/server";
import { resolveSharedUserIds, supabaseAdmin } from "@/lib/server-supabase";

export async function GET() {
  const userIds = await resolveSharedUserIds();
  const { data, error } = await supabaseAdmin
    .from("checklist_tasks")
    .select("id, title, category, is_critical, assignee, validated_at, validated_by, sort_order, user_id")
    .in("user_id", userIds)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tasks = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    isCritical: row.is_critical,
    assignee: row.assignee,
    validatedAt: row.validated_at,
    validatedBy: row.validated_by,
    sortOrder: row.sort_order,
    userId: row.user_id,
  }));

  return NextResponse.json({ tasks });
}

export async function PATCH(request: NextRequest) {
  const payload = (await request.json()) as {
    id: string;
    action: "assign" | "toggle-critical" | "toggle-validation";
    value?: string;
    validator?: string;
  };

  if (!payload.id) {
    return NextResponse.json({ error: "Missing task id" }, { status: 400 });
  }

  const { data: current, error: currentError } = await supabaseAdmin
    .from("checklist_tasks")
    .select("id, is_critical, validated_at")
    .eq("id", payload.id)
    .single();

  if (currentError || !current) {
    return NextResponse.json({ error: currentError?.message ?? "Task not found" }, { status: 404 });
  }

  if (payload.action === "assign") {
    const { error } = await supabaseAdmin
      .from("checklist_tasks")
      .update({ assignee: payload.value })
      .eq("id", payload.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (payload.action === "toggle-critical") {
    const { error } = await supabaseAdmin
      .from("checklist_tasks")
      .update({ is_critical: !current.is_critical })
      .eq("id", payload.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (payload.action === "toggle-validation") {
    const nextValidatedAt = current.validated_at ? null : new Date().toISOString();
    const nextValidatedBy = current.validated_at ? null : payload.validator ?? "Associate A";

    const { error } = await supabaseAdmin
      .from("checklist_tasks")
      .update({ validated_at: nextValidatedAt, validated_by: nextValidatedBy })
      .eq("id", payload.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
