import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const defaultLimit = 20;
const maxLimit = 100;

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

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";

  if (!authorization.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice("Bearer ".length).trim();
}

function parseInteger(value: string | null, fallback: number) {
  if (value === null) {
    return fallback;
  }

  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) ? parsed : null;
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

  const url = new URL(request.url);
  const parsedLimit = parseInteger(url.searchParams.get("limit"), defaultLimit);
  const offset = parseInteger(url.searchParams.get("offset"), 0);

  if (parsedLimit === null || parsedLimit < 1 || offset === null) {
    return NextResponse.json(
      { error: "limit と offset には有効な整数を指定してください。" },
      { status: 400 },
    );
  }

  const limit = Math.min(parsedLimit, maxLimit);
  const { data, error, count } = await supabaseAdmin
    .from("ephemera_transfer_records")
    .select(
      "id, sender_profile_id, recipient_profile_id, ephemera_id_snapshot, ephemera_title_snapshot, file_type_snapshot, transferred_at, created_at",
      { count: "exact" },
    )
    .or(`sender_profile_id.eq.${user.id},recipient_profile_id.eq.${user.id}`)
    .order("transferred_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as TransferRecordRow[];
  const profileIds = [
    ...new Set(
      rows.flatMap((record) => [
        record.sender_profile_id,
        record.recipient_profile_id,
      ]),
    ),
  ];
  const profileMap = new Map<string, ProfileRow>();

  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name")
      .in("id", profileIds);

    if (profilesError) {
      return NextResponse.json(
        { error: profilesError.message },
        { status: 500 },
      );
    }

    for (const profile of (profiles ?? []) as ProfileRow[]) {
      profileMap.set(profile.id, profile);
    }
  }

  const transferRecords = rows.map((record) => {
    const sender = profileMap.get(record.sender_profile_id);
    const recipient = profileMap.get(record.recipient_profile_id);

    return {
      id: record.id,
      direction: record.sender_profile_id === user.id ? "sent" : "received",
      ephemeraId: record.ephemera_id_snapshot,
      ephemeraTitle: record.ephemera_title_snapshot,
      fileType: record.file_type_snapshot,
      transferredAt: record.transferred_at,
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
    };
  });

  return NextResponse.json({
    transferRecords,
    pagination: {
      limit,
      offset,
      total: count ?? transferRecords.length,
    },
  });
}
