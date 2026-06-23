import Link from "next/link";

const ephemera = [
  {
    title: "京都の朝ごはん",
    meta: "写真 / 2026.06.21 / Kyoto",
    note: "食べたものから生成したテンプレートエフェメラ",
  },
  {
    title: "駅前で聞いた音",
    meta: "音声 / 2026.06.18 / Shibuya",
    note: "位置情報と短いメモを保存",
  },
  {
    title: "雨の日の短い動画",
    meta: "動画 / 2026.06.12 / Tokyo",
    note: "交換可能なAI作成エフェメラ",
  },
  {
    title: "Bさんからの記録",
    meta: "交換 / キラ / 2026.06.08",
    note: "対面交換で取得したテンプレート",
  },
];

export default function EphemeraPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ef] px-5 py-6 text-stone-950 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between border-b border-stone-300 pb-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">Collection</p>
            <h1 className="text-3xl font-semibold tracking-normal">
              エフェメラ一覧
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-stone-100"
          >
            ホーム
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {ephemera.map((item, index) => (
            <article
              key={item.title}
              className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm"
            >
              <div className="mb-5 flex h-36 items-center justify-center rounded-md bg-[#e3d8c4] text-lg font-semibold text-stone-800">
                EP-{String(index + 1).padStart(2, "0")}
              </div>
              <p className="text-sm text-stone-500">{item.meta}</p>
              <h2 className="mt-2 text-xl font-semibold">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-stone-700">
                {item.note}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
