"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { RecordEntry } from "@/lib/record-data";
import { getRecordEntriesBySop, deleteRecordEntry } from "@/lib/audit-logger";

interface Props {
  sopId: string;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:         { label: "작성 중",          color: "bg-amber-100 text-amber-800" },
  author_signed: { label: "작성자 서명 완료", color: "bg-blue-100 text-blue-800" },
  complete:      { label: "서명 완료",        color: "bg-green-100 text-green-800" },
};

export default function RecordList({ sopId }: Props) {
  const [entries, setEntries] = useState<RecordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    getRecordEntriesBySop(sopId).then(e => {
      setEntries(e.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setLoading(false);
    });
  }, [sopId]);

  const handleDelete = async (id: string) => {
    await deleteRecordEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
    setConfirmDeleteId(null);
  };

  if (loading) return <p className="text-sm text-slate-400 py-2">불러오는 중...</p>;
  if (entries.length === 0) return <p className="text-sm text-slate-400 py-2">작성된 기록지가 없습니다.</p>;

  return (
    <div className="space-y-2">
      {/* 삭제 확인 모달 */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <p className="text-base font-bold text-slate-800">기록지를 삭제하시겠습니까?</p>
            <p className="text-sm text-slate-500">삭제된 기록지는 복구할 수 없습니다.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600"
              >취소</button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold"
              >삭제</button>
            </div>
          </div>
        </div>
      )}

      {entries.map(entry => {
        const d = new Date(entry.createdAt);
        const fmt = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        const s = STATUS_LABEL[entry.status] ?? STATUS_LABEL.draft;
        return (
          <div key={entry.id} className="flex items-center gap-2">
            <Link
              href={`/record/entry/${entry.id}`}
              className="flex-1 flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800">{entry.formTitle}</p>
                <p className="text-xs text-slate-500">{fmt} · {entry.createdByName}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
            <button
              onClick={() => setConfirmDeleteId(entry.id)}
              className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition-colors flex-shrink-0"
              title="삭제"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
