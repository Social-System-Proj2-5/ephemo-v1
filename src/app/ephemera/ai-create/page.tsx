"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type GenerateResponse = {
  imageUrl: string | null;
  imageDataUrl: string | null;
  revisedPrompt: string | null;
  prompt: string;
  error?: string;
};

type GenerateEphemeraInput = {
  text: string;
  illustration: string;
  atmosphere: string;
  style: string;
  sourceImage: File | null;
};

type ImprovementSuggestion = {
  label: string;
  atmosphere: string;
  illustration?: string;
  style?: string;
};

type StyleMode = "recommended" | "custom";

type RecommendedStyle = {
  label: string;
  prompt: string;
};

const recommendedStyles: RecommendedStyle[] = [
  {
    label: "古い切符風",
    prompt: "Victorian antique ticket",
  },
  {
    label: "植物標本ラベル風",
    prompt: "Botanical specimen label",
  },
  {
    label: "昔の領収書風",
    prompt: "Antique receipt",
  },
  {
    label: "郵便コラージュ風",
    prompt: "Vintage postal collage",
  },
];

const improvementSuggestions: ImprovementSuggestion[] = [
  {
    label: "もっと古い紙と染みを強くしますか？",
    atmosphere: "紙の黄ばみ、折れ跡、破れた縁、コーヒー染み、退色したインクをより強くする",
  },
  {
    label: "もっと装飾的な切符のようにしますか？",
    atmosphere: "細い飾り罫、番号印字、穴あき加工、古い活版印刷の余白を増やす",
    style: "Ornate antique ticket",
  },
  {
    label: "もっと植物図鑑のようにしますか？",
    atmosphere: "植物図鑑、ラベル、標本紙、淡い緑、静かな学術的な雰囲気を強める",
    illustration: "小さな植物標本、押し花、細密な葉の線画",
    style: "Botanical specimen label",
  },
  {
    label: "もっとコラージュ感を出しますか？",
    atmosphere: "紙片の重なり、スタンプ、古い封筒、マスキングテープ、手作りのコラージュ感を強める",
    style: "Vintage postal collage",
  },
];

