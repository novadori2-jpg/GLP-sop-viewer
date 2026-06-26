"use client";
import Link from "next/link";
import type { SOPDocument } from "@/lib/sop-data";
import CategoryBadge from "./CategoryBadge";
import StatusBadge from "./StatusBadge";

export default function SOPCard({ sop }: { sop: SOPDocument }) {
  return (
    <Link
      href={`/sop/${sop.id}`}
      className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-150 px-3 py-2.5"
    >
      {/* 상태 인디케이터 */}
      <span className={`shrink-0 w-2 h-2 rounded-full ${sop.status === "effective" ? "bg-green-500" : "bg-red-400"}`} />

      {/* 제목 + 번호 */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-slate-900 truncate">{sop.title}</div>
        <div className="text-xs text-slate-400 font-mono">{sop.number} · {sop.version}</div>
      </div>

      {/* 카테고리 + 화살표 */}
      <div className="shrink-0 flex items-center gap-2">
        <CategoryBadge code={sop.category} />
        <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
