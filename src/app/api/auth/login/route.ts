import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { normalizeUsername, validateUsername } from "@/lib/auth/username";
import { supabaseAdmin } from "@/lib/supabase/admin";

type LoginBody = {
  username?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as LoginBody;
  const username = normalizeUsername(body.username ?? "");
  const password = body.password ?? "";

  if (!validateUsername(username) || !password) {
    return NextResponse.json(
      { error: "ユーザー名とパスワードを入力してください。" },
      { status: 400 },
    );
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, username, display_name, auth_email")
    .eq("username", username)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 },
    );
  }

  if (!profile) {
    return NextResponse.json(
      { error: "ユーザー名またはパスワードが違います。" },
      { status: 401 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json(
      { error: "Supabase public environment variables are missing." },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, publishableKey);
  const { data: sessionData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: profile.auth_email,
      password,
    });

  if (signInError || !sessionData.session) {
    return NextResponse.json(
      { error: "ユーザー名またはパスワードが違います。" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    user: {
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
    },
    session: sessionData.session,
  });
}
