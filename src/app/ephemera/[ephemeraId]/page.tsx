"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type EphemeraDetail = {
  id: string;
  owner_profile_id: string;
  creator_profile_id: string;
  title: string;
  file_type: "image" | "pdf";
  file_url: string;
  created_at: string;
  expires_at: string;
  updated_at: string;
};

type EphemeraDetailResponse = {
  ephemera?: EphemeraDetail;
  remainingSeconds?: number;
  error?: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRemainingTime(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);

  if (days > 0) {
    return `${days}日 ${hours}時間`;
  }

  if (hours > 0) {
    return `${hours}時間 ${minutes}分`;
  }

  return `${Math.max(0, minutes)}分`;
}

export default function EphemeraDetailPage() {
  const params = useParams<{ ephemeraId: string }>();
  const router = useRouter();
  const ephemeraId = params.ephemeraId;
  const [ephemera, setEphemera] = useState<EphemeraDetail | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchEphemera() {
      setIsLoading(true);
      setMessage("");

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

      const response = await fetch(
        `/api/ephemera/${encodeURIComponent(ephemeraId)}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        },
      );
      const result = (await response.json()) as EphemeraDetailResponse;

      if (!isMounted) {
        return;
      }

      if (!response.ok || !result.ephemera) {
        setMessage(result.error ?? "エフェメラ詳細の取得に失敗しました。");
        setEphemera(null);
        return;
      }

      setEphemera(result.ephemera);
      setRemainingSeconds(result.remainingSeconds ?? 0);
    }

    fetchEphemera()
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setMessage(
          error instanceof Error
            ? error.message
            : "エフェメラ詳細の取得に失敗しました。",
        );
        setEphemera(null);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [ephemeraId, router]);

  return (
    <main className="min-h-screen bg-[#f7f4ef] px-5 py-6 text-stone-950 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-stone-300 pb-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">Collection</p>
            <h1 className="text-3xl font-semibold tracking-normal">
              エフェメラ詳細
            </h1>
          </div>
          <Link
            href="/"
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-stone-100"
          >
            ホーム
          </Link>
        </header>

        {isLoading ? (
          <section className="rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-stone-600">読み込み中</p>
          </section>
        ) : message ? (
          <section className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
            <p className="text-sm font-medium text-red-700">{message}</p>
            <Link
              href="/ephemera"
              className="mt-4 inline-block text-sm font-semibold text-stone-900 underline decoration-stone-400 underline-offset-4"
            >
              エフェメラ一覧へ戻る
            </Link>
          </section>
        ) : ephemera ? (
          <section className="grid overflow-hidden rounded-lg border border-stone-300 bg-white shadow-sm lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.7fr)]">
            <div className="flex min-h-80 items-center justify-center bg-[#e3d8c4] p-4 sm:p-8">
              {ephemera.file_type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ephemera.file_url}
                  alt={ephemera.title}
                  className="max-h-[70vh] w-full object-contain"
                />
              ) : (
                <iframe
                  src={ephemera.file_url}
                  title={`${ephemera.title}のPDF`}
                  className="h-[70vh] min-h-96 w-full bg-white"
                />
              )}
            </div>

            <div className="border-t border-stone-300 p-6 lg:border-l lg:border-t-0 lg:p-8">
              <p className="text-sm font-medium text-emerald-700">
                {ephemera.file_type === "pdf" ? "PDF" : "画像"}
              </p>
              <h2 className="mt-2 break-words text-2xl font-semibold">
                {ephemera.title}
              </h2>

              <dl className="mt-8 divide-y divide-stone-200 border-y border-stone-200 text-sm">
                <div className="py-4">
                  <dt className="text-stone-500">現在の所有者</dt>
                  <dd className="mt-1 font-medium">あなた</dd>
                </div>
                <div className="py-4">
                  <dt className="text-stone-500">作成日時</dt>
                  <dd className="mt-1 font-medium">
                    {formatDateTime(ephemera.created_at)}
                  </dd>
                </div>
                <div className="py-4">
                  <dt className="text-stone-500">有効期限</dt>
                  <dd className="mt-1 font-medium">
                    {formatDateTime(ephemera.expires_at)}
                  </dd>
                </div>
                <div className="py-4">
                  <dt className="text-stone-500">残り有効期間</dt>
                  <dd className="mt-1 text-lg font-semibold text-emerald-700">
                    {formatRemainingTime(remainingSeconds)}
                  </dd>
                </div>
              </dl>

              <a
                href={ephemera.file_url}
                rel="noreferrer"
                target="_blank"
                className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-stone-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-800"
              >
                完成ファイルを開く
              </a>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
