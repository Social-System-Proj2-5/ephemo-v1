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

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function redirectAuthenticatedUser() {
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace("/");
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

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName, password }),
    });
    const result = (await response.json()) as AuthResponse;

    if (!response.ok || !result.session) {
      setMessage(result.error ?? "登録に失敗しました。");
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

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ef] px-5 py-10 text-stone-950">
      <section className="w-full max-w-md rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium text-emerald-700">Ephemo</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">
            新規登録
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
              placeholder="ephemo_user"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">表示名</span>
            <input
              className="mt-2 w-full rounded-md border border-stone-300 px-3 py-3 outline-none transition focus:border-emerald-700"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="name"
              placeholder="エフェモ 太郎"
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
              autoComplete="new-password"
              minLength={6}
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
            {isSubmitting ? "登録中" : "登録"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <Link className="font-medium text-emerald-700" href="/login">
            ログイン
          </Link>
        </div>
      </section>
    </main>
  );
}
