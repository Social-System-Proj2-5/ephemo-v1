import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type TransferRecordRow = {
  id: string;
  sender_profile_id: string;
  recipient_profile_id: string;
  ephemera_id_snapshot: string | null;
  ephemera_title_snapshot: string;
  file_type_snapshot: "image" | "pdf";
  transferred_at: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
};

type RouteParams = {
  params: Promise<{
    recordId: string;
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

  const { recordId } = await context.params;

  if (!uuidPattern.test(recordId)) {
    return NextResponse.json(
      { error: "共有履歴IDの形式が正しくありません。" },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("ephemera_transfer_records")
    .select(
      "id, sender_profile_id, recipient_profile_id, ephemera_id_snapshot, ephemera_title_snapshot, file_type_snapshot, transferred_at, created_at",
    )
    .eq("id", recordId)
    .or(`sender_profile_id.eq.${user.id},recipient_profile_id.eq.${user.id}`)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "共有履歴が見つかりません。" },
      { status: 404 },
    );
  }

  const record = data as TransferRecordRow;
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, username, display_name")
    .in("id", [record.sender_profile_id, record.recipient_profile_id]);

  if (profilesError) {
    return NextResponse.json(
      { error: profilesError.message },
      { status: 500 },
    );
  }

  const profileMap = new Map(
    ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
  );
  const sender = profileMap.get(record.sender_profile_id);
  const recipient = profileMap.get(record.recipient_profile_id);

  return NextResponse.json({
    transferRecord: {
      id: record.id,
      direction: record.sender_profile_id === user.id ? "sent" : "received",
      ephemeraId: record.ephemera_id_snapshot,
      ephemeraTitle: record.ephemera_title_snapshot,
      fileType: record.file_type_snapshot,
      transferredAt: record.transferred_at,
      createdAt: record.created_at,
      sender: {
        id: record.sender_profile_id,
        username: sender?.username ?? null,
        displayName: sender?.display_name ?? null,
      },
      recipient: {
        id: record.recipient_profile_id,
        username: recipient?.username ?? null,
        displayName: recipient?.display_name ?? null,
      },
    },
  });
}
