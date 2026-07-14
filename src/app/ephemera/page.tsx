"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EphemeraDetailDialog } from "@/app/ephemera/_components/EphemeraDetailDialog";
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

type ShareResponse = {
  share?: {
    token: string;
    expiresAt: string;
    title: string;
    fileUrl: string;
  };
  error?: string;
};

type ShareDialogState = {
  item: EphemeraItem;
  url: string;
  expiresAt: string;
};

function getRemainingDays(value: string) {
  const expiresAt = new Date(value).getTime();
  const now = Date.now();
  const remaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

  return Math.max(0, remaining);
}

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("現在地を取得できないブラウザです。"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    });
  });
}

function getShareUrl(token: string) {
  const baseUrl =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? window.location.origin
      : "https://ephemo-v1.vercel.app";
  const url = new URL("/", baseUrl);
  url.searchParams.set("share", token);
  return url.toString();
}

function getQrImageUrl(value: string) {
  const params = new URLSearchParams({
    size: "260x260",
    margin: "10",
    data: value,
  });

  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
}

export default function EphemeraPage() {
  const router = useRouter();
  const [ephemeras, setEphemeras] = useState<EphemeraItem[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [shareDialog, setShareDialog] = useState<ShareDialogState | null>(null);
  const [selectedEphemeraId, setSelectedEphemeraId] = useState<string | null>(
    null,
  );
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState("");

  const qrImageUrl = useMemo(
    () => (shareDialog ? getQrImageUrl(shareDialog.url) : ""),
    [shareDialog],
  );

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

  async function handleShare(item: EphemeraItem) {
    setShareMessage("");
    setSharingId(item.id);

    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const position = await getCurrentPosition();
      const response = await fetch("/api/ephemera/share", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ephemeraId: item.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      });
      const result = (await response.json()) as ShareResponse;

      if (!response.ok || !result.share) {
        setShareMessage(result.error ?? "共有リンクを作成できませんでした。");
        return;
      }

      setShareDialog({
        item,
        url: getShareUrl(result.share.token),
        expiresAt: result.share.expiresAt,
      });
    } catch (error: unknown) {
      setShareMessage(
        error instanceof Error
          ? error.message
          : "共有リンクを作成できませんでした。",
      );
    } finally {
      setSharingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] px-5 py-6 text-stone-950 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-stone-300 pb-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">Ephemera</p>
            <h1 className="text-2xl font-semibold tracking-normal">
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

        {shareMessage ? (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {shareMessage}
          </p>
        ) : null}

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
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ephemeras.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-lg border border-stone-300 bg-white shadow-sm"
              >
                <div className="flex aspect-[4/3] items-center justify-center bg-[#e5dfd2]">
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
                <div className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 text-base font-semibold leading-6">
                      {item.title}
                    </h2>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                      あと{getRemainingDays(item.expires_at)}日
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="flex min-h-10 items-center justify-center rounded-md border border-stone-300 bg-white px-2 py-2 text-center text-sm font-medium transition hover:bg-stone-100"
                      onClick={() => setSelectedEphemeraId(item.id)}
                    >
                      詳細を見る
                    </button>
                    <button
                      className="min-h-10 rounded-md bg-stone-950 px-2 py-2 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                      disabled={sharingId === item.id}
                      onClick={() => void handleShare(item)}
                    >
                      {sharingId === item.id ? "生成中" : "共有QRを生成"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>

      {selectedEphemeraId ? (
        <EphemeraDetailDialog
          ephemeraId={selectedEphemeraId}
          onClose={() => setSelectedEphemeraId(null)}
        />
      ) : null}

      {shareDialog ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-5 py-8">
          <section className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-emerald-700">
                  Share QR
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  {shareDialog.item.title}
                </h2>
              </div>
              <button
                className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium transition hover:bg-stone-100"
                onClick={() => setShareDialog(null)}
              >
                閉じる
              </button>
            </div>

            <div className="flex justify-center rounded-lg bg-stone-50 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrImageUrl}
                alt="共有リンクのQRコード"
                className="h-64 w-64"
              />
            </div>

            <p className="mt-4 text-sm leading-6 text-stone-700">
              10分以内に近くでスキャンすると受け取れます。
            </p>
            <p className="mt-2 break-all rounded-md bg-stone-50 p-3 text-xs text-stone-600">
              {shareDialog.url}
            </p>
          </section>
        </div>
      ) : null}
    </main>
  );
}
