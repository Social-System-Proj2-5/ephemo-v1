"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

const pageSize = 20;

type ProfileSummary = {
  id: string;
  username: string | null;
  displayName: string | null;
};

type TransferRecord = {
  id: string;
  direction: "sent" | "received";
  ephemeraId: string | null;
  ephemeraTitle: string;
  fileType: "image" | "pdf";
  transferredAt: string;
  sender: ProfileSummary;
  recipient: ProfileSummary;
};

type TransferRecordsResponse = {
  transferRecords?: TransferRecord[];
  pagination?: {
    limit: number;
    offset: number;
    total: number;
  };
  error?: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getProfileLabel(profile: ProfileSummary) {
  if (profile.displayName) {
    return profile.displayName;
  }

  if (profile.username) {
    return `@${profile.username}`;
  }

  return "不明なユーザー";
}

export default function TransferHistoryPage() {
  const router = useRouter();
  const [records, setRecords] = useState<TransferRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchInitialRecords() {
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
        `/api/ephemera/transfers?limit=${pageSize}&offset=0`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        },
      );
      const result = (await response.json()) as TransferRecordsResponse;

      if (!isMounted) {
        return;
      }

      if (!response.ok) {
        setMessage(result.error ?? "共有履歴の取得に失敗しました。");
        return;
      }

      setRecords(result.transferRecords ?? []);
      setTotal(result.pagination?.total ?? 0);
    }

    fetchInitialRecords()
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setMessage(
          error instanceof Error
            ? error.message
            : "共有履歴の取得に失敗しました。",
        );
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

  async function loadMore() {
    setIsLoadingMore(true);
    setMessage("");

    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        `/api/ephemera/transfers?limit=${pageSize}&offset=${records.length}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        },
      );
      const result = (await response.json()) as TransferRecordsResponse;

      if (!response.ok) {
        setMessage(result.error ?? "共有履歴の追加取得に失敗しました。");
        return;
      }

      setRecords((current) => [
        ...current,
        ...(result.transferRecords ?? []),
      ]);
      setTotal(result.pagination?.total ?? total);
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "共有履歴の追加取得に失敗しました。",
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] px-5 py-6 text-stone-950 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-stone-300 pb-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">Transfers</p>
            <h1 className="text-2xl font-semibold tracking-normal">共有履歴</h1>
          </div>
          <Link
            href="/"
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-stone-100"
          >
            ホーム
          </Link>
        </header>

        {message ? (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {message}
          </p>
        ) : null}

        {isLoading ? (
          <section className="rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-stone-600">読み込み中</p>
          </section>
        ) : records.length === 0 ? (
          <section className="rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-stone-700">
              共有履歴はありません。
            </p>
          </section>
        ) : (
          <section className="space-y-3">
            {records.map((record) => {
              const isSent = record.direction === "sent";
              const counterparty = isSent ? record.recipient : record.sender;

              return (
                <article
                  key={record.id}
                  className="grid gap-4 rounded-lg border border-stone-300 bg-white p-5 shadow-sm sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
                >
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                      isSent
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-sky-50 text-sky-800"
                    }`}
                  >
                    {isSent ? "送信" : "受信"}
                  </span>
                  <div className="min-w-0">
                    <h2 className="break-words text-base font-semibold">
                      {record.ephemeraTitle}
                    </h2>
                    <p className="mt-1 text-sm text-stone-600">
                      {isSent ? "共有先" : "共有元"}: {getProfileLabel(counterparty)}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {record.fileType === "pdf" ? "PDF" : "画像"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                    <time className="text-sm text-stone-500">
                      {formatDateTime(record.transferredAt)}
                    </time>
                    <Link
                      href={`/ephemera/transfers/${record.id}`}
                      className="block shrink-0 text-sm font-semibold text-stone-900 underline decoration-stone-400 underline-offset-4 sm:mt-2"
                    >
                      詳細を見る
                    </Link>
                  </div>
                </article>
              );
            })}

            {records.length < total ? (
              <button
                className="w-full rounded-md border border-stone-300 bg-white px-4 py-3 text-sm font-medium transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-400"
                disabled={isLoadingMore}
                onClick={() => void loadMore()}
              >
                {isLoadingMore ? "読み込み中" : "さらに読み込む"}
              </button>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}
