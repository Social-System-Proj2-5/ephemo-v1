"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type EphemeraItem = {
  id: string;
  title: string;
  file_type: "image" | "pdf";
  file_url: string;
  created_at: string;
  expires_at: string;
};

type EphemeraListResponse = {
  ephemeras?: EphemeraItem[];
  error?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function getRemainingDays(value: string) {
  const expiresAt = new Date(value).getTime();
  const now = Date.now();
  const remaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

  return Math.max(0, remaining);
}

export default function EphemeraPage() {
  const router = useRouter();
  const [ephemeras, setEphemeras] = useState<EphemeraItem[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchEphemeras() {
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

      const response = await fetch("/api/ephemera", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });
      const result = (await response.json()) as EphemeraListResponse;

      if (!isMounted) {
        return;
      }

      if (!response.ok) {
        setMessage(result.error ?? "エフェメラ一覧の取得に失敗しました。");
        setEphemeras([]);
        return;
      }

      setEphemeras(result.ephemeras ?? []);
    }

    fetchEphemeras()
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setMessage(
          error instanceof Error
            ? error.message
            : "エフェメラ一覧の取得に失敗しました。",
        );
        setEphemeras([]);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

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

        {isLoading ? (
          <section className="rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-stone-600">読み込み中</p>
          </section>
        ) : message ? (
          <section className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
            <p className="text-sm font-medium text-red-700">{message}</p>
          </section>
        ) : ephemeras.length === 0 ? (
          <section className="rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-stone-700">
              保存済みのエフェメラはありません。
            </p>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            {ephemeras.map((item, index) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-lg border border-stone-300 bg-white shadow-sm"
              >
                <div className="flex h-56 items-center justify-center bg-[#e3d8c4]">
                  {item.file_type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.file_url}
                      alt={item.title}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <a
                      className="rounded-md bg-stone-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800"
                      href={item.file_url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      PDFを開く
                    </a>
                  )}
                </div>
                <div className="p-5">
                  <p className="text-sm text-stone-500">
                    EP-{String(index + 1).padStart(2, "0")} /{" "}
                    {item.file_type === "pdf" ? "PDF" : "画像"} /{" "}
                    {formatDate(item.created_at)}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">{item.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-stone-700">
                    有効期限 {formatDate(item.expires_at)} / 残り
                    {getRemainingDays(item.expires_at)}日
                  </p>
                  <Link
                    href={`/ephemera/${item.id}`}
                    className="mt-4 inline-block text-sm font-semibold text-stone-900 underline decoration-stone-400 underline-offset-4"
                  >
                    詳細を見る
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
