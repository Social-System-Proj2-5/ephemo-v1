"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ModalDialog } from "@/app/_components/ModalDialog";
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

type EphemeraDetailDialogProps = {
  ephemeraId: string;
  onClose: () => void;
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

export function EphemeraDetailDialog({
  ephemeraId,
  onClose,
}: EphemeraDetailDialogProps) {
  const router = useRouter();
  const [ephemera, setEphemera] = useState<EphemeraDetail | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchEphemera() {
      setIsLoading(true);
      setMessage("");
      setEphemera(null);

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
        `/api/ephemera/${encodeURIComponent(ephemeraId)}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
          signal: controller.signal,
        },
      );
      const result = (await response.json()) as EphemeraDetailResponse;

      if (!response.ok || !result.ephemera) {
        setMessage(result.error ?? "エフェメラ詳細の取得に失敗しました。");
        return;
      }

      setEphemera(result.ephemera);
      setRemainingSeconds(result.remainingSeconds ?? 0);
    }

    fetchEphemera()
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
            : "エフェメラ詳細の取得に失敗しました。",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [ephemeraId, requestVersion, router]);

  return (
    <ModalDialog
      eyebrow="Collection"
      onClose={onClose}
      size="large"
      title="エフェメラ詳細"
    >
      {isLoading ? (
        <div className="flex min-h-80 items-center justify-center p-6">
          <p className="text-sm font-medium text-stone-600" aria-live="polite">
            読み込み中
          </p>
        </div>
      ) : message ? (
        <div className="flex min-h-80 flex-col items-center justify-center p-6 text-center">
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
      ) : ephemera ? (
        <div className="grid lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.75fr)]">
          <div className="flex min-h-72 items-center justify-center bg-[#e3d8c4] p-4 sm:p-6 lg:min-h-[34rem]">
            {ephemera.file_type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ephemera.file_url}
                alt={ephemera.title}
                className="max-h-[58dvh] w-full object-contain"
              />
            ) : (
              <iframe
                src={ephemera.file_url}
                title={`${ephemera.title}のPDF`}
                className="h-[52dvh] min-h-80 w-full bg-white"
              />
            )}
          </div>

          <div className="border-t border-stone-300 p-6 lg:border-l lg:border-t-0">
            <p className="text-sm font-medium text-emerald-700">
              {ephemera.file_type === "pdf" ? "PDF" : "画像"}
            </p>
            <h3 className="mt-2 break-words text-2xl font-semibold">
              {ephemera.title}
            </h3>

            <dl className="mt-6 divide-y divide-stone-200 border-y border-stone-200 text-sm">
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
        </div>
      ) : null}
    </ModalDialog>
  );
}
