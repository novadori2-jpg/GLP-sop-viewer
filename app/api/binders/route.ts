import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSession } from "@/lib/session";

function toStudyInfo(row: Record<string, unknown>) {
  return {
    studyNumber: row.study_number,
    binderType: row.binder_type,
    studyType: row.study_type ?? undefined,
    qaTargetStudyNumber: row.qa_target_study_number ?? undefined,
    title: row.title,
    testSubstance: "",
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    sdId: row.sd_id ?? "",
    directorName: row.director_name ?? "",
    investigatorIds: row.investigator_ids ?? [],
    investigatorNames: row.investigator_names ?? [],
    archivistId: row.archivist_id ?? undefined,
    archivistName: row.archivist_name ?? undefined,
    qapId: row.qap_id ?? "",
    qaName: row.qa_name ?? "",
    tfmId: row.tfm_id ?? undefined,
    tfmName: row.tfm_name ?? undefined,
    requiredForms: row.required_forms ?? [],
    sdBinderSignature: row.sd_binder_signature ?? undefined,
    tfmSignature: row.tfm_signature ?? undefined,
    qaStatementSignature: row.qa_statement_signature ?? undefined,
    qaStatementDate: row.qa_statement_date ?? undefined,
    qaStatementComments: row.qa_statement_comments ?? undefined,
    createdAt: row.created_at,
  };
}

// 전체 바인더 목록 조회
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { data, error } = await supabase
    .from("binders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(toStudyInfo));
}

// 바인더 생성
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = await req.json();

  const { error } = await supabase.from("binders").insert({
    study_number: body.studyNumber,
    binder_type: body.binderType,
    study_type: body.studyType ?? null,
    qa_target_study_number: body.qaTargetStudyNumber ?? null,
    title: body.title,
    status: body.status ?? "ongoing",
    start_date: body.startDate,
    sd_id: body.sdId || null,
    director_name: body.directorName || null,
    investigator_ids: body.investigatorIds ?? [],
    investigator_names: body.investigatorNames ?? [],
    archivist_id: body.archivistId ?? null,
    archivist_name: body.archivistName ?? null,
    qap_id: body.qapId || null,
    qa_name: body.qaName || null,
    tfm_id: body.tfmId ?? null,
    tfm_name: body.tfmName ?? null,
    required_forms: body.requiredForms ?? [],
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "이미 존재하는 바인더 번호입니다." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
