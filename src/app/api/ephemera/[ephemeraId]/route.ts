import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type EphemeraDetail = {
  id: string;
  owner_profile_id: string;
  creator_profile_id: string;
  title: string;
  file_type: "image" | "pdf";
  file_url: string;
  created_at: string;
  expires_at: string;
  updated_at: string;
};

type RouteParams = {
  params: Promise<{
    ephemeraId: string;
  }>;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";

  if (!authorization.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice("Bearer ".length).trim();
}

function getRemainingSeconds(expiresAt: string) {
  const remaining = Math.floor(
    (new Date(expiresAt).getTime() - Date.now()) / 1000,
  );

  return Math.max(0, remaining);
}

export async function GET(request: Request, context: RouteParams) {
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

  const { ephemeraId } = await context.params;

  if (!uuidPattern.test(ephemeraId)) {
    return NextResponse.json(
      { error: "エフェメラIDの形式が正しくありません。" },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("ephemeras")
    .select(
      "id, owner_profile_id, creator_profile_id, title, file_type, file_url, created_at, expires_at, updated_at",
    )
    .eq("id", ephemeraId)
    .eq("owner_profile_id", user.id)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "エフェメラが見つかりません。" },
      { status: 404 },
    );
  }

  const ephemera = data as EphemeraDetail;

  return NextResponse.json({
    ephemera,
    remainingSeconds: getRemainingSeconds(ephemera.expires_at),
  });
}
