"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAllRecordEntries, deleteRecordEntry } from "@/lib/audit-logger";
import { getCurrentUser } from "@/lib/record-data";
import type { RecordEntry } from "@/lib/record-data";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:            { label: "작성 중",          color: "bg-amber-100 text-amber-800" },
  author_signed:    { label: "서명 완료",         color: "bg-blue-100 text-blue-800" },
  submitted_for_qa: { label: "QA 검토 중",        color: "bg-indigo-100 text-indigo-800" },
  complete:         { label: "최종 완료",          color: "bg-green-100 text-green-800" },
};

type GroupedRecords = {
  studyNumber: string;
  records: RecordEntry[];
};

export default function RecordsByStudyPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupedRecords[]>([]);
  const [noStudy, setNoStudy] = useState<RecordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.push("/login"); return; }

    getAllRecordEntries().then(all => {
      const sorted = [...all].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

      // 시험번호별 그룹핑
      const map = new Map<string, RecordEntry[]>();
      const orphans: RecordEntry[] = [];
      for (const rec of sorted) {
        if (rec.studyNumber) {
          const arr = map.get(rec.studyNumber) ?? [];
          arr.push(rec);
          map.set(rec.studyNumber, arr);
        } else {
          orphans.push(rec);
        }
      }

      const grouped: GroupedRecords[] = Array.from(map.entries()).map(([sn, recs]) => ({
        studyNumber: sn,
        records: recs,
      }));

      setGroups(grouped);
      setNoStudy(orphans);
      // 첫 번째 그룹은 기본 펼침
      if (grouped.length > 0) setOpenGroups(new Set([grouped[0].studyNumber]));
      setLoading(false);
    });
  }, [router]);

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    await deleteRecordEntry(id);
    setGroups(prev => prev
      .map(g => ({ ...g, records: g.records.filter(r => r.id !== id) }))
      .filter(g => g.records.length > 0)
    );
    setNoStudy(prev => prev.filter(r => r.id !== id));
    setConfirmDeleteId(null);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-slate-400">불러오는 중...</div>;

  const total = groups.reduce((s, g) => s + g.records.length, 0) + noStudy.length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 삭제 확인 모달 */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <p className="text-base font-bold text-slate-800">기록지를 삭제하시겠습니까?</p>
            <p className="text-sm text-slate-500">삭제된 기록지는 복구할 수 없습니다.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">취소</button>
              <button onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold">삭제</button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-slate-100 text-slate-700 cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <p className="text-xs text-slate-400 font-mono">시험번호별 기록지</p>
            <h1 className="text-base font-bold text-slate-900">전체 기록지 목록</h1>
          </div>
          <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-semibold">총 {total}건</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {total === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">작성된 기록지가 없습니다.</div>
        )}

        {/* 시험번호별 그룹 */}
        {groups.map(g => (
          <div key={g.studyNumber} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => toggleGroup(g.studyNumber)}
              className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer"
            >
              <div>
                <p className="text-xs text-slate-400 font-mono">시험번호</p>
                <p className="text-sm font-bold text-slate-900">{g.studyNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                  {g.records.length}건
                </span>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${openGroups.has(g.studyNumber) ? "rotate-90" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {openGroups.has(g.studyNumber) && (
              <div className="border-t border-slate-100 divide-y divide-slate-100">
                {g.records.map(rec => (
                  <RecordRow key={rec.id} rec={rec} onDelete={() => setConfirmDeleteId(rec.id)} />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* 시험번호 미지정 기록지 */}
        {noStudy.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => toggleGroup("__none__")}
              className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer"
            >
              <div>
                <p className="text-xs text-slate-400 font-mono">시험번호 없음</p>
                <p className="text-sm font-bold text-slate-600">기타 기록지</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                  {noStudy.length}건
                </span>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${openGroups.has("__none__") ? "rotate-90" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
            {openGroups.has("__none__") && (
              <div className="border-t border-slate-100 divide-y divide-slate-100">
                {noStudy.map(rec => (
                  <RecordRow key={rec.id} rec={rec} onDelete={() => setConfirmDeleteId(rec.id)} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function RecordRow({ rec, onDelete }: { rec: RecordEntry; onDelete: () => void }) {
  const s = STATUS_LABEL[rec.status] ?? STATUS_LABEL.draft;
  const d = new Date(rec.updatedAt);
  const fmt = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <Link href={`/record/entry/${rec.id}`} className="flex-1 min-w-0">
        <p className="text-xs font-mono text-slate-400 truncate">{rec.sopNumber}</p>
        <p className="text-sm font-semibold text-slate-800 truncate">{rec.formTitle}</p>
        <p className="text-xs text-slate-400 mt-0.5">{fmt} · {rec.createdByName}</p>
      </Link>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${s.color}`}>{s.label}</span>
        <button onClick={onDelete}
          className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
