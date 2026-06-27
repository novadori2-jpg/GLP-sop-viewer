import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/session";

// 바인더 삭제
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ studyNumber: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { studyNumber } = await params;
  const decoded = decodeURIComponent(studyNumber);

  const { error } = await supabase
    .from("binders")
    .delete()
    .eq("study_number", decoded);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// 바인더 상태 업데이트 (서명, 상태 변경 등)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ studyNumber: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { studyNumber } = await params;
  const decoded = decodeURIComponent(studyNumber);
  const body = await req.json();

  // camelCase → snake_case 매핑
  const update: Record<string, unknown> = {};
  if (body.status !== undefined) update.status = body.status;
  if (body.sdBinderSignature !== undefined) update.sd_binder_signature = body.sdBinderSignature;
  if (body.tfmSignature !== undefined) update.tfm_signature = body.tfmSignature;
  if (body.qaStatementSignature !== undefined) update.qa_statement_signature = body.qaStatementSignature;
  if (body.qaStatementDate !== undefined) update.qa_statement_date = body.qaStatementDate;
  if (body.qaStatementComments !== undefined) update.qa_statement_comments = body.qaStatementComments;
  if (body.endDate !== undefined) update.end_date = body.endDate;

  const { error } = await supabase
    .from("binders")
    .update(update)
    .eq("study_number", decoded);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
