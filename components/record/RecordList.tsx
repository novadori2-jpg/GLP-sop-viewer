"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { RecordEntry } from "@/lib/record-data";
import { getRecordEntriesBySop } from "@/lib/audit-logger";

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

  useEffect(() => {
    getRecordEntriesBySop(sopId).then(e => {
      setEntries(e.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setLoading(false);
    });
  }, [sopId]);

  if (loading) return <p className="text-sm text-slate-400 py-2">불러오는 중...</p>;
  if (entries.length === 0) return <p className="text-sm text-slate-400 py-2">작성된 기록지가 없습니다.</p>;

  return (
    <div className="space-y-2">
      {entries.map(entry => {
        const d = new Date(entry.createdAt);
        const fmt = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        const s = STATUS_LABEL[entry.status] ?? STATUS_LABEL.draft;
        return (
          <Link
            key={entry.id}
            href={`/record/entry/${entry.id}`}
            className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
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
        );
      })}
    </div>
  );
}
