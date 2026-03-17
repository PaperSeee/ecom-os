import { NextRequest, NextResponse } from "next/server";
import { resolveSharedUserIds, resolveSharedWorkspaceId, supabaseAdmin } from "@/lib/server-supabase";

export async function GET() {
  const userIds = await resolveSharedUserIds();
  const { data, error } = await supabaseAdmin
    .from("todo_items")
    .select("id, title, details, priority, status, due_date, assignee, created_at, updated_at, user_id")
    .in("user_id", userIds)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    details: row.details ?? "",
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date,
    assignee: row.assignee,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
  }));

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as {
    actorUserId?: string;
    title: string;
    details?: string;
    priority: "low" | "medium" | "high";
    status: "todo" | "in_progress" | "done";
    dueDate?: string | null;
    assignee: string;
  };

  const workspaceId = await resolveSharedWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 400 });
  }

  const userIds = await resolveSharedUserIds();
  const actorUserId = payload.actorUserId && userIds.includes(payload.actorUserId) ? payload.actorUserId : userIds[0];

  const { error } = await supabaseAdmin.from("todo_items").insert({
    workspace_id: workspaceId,
    user_id: actorUserId,
    title: payload.title,
    details: payload.details ?? "",
    priority: payload.priority,
    status: payload.status,
    due_date: payload.dueDate ?? null,
    assignee: payload.assignee,
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
    title?: string;
    details?: string;
    priority?: "low" | "medium" | "high";
    status?: "todo" | "in_progress" | "done";
    dueDate?: string | null;
    assignee?: string;
  };

  const userIds = await resolveSharedUserIds();
  const actorUserId = payload.actorUserId && userIds.includes(payload.actorUserId) ? payload.actorUserId : userIds[0];

  const { error } = await supabaseAdmin
    .from("todo_items")
    .update({
      user_id: actorUserId,
      title: payload.title,
      details: payload.details,
      priority: payload.priority,
      status: payload.status,
      due_date: payload.dueDate,
      assignee: payload.assignee,
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

  const { error } = await supabaseAdmin.from("todo_items").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
