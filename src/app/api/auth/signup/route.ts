import { NextResponse } from "next/server";
import {
  normalizeUsername,
  usernameToAuthEmail,
  validateUsername,
} from "@/lib/auth/username";
import { supabaseAdmin } from "@/lib/supabase/admin";

type SignupBody = {
  username?: string;
  displayName?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as SignupBody;
  const username = normalizeUsername(body.username ?? "");
  const displayName = body.displayName?.trim() ?? "";
  const password = body.password ?? "";

  if (!validateUsername(username)) {
    return NextResponse.json(
      { error: "ユーザー名は3-24文字の英数字と_のみ使えます。" },
      { status: 400 },
    );
  }

  if (!displayName) {
    return NextResponse.json(
      { error: "表示名を入力してください。" },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "パスワードは6文字以上で入力してください。" },
      { status: 400 },
    );
  }

  const authEmail = usernameToAuthEmail(username);
  const { data: existingProfile, error: existingProfileError } =
    await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

  if (existingProfileError) {
    return NextResponse.json(
      { error: existingProfileError.message },
      { status: 500 },
    );
  }

  if (existingProfile) {
    return NextResponse.json(
      { error: "このユーザー名はすでに使われています。" },
      { status: 409 },
    );
  }

  const { data: createdUser, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        display_name: displayName,
      },
    });

  if (createError || !createdUser.user) {
    return NextResponse.json(
      { error: createError?.message ?? "ユーザー作成に失敗しました。" },
      { status: 400 },
    );
  }

  const { error: profileError } = await supabaseAdmin.from("profiles").insert({
    id: createdUser.user.id,
    username,
    display_name: displayName,
    auth_email: authEmail,
  });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id);

    return NextResponse.json(
      { error: profileError.message },
      { status: 400 },
    );
  }

  const { data: sessionData, error: signInError } =
    await supabaseAdmin.auth.signInWithPassword({
      email: authEmail,
      password,
    });

  if (signInError || !sessionData.session) {
    await supabaseAdmin.from("profiles").delete().eq("id", createdUser.user.id);
    await supabaseAdmin.auth.admin.deleteUser(createdUser.user.id);

    return NextResponse.json(
      { error: signInError?.message ?? "ログインに失敗しました。" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    user: {
      id: createdUser.user.id,
      username,
      displayName,
    },
    session: sessionData.session,
  });
}
