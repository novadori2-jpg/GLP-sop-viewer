import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/session";

// 로그인한 모든 사용자가 조회 가능한 구성원 목록 (비밀번호 제외)
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("users")
    .select("user_id, name, role, email, department")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
