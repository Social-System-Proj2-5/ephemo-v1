"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

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
  createdAt: string;
  sender: ProfileSummary;
  recipient: ProfileSummary;
};

type TransferRecordResponse = {
  transferRecord?: TransferRecord;
  error?: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "long",
    timeStyle: "medium",
  }).format(new Date(value));
}

function getProfileLabel(profile: ProfileSummary) {
  if (profile.displayName && profile.username) {
    return `${profile.displayName} (@${profile.username})`;
  }

  if (profile.displayName) {
    return profile.displayName;
  }

  if (profile.username) {
    return `@${profile.username}`;
  }

  return "不明なユーザー";
}

export default function TransferHistoryDetailPage() {
  const params = useParams<{ recordId: string }>();
  const router = useRouter();
  const recordId = params.recordId;
  const [record, setRecord] = useState<TransferRecord | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchTransferRecord() {
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
        `/api/ephemera/transfers/${encodeURIComponent(recordId)}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        },
      );
      const result = (await response.json()) as TransferRecordResponse;

      if (!isMounted) {
        return;
      }

      if (!response.ok || !result.transferRecord) {
        setMessage(result.error ?? "共有履歴詳細の取得に失敗しました。");
        setRecord(null);
        return;
      }

      setRecord(result.transferRecord);
    }

    fetchTransferRecord()
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setMessage(
          error instanceof Error
            ? error.message
            : "共有履歴詳細の取得に失敗しました。",
        );
        setRecord(null);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [recordId, router]);

  return (
    <main className="min-h-screen bg-[#f7f4ef] px-5 py-6 text-stone-950 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between gap-3 border-b border-stone-300 pb-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-700">Transfer</p>
            <h1 className="text-2xl font-semibold tracking-normal">
              共有履歴詳細
            </h1>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <Link
              href="/ephemera/transfers"
              className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-stone-100"
            >
              共有履歴へ戻る
            </Link>
            <Link
              href="/"
              className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-stone-100"
            >
              ホーム
            </Link>
          </div>
        </header>

        {isLoading ? (
          <section className="rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-stone-600">読み込み中</p>
          </section>
        ) : message ? (
          <section className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
            <p className="text-sm font-medium text-red-700">{message}</p>
            <Link
              href="/ephemera/transfers"
              className="mt-4 inline-block text-sm font-semibold text-stone-900 underline decoration-stone-400 underline-offset-4"
            >
              共有履歴へ戻る
            </Link>
          </section>
        ) : record ? (
          <section className="overflow-hidden rounded-lg border border-stone-300 bg-white shadow-sm">
            <div className="border-b border-stone-200 p-6 sm:flex sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    record.direction === "sent"
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-sky-50 text-sky-800"
                  }`}
                >
                  {record.direction === "sent" ? "送信" : "受信"}
                </span>
                <h2 className="mt-3 break-words text-2xl font-semibold">
                  {record.ephemeraTitle}
                </h2>
              </div>
              <p className="mt-4 shrink-0 text-sm font-medium text-stone-600 sm:mt-1">
                {record.fileType === "pdf" ? "PDF" : "画像"}
              </p>
            </div>

            <dl className="divide-y divide-stone-200 px-6 text-sm">
              <div className="grid gap-1 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                <dt className="text-stone-500">共有元</dt>
                <dd className="break-words font-medium">
                  {getProfileLabel(record.sender)}
                </dd>
              </div>
              <div className="grid gap-1 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                <dt className="text-stone-500">共有先</dt>
                <dd className="break-words font-medium">
                  {getProfileLabel(record.recipient)}
                </dd>
              </div>
              <div className="grid gap-1 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                <dt className="text-stone-500">共有日時</dt>
                <dd className="font-medium">
                  {formatDateTime(record.transferredAt)}
                </dd>
              </div>
              <div className="grid gap-1 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                <dt className="text-stone-500">エフェメラID</dt>
                <dd className="break-all font-mono text-xs font-medium text-stone-700">
                  {record.ephemeraId ?? "記録なし"}
                </dd>
              </div>
              <div className="grid gap-1 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
                <dt className="text-stone-500">共有履歴ID</dt>
                <dd className="break-all font-mono text-xs font-medium text-stone-700">
                  {record.id}
                </dd>
              </div>
            </dl>
          </section>
        ) : null}
      </div>
    </main>
  );
}
