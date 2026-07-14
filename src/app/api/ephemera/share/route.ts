import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ShareRequestBody = {
  ephemeraId?: string;
  latitude?: number;
  longitude?: number;
};

type SharePayload = {
  v: 1;
  ephemeraId: string;
  senderProfileId: string;
  title: string;
  fileType: "image" | "pdf";
  fileUrl: string;
  sharedAt: string;
  latitude: number;
  longitude: number;
};

function getShareSecret() {
  const secret = process.env.EPHEMERA_SHARE_SECRET;

  if (secret) {
    return secret;
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("Missing share signing secret.");
  }

  return serviceRoleKey;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getShareSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";

  if (!authorization.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice("Bearer ".length).trim();
}

function isValidCoordinate(latitude: unknown, longitude: unknown) {
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export async function POST(request: Request) {
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

  let body: ShareRequestBody;

  try {
    body = (await request.json()) as ShareRequestBody;
  } catch {
    return NextResponse.json(
      { error: "リクエスト形式が正しくありません。" },
      { status: 400 },
    );
  }

  if (!body.ephemeraId || !isValidCoordinate(body.latitude, body.longitude)) {
    return NextResponse.json(
      { error: "共有するエフェメラと現在地を確認してください。" },
      { status: 400 },
    );
  }

  const shareLatitude = body.latitude as number;
  const shareLongitude = body.longitude as number;

  const { data: ephemera, error: ephemeraError } = await supabaseAdmin
    .from("ephemeras")
    .select("id, title, file_type, file_url, owner_profile_id, expires_at")
    .eq("id", body.ephemeraId)
    .eq("owner_profile_id", user.id)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (ephemeraError) {
    return NextResponse.json({ error: ephemeraError.message }, { status: 500 });
  }

  if (!ephemera) {
    return NextResponse.json(
      { error: "共有できるエフェメラが見つかりません。" },
      { status: 404 },
    );
  }

  const sharedAt = new Date();
  const payload: SharePayload = {
    v: 1,
    ephemeraId: ephemera.id,
    senderProfileId: user.id,
    title: ephemera.title,
    fileType: ephemera.file_type,
    fileUrl: ephemera.file_url,
    sharedAt: sharedAt.toISOString(),
    latitude: shareLatitude,
    longitude: shareLongitude,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const shareToken = `${encodedPayload}.${signPayload(encodedPayload)}`;

  return NextResponse.json({
    share: {
      token: shareToken,
      expiresAt: new Date(sharedAt.getTime() + 10 * 60 * 1000).toISOString(),
      title: ephemera.title,
      fileUrl: ephemera.file_url,
    },
  });
}
