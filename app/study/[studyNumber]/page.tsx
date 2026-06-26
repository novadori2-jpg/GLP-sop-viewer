"use client";
import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { getStudiesList, saveStudiesList, getStudyRecords } from "@/lib/study-data";
import type { StudyInfo } from "@/lib/study-data";
import type { RecordEntry, CurrentUser } from "@/lib/record-data";
import { getCurrentUser } from "@/lib/record-data";
import { canReviewStudyBinder } from "@/lib/permissions";
import Link from "next/link";
import QAStatementModal from "@/components/record/QAStatementModal";

function StudyBinderContent() {
  const { studyNumber } = useParams<{ studyNumber: string }>();
  const router = useRouter();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [study, setStudy] = useState<StudyInfo | null>(null);
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQAModal, setShowQAModal] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.push("/login"); return; }
    setUser(u);
    const syncUser = () => {
      const updated = getCurrentUser();
      if (!updated) router.push("/login");
      else setUser(updated);
    };
    window.addEventListener("storage", syncUser);

    const loadData = async () => {
      const list = getStudiesList();
      const currentStudy = list.find((s) => s.studyNumber === studyNumber);
      setStudy(currentStudy ?? null);

      if (currentStudy) {
        const studyRecords = await getStudyRecords(studyNumber);
        setRecords(studyRecords);
      }
      setLoading(false);
    };

    loadData();

    return () => window.removeEventListener("storage", syncUser);
  }, [studyNumber]);


  const handleReload = async () => {
    const studyRecords = await getStudyRecords(studyNumber);
    setRecords(studyRecords);
  };

  const handleSubmitToQA = () => {
    if (!study) return;
    const list = getStudiesList();
    const updated = list.map((s) => {
      if (s.studyNumber === studyNumber) {
        return { ...s, status: "submitted_for_qa" as const };
      }
      return s;
    });
    saveStudiesList(updated);
    setStudy({ ...study, status: "submitted_for_qa" });
  };

  const handleQASignoff = async (comments: string, signatureImage: string) => {
    if (!study) return;
    
    // 1. 시험 정보 업데이트 및 저장
    const list = getStudiesList();
    const now = new Date().toISOString();
    const updatedStudy: StudyInfo = {
      ...study,
      status: "complete",
      qaStatementSignature: signatureImage,
      qaStatementDate: now,
      qaStatementComments: comments,
    };
    const updatedList = list.map((s) => (s.studyNumber === studyNumber ? updatedStudy : s));
    saveStudiesList(updatedList);
    setStudy(updatedStudy);

    // 2. 바인더에 속한 모든 하위 기록지들을 일괄 complete 상태로 락(Lock) 처리
    const { saveRecordEntry } = await import("@/lib/audit-logger");
    const updatedRecords = await Promise.all(
      records.map(async (rec) => {
        const uRec: RecordEntry = {
          ...rec,
          status: "complete",
          updatedAt: now,
        };
        await saveRecordEntry(uRec);
        return uRec;
      })
    );
    setRecords(updatedRecords);
    setShowQAModal(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-slate-500">로딩 중...</div>;
  if (!study) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-lg font-semibold text-slate-700">시험 바인더를 찾을 수 없습니다</p>
      <button onClick={() => router.back()} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold">돌아가기</button>
    </div>
  );

  const statusLabel = {
    ongoing: { text: "✏️ 시험 진행 중 (기록 작성)", cls: "bg-blue-50 text-blue-800 border-blue-200" },
    submitted_for_qa: { text: "🔍 QA 검토 대기 (바인더 제출 완료)", cls: "bg-amber-50 text-amber-800 border-amber-200" },
    complete: { text: "🛡️ QA 검토 및 최종 봉인 완료", cls: "bg-green-50 text-green-800 border-green-200" },
  }[study.status];

  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="flex items-center justify-center p-2 rounded-xl bg-slate-100 text-slate-700 cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-slate-400">GLP Study Binder</p>
            <h1 className="text-base font-bold text-slate-900 truncate">{study.studyNumber} · {study.title}</h1>
          </div>
          {user && (
            <span className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
              👤 {user.name}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        
        {/* Study Status Card */}
        <div className={`rounded-2xl px-5 py-4 border shadow-sm flex items-center justify-between ${statusLabel.cls}`}>
          <div>
            <p className="text-xs font-medium opacity-80">바인더 상태</p>
            <p className="text-base font-bold">{statusLabel.text}</p>
          </div>
          
          {study.status === "ongoing" && user && !canReviewStudyBinder(user.role) && (
            <button
              onClick={handleSubmitToQA}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors"
            >
              QA 검토 제출
            </button>
          )}

          {study.status === "submitted_for_qa" && user && canReviewStudyBinder(user.role) && (
            <button
              onClick={() => setShowQAModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-indigo-700 transition-colors"
            >
              최종 신뢰성보증 서명
            </button>
          )}
        </div>

        {/* Study Metadata Grid */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-3">📋 시험 기초 정보</h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-400">시험번호</p>
              <p className="font-semibold text-slate-900 mt-0.5">{study.studyNumber}</p>
            </div>
            <div>
              <p className="text-slate-400">시험물질명</p>
              <p className="font-semibold text-slate-900 mt-0.5">{study.testSubstance}</p>
            </div>
            <div>
              <p className="text-slate-400">시험 개시일</p>
              <p className="font-semibold text-slate-900 mt-0.5">{study.startDate}</p>
            </div>
            <div>
              <p className="text-slate-400">시험 종료일</p>
              <p className="font-semibold text-slate-900 mt-0.5">{study.endDate || "-"}</p>
            </div>
            <div>
              <p className="text-slate-400">시험책임자 (SD)</p>
              <p className="font-semibold text-slate-900 mt-0.5">{study.directorName}</p>
            </div>
            <div>
              <p className="text-slate-400">담당 신뢰성보증원 (QA)</p>
              <p className="font-semibold text-slate-900 mt-0.5">{study.qaName}</p>
            </div>
          </div>
        </div>

        {/* Dynamic Checklist Binder Section */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">📝 시험 단계별 기록지 작성 체크리스트</h2>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
              총 {study.requiredForms.length}종 서식
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {study.requiredForms.map((form) => {
              // 해당 양식(pdfFilename 혹은 formTitle)이 이미 바인더에 작성되어 있는지 확인
              const written = records.find(
                (r) => r.pdfFilename === form.pdfPath.split("/").pop()
              );

              return (
                <div key={form.pdfPath} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{form.formTitle}</p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{form.sopNumber}</p>
                  </div>
                  <div>
                    {written ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-200">
                          ✓ 작성 완료
                        </span>
                        <Link
                          href={`/record/entry/${written.id}`}
                          className="text-xs text-blue-600 font-bold hover:underline"
                        >
                          기록 열람
                        </Link>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-500 font-semibold bg-red-50 px-2 py-1 rounded border border-red-150">
                          미작성
                        </span>
                        {study.status === "ongoing" && user && !canReviewStudyBinder(user.role) ? (
                          <Link
                            href={`/record/new?pdf=${encodeURIComponent(form.pdfPath)}&sopId=${form.sopId}&studyNumber=${study.studyNumber}&categoryType=test`}
                            className="text-xs text-blue-600 font-bold hover:underline"
                          >
                            작성 시작
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">작성 불가</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Written Record Entries */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">📋 바인더 내 작성된 전체 기록지 목록</h2>
            <button
              onClick={handleReload}
              className="text-xs text-blue-600 font-semibold flex items-center gap-1 cursor-pointer"
            >
              🔄 새로고침
            </button>
          </div>

          {records.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-xs text-slate-400">아직 이 시험 바인더에 작성된 일지가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((rec) => (
                <Link
                  key={rec.id}
                  href={`/record/entry/${rec.id}`}
                  className="block p-3 border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/20 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono text-slate-400">{rec.sopNumber}</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{rec.formTitle}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      rec.status === "complete" ? "bg-green-100 text-green-700" :
                      rec.status === "submitted_for_qa" ? "bg-amber-100 text-amber-700" :
                      rec.status === "author_signed" ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {rec.status === "complete" ? "완료" :
                       rec.status === "submitted_for_qa" ? "QA검토" :
                       rec.status === "author_signed" ? "서명됨" : "작성중"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2">
                    <span>작성자: {rec.createdByName}</span>
                    <span>최종수정: {new Date(rec.updatedAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* QA Auditing Statement details */}
        {study.status === "complete" && study.qaStatementSignature && (
          <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-bold text-indigo-900 flex items-center gap-1">🛡️ 신뢰성보증확인서 (QA Statement)</h2>
            <div className="bg-white rounded-xl p-3 border border-indigo-100 text-xs space-y-2">
              <p className="text-slate-500">QA 최종 검토 소견:</p>
              <p className="font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap">{study.qaStatementComments}</p>
              
              <div className="flex items-end justify-between border-t border-slate-100 pt-2 mt-2">
                <div>
                  <p className="text-[10px] text-slate-400">보증 일자</p>
                  <p className="font-mono font-semibold text-slate-700 mt-0.5">
                    {new Date(study.qaStatementDate!).toLocaleDateString("ko-KR")} {new Date(study.qaStatementDate!).toLocaleTimeString("ko-KR")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400">신뢰성보증원</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={study.qaStatementSignature}
                    alt="QA Signature"
                    className="h-10 object-contain border border-slate-100 rounded bg-white mt-1 px-2 py-0.5 inline-block"
                  />
                  <p className="font-bold text-indigo-900 mt-1">{study.qaName}</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* QA Signoff Modal */}
      <QAStatementModal
        isOpen={showQAModal}
        userName={user?.name ?? ""}
        onConfirm={handleQASignoff}
        onCancel={() => setShowQAModal(false)}
      />

    </div>
  );
}

export default function StudyBinderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-500">로딩 중...</div>}>
      <StudyBinderContent />
    </Suspense>
  );
}