export default function AiEphemeraCreatePage() {
  const [ephemeraText, setEphemeraText] = useState("");
  const [illustration, setIllustration] = useState("");
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [styleMode, setStyleMode] = useState<StyleMode>("recommended");
  const [recommendedStyle, setRecommendedStyle] = useState(recommendedStyles[0]);
  const [customStyle, setCustomStyle] = useState("");
  const [ephemeraName, setEphemeraName] = useState("");
  const [generated, setGenerated] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const previewSrc = generated?.imageDataUrl ?? generated?.imageUrl ?? "";
  const style =
    styleMode === "custom" ? customStyle.trim() : recommendedStyle.prompt;
  const hasGenerationInput =
    [ephemeraText, illustration].some(
      (value) => value.trim().length > 0,
    ) || Boolean(sourceImage);
  const canGenerate = hasGenerationInput && !isGenerating;
  const downloadName = useMemo(() => {
    const date = new Date().toISOString().slice(0, 10);
    const baseName = ephemeraName
      .trim()
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "-");

    return `${baseName || `ephemera-${date}`}.png`;
  }, [ephemeraName]);
  const sourceImagePreview = useMemo(
    () => (sourceImage ? URL.createObjectURL(sourceImage) : ""),
    [sourceImage],
  );

  useEffect(() => {
    if (!sourceImagePreview) {
      return;
    }

    return () => {
      URL.revokeObjectURL(sourceImagePreview);
    };
  }, [sourceImagePreview]);

  function mergePromptPart(current: string, addition: string) {
    return current.trim() ? `${current.trim()}。${addition}` : addition;
  }

  async function generateEphemera(input?: GenerateEphemeraInput) {
    const nextInput = input ?? {
      text: ephemeraText,
      illustration,
      atmosphere: "",
      style,
      sourceImage,
    };
    const hasPrompt = [
      nextInput.text,
      nextInput.illustration,
    ].some((value) => value.trim().length > 0) || nextInput.sourceImage;

    if (!hasPrompt || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setError("");
    setGenerated(null);

    try {
      const response = nextInput.sourceImage
        ? await fetch("/api/ephemera/generate", {
            method: "POST",
            body: createGenerateFormData(nextInput),
          })
        : await fetch("/api/ephemera/generate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: nextInput.text,
              illustration: nextInput.illustration,
              atmosphere: nextInput.atmosphere,
              style: nextInput.style,
            }),
          });
      const result = (await response.json()) as GenerateResponse;

      if (!response.ok) {
        setError(result.error ?? "生成に失敗しました。");
        return;
      }

      setGenerated(result);
    } catch {
      setError("通信に失敗しました。開発サーバーと環境変数を確認してください。");
    } finally {
      setIsGenerating(false);
    }
  }

  function applyImprovement(suggestion: ImprovementSuggestion) {
    const nextIllustration = suggestion.illustration
      ? mergePromptPart(illustration, suggestion.illustration)
      : illustration;
    const nextAtmosphere = suggestion.atmosphere;
    const nextStyle = suggestion.style ?? style;

    setIllustration(nextIllustration);

    if (suggestion.style) {
      setStyleMode("custom");
      setCustomStyle(suggestion.style);
    }

    generateEphemera({
      text: ephemeraText,
      illustration: nextIllustration,
      atmosphere: nextAtmosphere,
      style: nextStyle,
      sourceImage,
    });
  }

  function createGenerateFormData(input: GenerateEphemeraInput) {
    const formData = new FormData();

    formData.append("text", input.text);
    formData.append("illustration", input.illustration);
    formData.append("atmosphere", input.atmosphere);
    formData.append("style", input.style);

    if (input.sourceImage) {
      formData.append("sourceImage", input.sourceImage);
    }

    return formData;
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] px-5 py-6 text-stone-950 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 border-b border-stone-300 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">AI Create</p>
            <h1 className="text-3xl font-semibold tracking-normal">
              テキストからエフェメラを生成
            </h1>
          </div>
          <Link
            href="/"
            className="w-fit rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-stone-100"
          >
            ホーム
          </Link>
        </header>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="source-image"
                  className="text-sm font-semibold text-stone-800"
                >
                  写真から作る
                </label>
                <div className="mt-2 rounded-md border border-dashed border-stone-300 bg-stone-50 p-3">
                  <input
                    id="source-image"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      setSourceImage(event.target.files?.[0] ?? null);
                      setGenerated(null);
                    }}
                    className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-stone-950 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                  />
                  {sourceImagePreview && (
                    <div className="mt-3 overflow-hidden rounded-md border border-stone-200 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sourceImagePreview}
                        alt="アップロードした写真"
                        className="max-h-56 w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="ephemera-text"
                  className="text-sm font-semibold text-stone-800"
                >
                  1. エフェメラに入れたい文字
                </label>
                <input
                  id="ephemera-text"
                  type="text"
                  value={ephemeraText}
                  onChange={(event) => {
                    setEphemeraText(event.target.value);
                  }}
                  className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-600"
                  placeholder="例: NIGHT TRAIN 1890"
                />
              </div>

              <div>
                <label
                  htmlFor="illustration"
                  className="text-sm font-semibold text-stone-800"
                >
                  2. エフェメラに入れたいイラスト
                </label>
                <textarea
                  id="illustration"
                  rows={4}
                  value={illustration}
                  onChange={(event) => {
                    setIllustration(event.target.value);
                  }}
                  className="mt-2 w-full resize-none rounded-md border border-stone-300 bg-white px-3 py-3 text-sm leading-6 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-600"
                  placeholder="例: 星空を走る古い蒸気機関車"
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-stone-800">
                  スタイル
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStyleMode("recommended");
                    }}
                    className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                      styleMode === "recommended"
                        ? "border-stone-950 bg-stone-950 text-white"
                        : "border-stone-300 bg-white hover:bg-stone-100"
                    }`}
                  >
                    おすすめから選ぶ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStyleMode("custom");
                    }}
                    className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                      styleMode === "custom"
                        ? "border-stone-950 bg-stone-950 text-white"
                        : "border-stone-300 bg-white hover:bg-stone-100"
                    }`}
                  >
                    自分で入力する
                  </button>
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {recommendedStyles.map((item) => (
                    <button
                      key={item.prompt}
                      type="button"
                      disabled={styleMode !== "recommended"}
                      onClick={() => {
                        setRecommendedStyle(item);
                      }}
                      className={`rounded-md border px-3 py-3 text-left text-sm font-medium transition ${
                        recommendedStyle.prompt === item.prompt &&
                        styleMode === "recommended"
                          ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                          : "border-stone-300 bg-white hover:border-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-45"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <label
                  htmlFor="custom-style"
                  className="mt-3 block text-sm font-semibold text-stone-800"
                >
                  自分でスタイルを入力
                </label>
                <input
                  id="custom-style"
                  type="text"
                  disabled={styleMode !== "custom"}
                  value={customStyle}
                  onChange={(event) => {
                    setCustomStyle(event.target.value);
                  }}
                  className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-600 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500"
                  placeholder="例: 和風レトロなマッチ箱ラベル風"
                />
              </div>

              {generated && (
              <div>
                <p className="text-sm font-semibold text-stone-800">改善案</p>
                <div className="mt-2 space-y-2">
                  {improvementSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.label}
                      type="button"
                      disabled={isGenerating}
                      onClick={() => {
                        applyImprovement(suggestion);
                      }}
                      className="block w-full rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-left text-xs font-medium leading-5 text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>
              )}

              {error && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  generateEphemera();
                }}
                disabled={!canGenerate}
                className="w-full rounded-md bg-emerald-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? "生成中..." : "AIでエフェメラを生成"}
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">生成プレビュー</h2>
            </div>

            <div className="rounded-md border border-stone-200 bg-[#fbfaf7] p-4">
              <div className="flex min-h-[520px] w-full items-center justify-center rounded-md border border-dashed border-stone-300 bg-[#efe7d8] p-3">
                {isGenerating ? (
                  <div className="px-6 text-center">
                    <p className="text-sm font-semibold text-stone-800">
                      生成しています
                    </p>
                    <p className="mt-2 text-xs leading-5 text-stone-600">
                      画像生成には少し時間がかかります。
                    </p>
                  </div>
                ) : previewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewSrc}
                    alt="生成されたエフェメラ"
                    className="block h-auto w-full rounded-md object-contain"
                  />
                ) : (
                  <div className="mx-auto max-w-sm px-6 text-center">
                    <p className="text-sm font-semibold text-stone-800">
                      まだ生成されていません
                    </p>
                    <p className="mt-2 text-xs leading-5 text-stone-600">
                      左のフォームに説明を入力して、エフェメラ画像を生成してください。
                    </p>
                  </div>
                )}
              </div>

              {generated && (
                <div className="mt-4 space-y-3">
                  {generated.revisedPrompt && (
                    <p className="rounded-md bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-600">
                      {generated.revisedPrompt}
                    </p>
                  )}
                  <div>
                    <label
                      htmlFor="ephemera-name"
                      className="text-sm font-semibold text-stone-800"
                    >
                      保存名
                    </label>
                    <input
                      id="ephemera-name"
                      type="text"
                      value={ephemeraName}
                      onChange={(event) => {
                        setEphemeraName(event.target.value);
                      }}
                      className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-600"
                      placeholder="例: 星空列車の切符"
                    />
                  </div>
                  <a
                    href={previewSrc}
                    download={downloadName}
                    className="block w-full rounded-md bg-stone-950 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-stone-800"
                  >
                    画像をダウンロード
                  </a>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
