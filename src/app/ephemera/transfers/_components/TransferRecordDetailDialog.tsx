"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ModalDialog } from "@/app/_components/ModalDialog";
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

type TransferRecordDetailDialogProps = {
  onClose: () => void;
  recordId: string;
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

export function TransferRecordDetailDialog({
  onClose,
  recordId,
}: TransferRecordDetailDialogProps) {
  const router = useRouter();
  const [record, setRecord] = useState<TransferRecord | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchTransferRecord() {
      setIsLoading(true);
      setMessage("");
      setRecord(null);

      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (controller.signal.aborted) {
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
          signal: controller.signal,
        },
      );
      const result = (await response.json()) as TransferRecordResponse;

      if (!response.ok || !result.transferRecord) {
        setMessage(result.error ?? "共有履歴詳細の取得に失敗しました。");
        return;
      }

      setRecord(result.transferRecord);
    }

    fetchTransferRecord()
      .catch((error: unknown) => {
        if (
          controller.signal.aborted ||
          (error instanceof Error && error.name === "AbortError")
        ) {
          return;
        }

        setMessage(
          error instanceof Error
            ? error.message
            : "共有履歴詳細の取得に失敗しました。",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [recordId, requestVersion, router]);

  return (
    <ModalDialog
      eyebrow="Transfer"
      onClose={onClose}
      title="共有履歴詳細"
    >
      {isLoading ? (
        <div className="flex min-h-72 items-center justify-center p-6">
          <p className="text-sm font-medium text-stone-600" aria-live="polite">
            読み込み中
          </p>
        </div>
      ) : message ? (
        <div className="flex min-h-72 flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-medium text-red-700" role="alert">
            {message}
          </p>
          <button
            type="button"
            className="mt-5 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-stone-100"
            onClick={() => setRequestVersion((current) => current + 1)}
          >
            再試行
          </button>
        </div>
      ) : record ? (
        <div>
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
              <h3 className="mt-3 break-words text-2xl font-semibold">
                {record.ephemeraTitle}
              </h3>
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
        </div>
      ) : null}
    </ModalDialog>
  );
}
