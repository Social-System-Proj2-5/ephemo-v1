"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function Home() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (!session) {
        router.replace("/login");
        return;
      }

      setIsCheckingSession(false);
    }

    checkSession().catch(() => {
      router.replace("/login");
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f4ef] text-stone-950">
        <p className="text-sm font-medium text-stone-600">読み込み中</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] text-stone-950">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-stone-300 pb-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">Ephemo</p>
            <h1 className="text-2xl font-semibold tracking-normal">エフェモ</h1>
          </div>
          <button
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
            onClick={async () => {
              const supabase = getSupabaseClient();
              await supabase.auth.signOut();
              router.replace("/login");
            }}
          >
            ログアウト
          </button>
        </header>

        <div className="flex flex-1 items-center py-8">
          <section className="mx-auto w-full max-w-3xl space-y-8">
            <div className="space-y-4">
              <p className="text-sm font-medium text-stone-600">
                写真・動画・音声から日々の記録を残す
              </p>
              <h2 className="text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">
                対面で交換できる小さな記憶を、エフェメラとして集める。
              </h2>
              <p className="text-base leading-7 text-stone-700">
                アップロードした素材やAIで作ったエフェメラを保存し、自分だけの日々の記録として残します。
              </p>
            </div>

            <div className="grid gap-3">
              <Link
                href="/ephemera"
                className="flex min-h-24 items-center justify-between rounded-lg bg-emerald-700 p-5 text-white shadow-sm transition hover:bg-emerald-800"
              >
                <span>
                  <span className="block text-sm font-medium text-emerald-100">
                    Collection
                  </span>
                  <span className="mt-1 block text-xl font-semibold">
                    エフェメラ一覧
                  </span>
                </span>
                <span className="text-2xl" aria-hidden="true">
                  ›
                </span>
              </Link>
              <Link
                href="/ephemera/create"
                className="flex min-h-24 items-center justify-between rounded-lg bg-stone-950 p-5 text-white shadow-sm transition hover:bg-stone-800"
              >
                <span>
                  <span className="block text-sm font-medium text-stone-300">
                    Create
                  </span>
                  <span className="mt-1 block text-xl font-semibold">
                    エフェメラ作成
                  </span>
                </span>
                <span className="text-2xl" aria-hidden="true">
                  ›
                </span>
              </Link>
              <Link
                href="/ephemera/ai-create"
                className="flex min-h-24 items-center justify-between rounded-lg border border-stone-300 bg-white p-5 text-stone-950 shadow-sm transition hover:bg-stone-100"
              >
                <span>
                  <span className="block text-sm font-medium text-stone-500">
                    AI Create
                  </span>
                  <span className="mt-1 block text-xl font-semibold">
                    AIによるエフェメラ作成
                  </span>
                </span>
                <span className="text-2xl" aria-hidden="true">
                  ›
                </span>
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
