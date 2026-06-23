import Link from "next/link";

const recentItems = [
  { title: "京都の朝ごはん", type: "写真", date: "2026.06.21" },
  { title: "駅前で聞いた音", type: "音声", date: "2026.06.18" },
  { title: "雨の日の短い動画", type: "動画", date: "2026.06.12" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f4ef] text-stone-950">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-stone-300 pb-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">Ephemo</p>
            <h1 className="text-2xl font-semibold tracking-normal">エフェモ</h1>
          </div>
          <div className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700">
            320 pt
          </div>
        </header>

        <div className="grid flex-1 gap-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section className="space-y-7">
            <div className="space-y-4">
              <p className="text-sm font-medium text-stone-600">
                写真・動画・音声から日々の記録を残す
              </p>
              <h2 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">
                対面で交換できる小さな記憶を、エフェメラとして集める。
              </h2>
              <p className="max-w-2xl text-base leading-7 text-stone-700">
                アップロードした素材やAIで作ったエフェメラを保存し、スクラップブックに配置して、自分だけのエフェログを作成します。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/ephemera"
                className="flex min-h-28 flex-col justify-between rounded-lg bg-emerald-700 p-5 text-white shadow-sm transition hover:bg-emerald-800"
              >
                <span className="text-sm font-medium text-emerald-100">
                  Collection
                </span>
                <span className="text-xl font-semibold">エフェメラ一覧</span>
              </Link>
              <Link
                href="/scrapbook"
                className="flex min-h-28 flex-col justify-between rounded-lg bg-stone-950 p-5 text-white shadow-sm transition hover:bg-stone-800"
              >
                <span className="text-sm font-medium text-stone-300">
                  Create
                </span>
                <span className="text-xl font-semibold">
                  スクラップブック作成
                </span>
              </Link>
            </div>
          </section>

          <aside className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold">最近のエフェメラ</h3>
              <span className="text-sm text-stone-500">Mock</span>
            </div>
            <div className="space-y-3">
              {recentItems.map((item) => (
                <div
                  key={item.title}
                  className="grid grid-cols-[56px_1fr] gap-3 rounded-md border border-stone-200 p-3"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-md bg-[#e3d8c4] text-sm font-semibold text-stone-800">
                    {item.type}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="mt-1 text-sm text-stone-500">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
