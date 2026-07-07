import Link from "next/link";

const examples = [
  "雨の日の帰り道で見た光を、短い紙片の記録にする",
  "朝食の写真から旅先の記憶をまとめる",
  "駅前で録った音声を、交換できる小さな記録にする",
];

const styles = ["写真から作成", "動画から作成", "音声から作成", "テキストから作成"];

export default function AiEphemeraCreatePage() {
  return (
    <main className="min-h-screen bg-[#f7f4ef] px-5 py-6 text-stone-950 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between border-b border-stone-300 pb-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">AI Create</p>
            <h1 className="text-3xl font-semibold tracking-normal">
              AIによるエフェメラ作成
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-stone-100"
          >
            ホーム
          </Link>
        </header>

        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="source"
                  className="text-sm font-semibold text-stone-800"
                >
                  素材
                </label>
                <div className="mt-2 rounded-md border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-stone-700">
                    写真・動画・音声をアップロード
                  </p>
                  <input
                    id="source"
                    type="file"
                    accept="image/*,video/*,audio/*"
                    className="mt-4 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-stone-950 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="prompt"
                  className="text-sm font-semibold text-stone-800"
                >
                  作りたいエフェメラ
                </label>
                <textarea
                  id="prompt"
                  rows={7}
                  className="mt-2 w-full resize-none rounded-md border border-stone-300 bg-white px-3 py-3 text-sm leading-6 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-600"
                  placeholder="残したい記憶、場所、気分、交換相手に見せたい内容を書く"
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-stone-800">
                  作成タイプ
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {styles.map((style) => (
                    <button
                      key={style}
                      type="button"
                      className="rounded-md border border-stone-300 bg-white px-3 py-3 text-left text-sm font-medium transition hover:border-emerald-700 hover:bg-emerald-50"
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="w-full rounded-md bg-emerald-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-800"
              >
                AIでエフェメラを作成
              </button>
            </div>
          </section>

          <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">生成プレビュー</h2>
                <p className="mt-1 text-xs text-stone-500">
                  入力内容から作成されるエフェメラの確認
                </p>
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                Mock
              </span>
            </div>

            <div className="rounded-md border border-stone-200 bg-[#fbfaf7] p-5">
              <div className="aspect-[4/3] rounded-md bg-[#d9c8a9] p-5 shadow-inner">
                <div className="flex h-full flex-col justify-between rounded-md border border-stone-700/20 bg-white/70 p-5">
                  <div>
                    <p className="text-xs font-bold uppercase text-emerald-800">
                      AI Ephemera
                    </p>
                    <h3 className="mt-4 text-2xl font-semibold leading-tight">
                      雨上がりの駅前
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-stone-700">
                      音、光、短いメモをまとめた交換用の記録。
                    </p>
                  </div>
                  <p className="text-sm font-medium text-stone-500">
                    2026.07.07
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {examples.map((example) => (
                  <button
                    key={example}
                    type="button"
                    className="block w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-left text-xs leading-5 text-stone-600 transition hover:bg-stone-50"
                  >
                    {example}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="mt-5 w-full rounded-md bg-stone-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-800"
              >
                エフェメラとして保存
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
