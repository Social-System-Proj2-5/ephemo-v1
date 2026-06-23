import Link from "next/link";

const assets = ["写真", "動画", "音声", "AI作り", "スタンプ"];

export default function ScrapbookPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ef] px-5 py-6 text-stone-950 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between border-b border-stone-300 pb-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">Create</p>
            <h1 className="text-3xl font-semibold tracking-normal">
              スクラップブック作成
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-stone-100"
          >
            ホーム
          </Link>
        </header>

        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">素材</h2>
            <div className="mt-4 space-y-3">
              {assets.map((asset) => (
                <button
                  key={asset}
                  className="flex w-full items-center justify-between rounded-md border border-stone-200 px-4 py-3 text-left text-sm font-medium transition hover:bg-stone-100"
                >
                  {asset}
                  <span className="text-stone-400">+</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">台紙プレビュー</h2>
              <button className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800">
                保存
              </button>
            </div>
            <div className="relative min-h-[520px] overflow-hidden rounded-md border border-dashed border-stone-300 bg-[#fbfaf7]">
              <div className="absolute left-8 top-8 h-36 w-48 rotate-[-4deg] rounded-md border border-stone-300 bg-[#e3d8c4] p-4 shadow-sm">
                <p className="text-sm font-semibold">京都の朝ごはん</p>
                <p className="mt-2 text-xs leading-5 text-stone-600">
                  作成者・位置情報・日時・メモ
                </p>
              </div>
              <div className="absolute right-10 top-24 h-44 w-36 rotate-3 rounded-md bg-emerald-100 p-4 shadow-sm">
                <p className="text-sm font-semibold text-emerald-900">
                  キラ
                </p>
                <p className="mt-2 text-xs leading-5 text-emerald-800">
                  確率で特別な見た目
                </p>
              </div>
              <div className="absolute bottom-10 left-1/2 h-28 w-56 -translate-x-1/2 rounded-md border border-stone-300 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold">音声メモ</p>
                <div className="mt-4 h-2 rounded-full bg-stone-200">
                  <div className="h-2 w-1/2 rounded-full bg-stone-950" />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
