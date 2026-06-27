"use client";
import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { getStudyRecords } from "@/lib/study-data";
import type { StudyInfo } from "@/lib/study-data";
import type { RecordEntry, CurrentUser } from "@/lib/record-data";
import { getCurrentUser } from "@/lib/record-data";
import Link from "next/link";

function QABinderContent() {
  const params = useParams<{ number: string }>();
  const binderNumber = decodeURIComponent(params.number);
  const router = useRouter();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [binder, setBinder] = useState<StudyInfo | null>(null);
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
    const u = getCurrentUser();
    if (!u) { router.push("/login"); return; }
    setUser(u);

    const res = await fetch("/api/binders");
    if (res.ok) {
      const list = await res.json();
      const found = Array.isArray(list)
        ? list.find((s: StudyInfo) => s.studyNumber === binderNumber) ?? null
        : null;
      setBinder(found);
      if (found) {
        const recs = await getStudyRecords(binderNumber);
        setRecords(recs);
      }
    }
    setLoading(false);
    };
    load();
  }, [binderNumber, router]);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-slate-500">로딩 중...</div>;
  if (!binder) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-5xl">🔍</p>
      <p className="text-lg font-semibold text-slate-700">QA 바인더를 찾을 수 없습니다</p>
      <button onClick={() => router.push("/")} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold">홈으로</button>
    </div>
  );

  const completedCount = records.filter(r => r.status === "complete" || r.status === "author_signed").length;
  const totalForms = binder.requiredForms.reduce((a, f) => a + (f.quantity ?? 1), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-slate-100 text-slate-700 cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-indigo-500 font-bold">🔍 QA 점검 바인더</p>
            <h1 className="text-base font-bold text-slate-900 truncate">{binder.studyNumber}</h1>
          </div>
          {user && (
            <span className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600">
              👤 {user.name}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* 바인더 정보 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">QA 점검 바인더</span>
            <span className="text-xs text-slate-400">{binder.startDate}</span>
          </div>
          {binder.qaTargetStudyNumber && (
            <div className="text-sm text-slate-600">
              <span className="text-slate-400">점검 대상 시험: </span>
              <span className="font-bold text-slate-800">{binder.qaTargetStudyNumber}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 font-medium">담당 QAP</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{binder.qaName}</p>
            </div>
            {binder.tfmName && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 font-medium">운영책임자</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{binder.tfmName}</p>
              </div>
            )}
          </div>
          {/* 진행률 */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>기록지 작성 진행률</span>
              <span className="font-bold">{completedCount} / {totalForms}종</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: totalForms > 0 ? `${(completedCount / totalForms) * 100}%` : "0%" }}
              />
            </div>
          </div>
        </div>

        {/* 기록지 목록 */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-slate-700 px-1">📋 점검 기록지 목록</h2>
          {binder.requiredForms.map((form, idx) => {
            const qty = form.quantity ?? 1;
            return Array.from({ length: qty }).map((_, i) => {
              const matchedRecord = records.find(r =>
                r.pdfPath === form.pdfPath && (qty === 1 || r.formTitle.endsWith(`(${i + 1}/${qty})`))
              );
              const isComplete = matchedRecord?.status === "complete" || matchedRecord?.status === "author_signed";
              const formTitle = qty > 1 ? `${form.formTitle} (${i + 1}/${qty})` : form.formTitle;

              return (
                <Link
                  key={`${idx}-${i}`}
                  href={matchedRecord
                    ? `/record/entry/${matchedRecord.id}`
                    : `/record/new?pdf=${encodeURIComponent(form.pdfPath)}&title=${encodeURIComponent(formTitle)}&studyNumber=${encodeURIComponent(binder.studyNumber)}`
                  }
                  className="flex items-center gap-4 px-4 py-3.5 bg-white border border-slate-200 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50/10 transition-all shadow-sm"
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${
                    isComplete ? "bg-green-100 text-green-700" :
                    matchedRecord ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-400"
                  }`}>
                    {isComplete ? "✓" : matchedRecord ? "✏" : `${idx + 1}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{formTitle}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{form.sopNumber}</p>
                  </div>
                  <div className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                    isComplete ? "bg-green-100 text-green-700" :
                    matchedRecord ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-500"
                  }`}>
                    {isComplete ? "완료" : matchedRecord ? "작성중" : "미작성"}
                  </div>
                </Link>
              );
            });
          })}
        </div>
      </main>
    </div>
  );
}

export default function QABinderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-500">로딩 중...</div>}>
      <QABinderContent />
    </Suspense>
  );
}
