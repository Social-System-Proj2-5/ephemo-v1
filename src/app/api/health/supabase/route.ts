import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { ok: false, error: "Missing Supabase environment variables." },
      { status: 500 },
    );
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { ok: false, status: response.status, statusText: response.statusText },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, service: "supabase" });
}
