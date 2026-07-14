"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type ClaimResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
};

type ProfileSummary = {
  username: string;
  displayName: string;
  points: number;
};

type ProfileResponse = {
  profile?: ProfileSummary;
  error?: string;
};

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

export default function Home() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [claimMessage, setClaimMessage] = useState("");
  const [isClaimingShare, setIsClaimingShare] = useState(false);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const shareToken = new URLSearchParams(window.location.search).get(
        "share",
      );
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (!session) {
        router.replace(
          shareToken
            ? `/login?share=${encodeURIComponent(shareToken)}`
            : "/login",
        );
        return;
      }

      if (shareToken) {
        setIsClaimingShare(true);
        setClaimMessage("共有リンクを確認しています。");

        try {
          const position = await getCurrentPosition();
          const response = await fetch("/api/ephemera/share/claim", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              token: shareToken,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });
          const result = (await response.json()) as ClaimResponse;

          if (!isMounted) {
            return;
          }

          if (!response.ok || !result.ok) {
            setClaimMessage(
              result.message ??
                result.error ??
                "この共有リンクは利用できません。",
            );
            window.history.replaceState(null, "", "/");
            setIsClaimingShare(false);
            setIsCheckingSession(false);
            return;
          }

          setClaimMessage(result.message ?? "エフェメラを受け取りました。");
          router.replace("/ephemera");
          return;
        } catch (error: unknown) {
          if (!isMounted) {
            return;
          }

          setClaimMessage(
            error instanceof Error
              ? error.message
              : "共有リンクを確認できませんでした。",
          );
          window.history.replaceState(null, "", "/");
          setIsClaimingShare(false);
        }
      }

      try {
        const response = await fetch("/api/profile/me", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const result = (await response.json()) as ProfileResponse;

        if (isMounted && response.ok && result.profile) {
          setProfile(result.profile);
        }
      } catch {
        if (isMounted) {
          setProfile(null);
        }
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

  if (isCheckingSession || isClaimingShare) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f4ef] text-stone-950">
        <p className="text-sm font-medium text-stone-600">
          {claimMessage || "読み込み中"}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ef] text-stone-950">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-300 pb-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">Ephemo</p>
            <h1 className="text-2xl font-semibold tracking-normal">エフェモ</h1>
          </div>
          {profile && (
            <div className="ml-auto text-right">
              <p className="text-sm font-semibold text-stone-900">
                {profile.displayName || `@${profile.username}`}
              </p>
              <p className="text-xs font-medium text-stone-600">
                @{profile.username} / {profile.points} points
              </p>
            </div>
          )}
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

        <div className="flex flex-1 justify-center pt-10 sm:pt-14">
          <section className="mx-auto w-full max-w-5xl space-y-6">
            {claimMessage ? (
              <p className="max-w-2xl rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {claimMessage}
              </p>
            ) : null}

            <div className="grid gap-3">
              <Link
                href="/ephemera"
                className="flex min-h-28 items-center justify-between rounded-lg bg-emerald-700 p-5 text-white shadow-sm transition hover:bg-emerald-800"
              >
                <span>
                  <span className="block text-sm font-medium text-emerald-100">
                    Collection
                  </span>
                  <span className="mt-1 block text-lg font-semibold">
                    エフェメラ一覧
                  </span>
                </span>
                <span className="text-2xl" aria-hidden="true">
                  ›
                </span>
              </Link>
              <Link
                href="/ephemera/transfers"
                className="flex min-h-28 items-center justify-between rounded-lg bg-sky-700 p-5 text-white shadow-sm transition hover:bg-sky-800"
              >
                <span>
                  <span className="block text-sm font-medium text-sky-100">
                    Transfers
                  </span>
                  <span className="mt-1 block text-lg font-semibold">
                    共有履歴
                  </span>
                </span>
                <span className="text-2xl" aria-hidden="true">
                  ›
                </span>
              </Link>
              <Link
                href="/ephemera/create"
                className="flex min-h-28 items-center justify-between rounded-lg bg-stone-950 p-5 text-white shadow-sm transition hover:bg-stone-800"
              >
                <span>
                  <span className="block text-sm font-medium text-stone-300">
                    Create
                  </span>
                  <span className="mt-1 block text-lg font-semibold">
                    エフェメラ作成
                  </span>
                </span>
                <span className="text-2xl" aria-hidden="true">
                  ›
                </span>
              </Link>
              <Link
                href="/ephemera/ai-create"
                className="flex min-h-28 items-center justify-between rounded-lg border border-stone-300 bg-white p-5 text-stone-950 shadow-sm transition hover:bg-stone-100"
              >
                <span>
                  <span className="block text-sm font-medium text-stone-500">
                    AI Create
                  </span>
                  <span className="mt-1 block text-lg font-semibold">
                    AIでエフェメラ作成
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
