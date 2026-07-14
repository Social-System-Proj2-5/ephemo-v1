"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

type AuthResponse = {
  error?: string;
  session?: {
    access_token: string;
    refresh_token: string;
  };
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function redirectAuthenticatedUser() {
      const shareToken = new URLSearchParams(window.location.search).get(
        "share",
      );
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace(
          shareToken ? `/?share=${encodeURIComponent(shareToken)}` : "/",
        );
      }
    }

    redirectAuthenticatedUser().catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : "設定エラーです。");
    });
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const result = (await response.json()) as AuthResponse;

    if (!response.ok || !result.session) {
      setMessage(result.error ?? "ログインに失敗しました。");
      setIsSubmitting(false);
      return;
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    });

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    const shareToken = new URLSearchParams(window.location.search).get("share");
    router.push(shareToken ? `/?share=${encodeURIComponent(shareToken)}` : "/");
    router.refresh();
  }

  return (
    <main className="min-h-dvh bg-[#f7f4ef] px-5 py-6 text-stone-950 sm:px-8 sm:py-10 lg:px-10">
      <section className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-6xl items-center justify-center sm:min-h-[calc(100dvh-5rem)]">
        <div className="w-full max-w-md rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium text-emerald-700">Ephemo</p>
          <h1 className="text-2xl font-semibold tracking-normal">
            ログイン
          </h1>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">
              ユーザー名
            </span>
            <input
              className="mt-2 w-full rounded-md border border-stone-300 px-3 py-3 outline-none transition focus:border-emerald-700"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">
              パスワード
            </span>
            <input
              className="mt-2 w-full rounded-md border border-stone-300 px-3 py-3 outline-none transition focus:border-emerald-700"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </label>

          {message ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {message}
            </p>
          ) : null}

          <button
            className="w-full rounded-md bg-emerald-700 px-4 py-3 font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            disabled={isSubmitting}
          >
            {isSubmitting ? "ログイン中" : "ログイン"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <Link className="font-medium text-emerald-700" href="/signup">
            新規登録
          </Link>
        </div>
        </div>
      </section>
    </main>
  );
}
