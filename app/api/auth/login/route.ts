import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { createSession, setSessionCookie } from "@/lib/session";
import type { UserRole } from "@/lib/record-data";

export async function POST(req: NextRequest) {
  const { id, password } = await req.json();

  if (!id || !password) {
    return NextResponse.json({ error: "아이디와 비밀번호를 입력하세요." }, { status: 400 });
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("user_id", id)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 틀렸습니다." }, { status: 401 });
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 틀렸습니다." }, { status: 401 });
  }

  const sessionPayload = {
    id: user.user_id,
    name: user.name,
    role: user.role as UserRole,
    email: user.email ?? undefined,
    department: user.department ?? undefined,
  };

  const token = await createSession(sessionPayload);
  const cookie = setSessionCookie(token);

  const res = NextResponse.json({ user: sessionPayload });
  res.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof res.cookies.set>[2]);
  return res;
}
