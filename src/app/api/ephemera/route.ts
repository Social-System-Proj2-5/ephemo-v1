import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type EphemeraRow = {
  id: string;
  title: string;
  file_type: "image" | "pdf";
  file_url: string;
  created_at: string;
  expires_at: string;
};

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";

  if (!authorization.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice("Bearer ".length).trim();
}

export async function GET(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    return NextResponse.json(
      { error: "ログイン情報を確認できませんでした。" },
      { status: 401 },
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json(
      { error: "ログイン情報が無効です。もう一度ログインしてください。" },
      { status: 401 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("ephemeras")
    .select("id, title, file_type, file_url, created_at, expires_at")
    .eq("owner_profile_id", user.id)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ephemeras: (data ?? []) as EphemeraRow[] });
}
