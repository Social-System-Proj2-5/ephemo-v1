import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type GenerateEphemeraBody = {
  text?: string;
  illustration?: string;
  atmosphere?: string;
  style?: string;
};

type GenerateEphemeraInput = GenerateEphemeraBody & {
  sourceImage?: File | null;
};

type OpenAIImage = {
  b64_json?: string;
  revised_prompt?: string;
  url?: string;
};

type OpenAIImagesResponse = {
  data?: OpenAIImage[];
  error?: {
    message?: string;
  };
};

const EPHEMERA_PROMPT_PREFIX =
  "Create one complete ephemera-style printed object, such as a ticket, label, card, tag, receipt-like paper object, sticker, or small keepsake, highly detailed. Show the entire ephemera object fully inside the image without cropping. Do not default to antique, vintage, sepia, brown, yellowed, stained, or aged paper unless the user specifically requests it; choose the palette from the user's text, illustration, photo, and style direction.";
const AI_GENERATION_POINT_COST = 2;

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";

  if (!authorization.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice("Bearer ".length).trim();
}

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : undefined;
}

async function readInput(request: Request): Promise<GenerateEphemeraInput> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const sourceImage = formData.get("sourceImage");

    return {
      text: getStringValue(formData.get("text")),
      illustration: getStringValue(formData.get("illustration")),
      atmosphere: getStringValue(formData.get("atmosphere")),
      style: getStringValue(formData.get("style")),
      sourceImage: sourceImage instanceof File ? sourceImage : null,
    };
  }

  return (await request.json()) as GenerateEphemeraBody;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY が設定されていません。" },
      { status: 500 },
    );
  }

  const token = getBearerToken(request);

  if (!token) {
    return NextResponse.json(
      { error: "AI生成にはログインが必要です。" },
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

  const body = await readInput(request);
  const ephemeraText = body.text?.trim();
  const illustration = body.illustration?.trim();
  const atmosphere = body.atmosphere?.trim();
  const sourceImage = body.sourceImage;

  if (!ephemeraText && !illustration && !atmosphere && !sourceImage) {
    return NextResponse.json(
      { error: "文字・イラスト・写真のいずれかを入力してください。" },
      { status: 400 },
    );
  }

  const { data: remainingPoints, error: spendError } = await supabaseAdmin.rpc(
    "spend_profile_points",
    {
      target_profile_id: user.id,
      point_amount: AI_GENERATION_POINT_COST,
    },
  );

  if (spendError) {
    return NextResponse.json({ error: spendError.message }, { status: 500 });
  }

  if (remainingPoints === null) {
    return NextResponse.json(
      { error: "ポイントが不足しています。AI生成には2ポイント必要です。" },
      { status: 402 },
    );
  }

  const style = body.style?.trim();
  const model = "gpt-image-2";
  const fullPrompt = [
    EPHEMERA_PROMPT_PREFIX,
    style ? `Recommended visual style: ${style}.` : "",
    sourceImage
      ? "Use the uploaded photo as the primary source material. Transform it into ephemera while preserving the subject, mood, and recognizable visual features from the photo."
      : "",
    ephemeraText
      ? `The only readable text allowed anywhere in the image is exactly this text, copied exactly: "${ephemeraText}". Do not add any other readable words, letters, labels, captions, dates, numbers, signatures, stamps with text, or decorative typography.`
      : "Do not include any readable text, letters, labels, captions, dates, numbers, signatures, or typography anywhere in the image.",
    illustration
      ? `Illustration to generate and incorporate into the ephemera: ${illustration}.`
      : "",
    atmosphere
      ? `Overall atmosphere, palette, texture, and composition direction only. Do not write these atmosphere words as visible text: ${atmosphere}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const response = sourceImage
    ? await createImageEdit(apiKey, model, fullPrompt, sourceImage)
    : await createImageGeneration(apiKey, model, fullPrompt);

  const result = (await response.json()) as OpenAIImagesResponse;

  if (!response.ok) {
    await refundGenerationPoints(user.id);

    return NextResponse.json(
      {
        error:
          result.error?.message ??
          "エフェメラの生成中に OpenAI API エラーが発生しました。",
      },
      { status: response.status },
    );
  }

  const image = result.data?.[0];

  if (!image?.b64_json && !image?.url) {
    await refundGenerationPoints(user.id);

    return NextResponse.json(
      { error: "生成画像をレスポンスから取得できませんでした。" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    imageUrl: image.url ?? null,
    imageDataUrl: image.b64_json ? `data:image/png;base64,${image.b64_json}` : null,
    revisedPrompt: image.revised_prompt ?? null,
    prompt: fullPrompt,
    remainingPoints,
  });
}

async function refundGenerationPoints(profileId: string) {
  await supabaseAdmin.rpc("add_profile_points", {
    target_profile_id: profileId,
    point_amount: AI_GENERATION_POINT_COST,
  });
}

function createImageGeneration(apiKey: string, model: string, prompt: string) {
  return fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: "auto",
      quality: "medium",
    }),
    cache: "no-store",
  });
}

function createImageEdit(
  apiKey: string,
  model: string,
  prompt: string,
  sourceImage: File,
) {
  const formData = new FormData();

  formData.append("model", model);
  formData.append("prompt", prompt);
  formData.append("image", sourceImage, sourceImage.name || "source-image.png");
  formData.append("n", "1");
  formData.append("size", "auto");
  formData.append("quality", "medium");

  return fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
    cache: "no-store",
  });
}
