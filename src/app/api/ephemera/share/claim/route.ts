import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ClaimRequestBody = {
  token?: string;
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

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getShareSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function isValidSignature(encodedPayload: string, signature: string) {
  const expectedSignature = signPayload(encodedPayload);
  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(signature);

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

function isSharePayload(value: unknown): value is SharePayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    payload.v === 1 &&
    typeof payload.ephemeraId === "string" &&
    typeof payload.senderProfileId === "string" &&
    typeof payload.title === "string" &&
    (payload.fileType === "image" || payload.fileType === "pdf") &&
    typeof payload.fileUrl === "string" &&
    typeof payload.sharedAt === "string" &&
    typeof payload.latitude === "number" &&
    Number.isFinite(payload.latitude) &&
    typeof payload.longitude === "number" &&
    Number.isFinite(payload.longitude)
  );
}

function decodeShareToken(token: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || !isValidSignature(encodedPayload, signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as unknown;

    return isSharePayload(payload) ? payload : null;
  } catch {
    return null;
  }
}

function getDistanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return NextResponse.json(
      { error: "ログイン情報を確認できませんでした。" },
      { status: 401 },
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json(
      { error: "ログイン情報が無効です。もう一度ログインしてください。" },
      { status: 401 },
    );
  }

  let body: ClaimRequestBody;

  try {
    body = (await request.json()) as ClaimRequestBody;
  } catch {
    return NextResponse.json(
      { error: "リクエスト形式が正しくありません。" },
      { status: 400 },
    );
  }

  if (!body.token || !isValidCoordinate(body.latitude, body.longitude)) {
    return NextResponse.json(
      { error: "共有リンクと現在地を確認してください。" },
      { status: 400 },
    );
  }

  const claimLatitude = body.latitude as number;
  const claimLongitude = body.longitude as number;
  const payload = decodeShareToken(body.token);

  if (!payload) {
    return NextResponse.json(
      {
        ok: false,
        message: "共有リンクが見つからないか、すでに無効です。",
      },
      { status: 409 },
    );
  }

  if (payload.senderProfileId === user.id) {
    return NextResponse.json(
      { ok: false, message: "自分のエフェメラは受け取れません。" },
      { status: 409 },
    );
  }

  const sharedAt = new Date(payload.sharedAt).getTime();
  const expiresAt = sharedAt + 10 * 60 * 1000;

  if (!Number.isFinite(sharedAt) || expiresAt <= Date.now()) {
    return NextResponse.json(
      {
        ok: false,
        message: "共有から10分以上経過したため、このリンクは無効です。",
      },
      { status: 409 },
    );
  }

  const distanceMeters = getDistanceMeters(
    payload.latitude,
    payload.longitude,
    claimLatitude,
    claimLongitude,
  );

  if (distanceMeters > 100) {
    return NextResponse.json(
      {
        ok: false,
        message: "共有された場所から離れているため、受け取れません。",
      },
      { status: 409 },
    );
  }

  const { data: ephemera, error: updateError } = await supabaseAdmin
    .from("ephemeras")
    .update({ owner_profile_id: user.id, updated_at: new Date().toISOString() })
    .eq("id", payload.ephemeraId)
    .eq("owner_profile_id", payload.senderProfileId)
    .gt("expires_at", new Date().toISOString())
    .select("id, title, file_type, file_url")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (!ephemera) {
    return NextResponse.json(
      {
        ok: false,
        message: "このエフェメラはすでに移転済み、または削除されています。",
      },
      { status: 409 },
    );
  }

  const { error: recordError } = await supabaseAdmin
    .from("ephemera_transfer_records")
    .insert({
      sender_profile_id: payload.senderProfileId,
      recipient_profile_id: user.id,
      ephemera_id_snapshot: ephemera.id,
      ephemera_title_snapshot: ephemera.title,
      file_type_snapshot: ephemera.file_type,
    });

  if (recordError) {
    return NextResponse.json({ error: recordError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "エフェメラを受け取りました。",
    ephemera: {
      id: ephemera.id,
      title: ephemera.title,
      fileType: ephemera.file_type,
      fileUrl: ephemera.file_url,
    },
  });
}
