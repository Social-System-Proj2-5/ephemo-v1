import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type SaveGeneratedEphemeraBody = {
  title?: string;
  imageDataUrl?: string | null;
  imageUrl?: string | null;
  prompt?: string | null;
};

const EPHEMERA_BUCKET = "ephemeras";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";

  if (!authorization.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice("Bearer ".length).trim();
}

function dataUrlToBuffer(dataUrl: string) {
  const match = dataUrl.match(/^data:([-\w/+.;=]+);base64,(.+)$/);

  if (!match?.[1] || !match[2]) {
    throw new Error("画像データの形式が正しくありません。");
  }

  return {
    buffer: Buffer.from(match[2], "base64"),
    contentType: match[1],
  };
}

async function getImageFile(body: SaveGeneratedEphemeraBody) {
  if (body.imageDataUrl) {
    return dataUrlToBuffer(body.imageDataUrl);
  }

  if (!body.imageUrl) {
    throw new Error("保存する画像がありません。");
  }

  const response = await fetch(body.imageUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("生成画像を取得できませんでした。");
  }

  const arrayBuffer = await response.arrayBuffer();

  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: response.headers.get("content-type") ?? "image/png",
  };
}

async function ensureEphemeraBucket() {
  const { data: bucket } = await supabaseAdmin.storage.getBucket(
    EPHEMERA_BUCKET,
  );

  if (bucket) {
    return;
  }

  const { error } = await supabaseAdmin.storage.createBucket(EPHEMERA_BUCKET, {
    public: true,
    fileSizeLimit: "10MB",
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(error.message);
  }
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

  const body = (await request.json()) as SaveGeneratedEphemeraBody;
  const title = body.title?.trim() || "無題のエフェメラ";

  try {
    const imageFile = await getImageFile(body);
    await ensureEphemeraBucket();

    const extension = imageFile.contentType.includes("jpeg")
      ? "jpg"
      : imageFile.contentType.includes("webp")
        ? "webp"
        : "png";
    const storagePath = `${user.id}/${Date.now()}-${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(EPHEMERA_BUCKET)
      .upload(storagePath, imageFile.buffer, {
        contentType: imageFile.contentType,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(EPHEMERA_BUCKET)
      .getPublicUrl(storagePath);
    const fileUrl = publicUrlData.publicUrl;

    const { data, error } = await supabaseAdmin
      .from("ephemeras")
      .insert({
        owner_profile_id: user.id,
        creator_profile_id: user.id,
        title,
        file_type: "image",
        file_url: fileUrl,
      })
      .select("id, title, file_url, expires_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ephemera: data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "保存に失敗しました。",
      },
      { status: 500 },
    );
  }
}
