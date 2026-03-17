import "server-only";

import { createClient } from "@supabase/supabase-js";
import { DEFAULT_WORKSPACE_NAME, TEAM_USER_IDS } from "@/lib/team";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in environment");
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const resolveSharedUserIds = async (): Promise<string[]> => {
  const { data, error } = await supabaseAdmin
    .from("workspace_members")
    .select("user_id, workspaces!inner(name)")
    .eq("workspaces.name", DEFAULT_WORKSPACE_NAME);

  if (error || !data || data.length === 0) {
    return [...TEAM_USER_IDS];
  }

  return Array.from(new Set(data.map((row) => row.user_id).filter((value): value is string => Boolean(value))));
};

export const resolveSharedWorkspaceId = async (): Promise<string | null> => {
  const { data, error } = await supabaseAdmin
    .from("workspaces")
    .select("id")
    .eq("name", DEFAULT_WORKSPACE_NAME)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.id;
};
