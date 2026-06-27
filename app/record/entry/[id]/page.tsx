"use client";
import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import type { RecordEntry, EditHistoryItem, TypedTextItem, CanvasSignatureItem, StrikeThroughItem } from "@/lib/record-data";
import { getCurrentUser } from "@/lib/record-data";
import type { CurrentUser } from "@/lib/record-data";
import { canSignAsAuthor, canSignAsReviewer } from "@/lib/permissions";
import { getRecordEntry, saveRecordEntry } from "@/lib/audit-logger";
import dynamic from "next/dynamic";

// SSR 방지를 위해 PDFCanvasViewer 컴포넌트를 동적 임포트
const PDFCanvasViewer = dynamic(() => import("@/components/record/PDFCanvasViewer"), { ssr: false });

function EntryContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [signingAs, setSigningAs] = useState<"author" | "reviewer">("author");
  const [entry, setEntry] = useState<RecordEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // 서명 후 잠금 해제 상태 관리
  const [isEditUnlocked, setIsEditUnlocked] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.push("/login"); return; }
    setUser(u);
    if (!canSignAsAuthor(u.role) && canSignAsReviewer(u.role)) setSigningAs("reviewer");
    const syncUser = () => {
      const updated = getCurrentUser();
      if (!updated) router.push("/login");
      else setUser(updated);
    };
    window.addEventListener("storage", syncUser);

    getRecordEntry(id).then(e => {
      // 신규 추가된 객체들이 undefined일 때를 대비해 초기값 세팅
      if (e) {
        if (!e.typedTexts) e.typedTexts = {};
        if (!e.canvasSignatures) e.canvasSignatures = {};
        if (!e.strikeThroughs) e.strikeThroughs = {};
      }
      setEntry(e ?? null);
      setLoading(false);
    });

    return () => window.removeEventListener("storage", syncUser);
  }, [id]);


  const handleDraw = (page: number, base64: string) => {
    if (!entry) return;
    setEntry(prev => {
      if (!prev) return null;
      return {
        ...prev,
        drawings: {
          ...prev.drawings,
          [page]: base64,
        },
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleDrawText = (page: number, items: TypedTextItem[]) => {
    if (!entry) return;
    setEntry(prev => {
      if (!prev) return null;
      return {
        ...prev,
        typedTexts: {
          ...prev.typedTexts,
          [page]: items,
        },
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleDrawSignature = async (page: number, items: CanvasSignatureItem[]) => {
    if (!entry) return;
    const updatedSigs = {
      ...entry.canvasSignatures,
      [page]: items,
    };

    const allSigs = Object.values(updatedSigs).flat();
    const hasAuthorSig = allSigs.some(s => s?.userRole === "author");
    const hasReviewerSig = allSigs.some(s => s?.userRole === "reviewer");

    let nextStatus: any = "draft";
    if (hasReviewerSig) {
      nextStatus = "complete";
    } else if (hasAuthorSig) {
      nextStatus = "author_signed";
    }

    const updated = {
      ...entry,
      canvasSignatures: updatedSigs,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };
    setEntry(updated);
    await saveRecordEntry(updated);
    setIsEditUnlocked(false); // 서명 시 즉시 잠금
  };

  const handleDrawStrike = (page: number, items: StrikeThroughItem[]) => {
    if (!entry) return;
    setEntry(prev => {
      if (!prev) return null;
      return {
        ...prev,
        strikeThroughs: {
          ...prev.strikeThroughs,
          [page]: items,
        },
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleAttemptEdit = () => {
    setIsEditUnlocked(true);
  };

  const handleSave = async () => {
    if (!entry) return;
    setSaving(true);
    await saveRecordEntry({ ...entry, updatedAt: new Date().toISOString() });
    setSaving(false);
    setIsEditUnlocked(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };


  if (loading) return <div className="flex items-center justify-center min-h-screen text-slate-500">불러오는 중...</div>;
  if (!entry) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-lg font-semibold text-slate-700">기록지를 찾을 수 없습니다</p>
      <button onClick={() => router.back()} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold">돌아가기</button>
    </div>
  );

  // 서명 완료 상태이거나 확인자 승인이 끝났고, 사용자가 잠금 해제(수정 승인)를 하지 않은 경우 ReadOnly 잠금
  const isLocked = (entry.status !== "draft") && !isEditUnlocked;

  const statusInfo = {
    complete:          { label: "✓ 서명 완료 — 일지 작성 종료",         cls: "bg-green-50 text-green-800 border-green-200" },
    author_signed:     { label: "✍ 작성자 서명 완료 — 확인자 서명 대기", cls: "bg-blue-50 text-blue-800 border-blue-200" },
    submitted_for_qa:  { label: "🔍 QA 검토 대기 중 — 수정 제한",       cls: "bg-indigo-50 text-indigo-800 border-indigo-200" },
    draft:             { label: "✏ 직접 필기 및 타이핑 작성 중 (미서명)", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  }[entry.status] ?? { label: entry.status, cls: "bg-slate-50 text-slate-700 border-slate-200" };


  return (
    <div className="min-h-screen bg-slate-50 pb-[60px]">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="flex items-center justify-center p-2 rounded-xl bg-slate-100 text-slate-700 cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-slate-400">{entry.sopNumber}</p>
            <h1 className="text-base font-bold text-slate-900 truncate">{entry.formTitle}</h1>
          </div>
          {user && (() => {
            const canBoth = canSignAsAuthor(user.role) && canSignAsReviewer(user.role);
            return (
              <div className="mr-2 flex items-center gap-1">
                <span className="text-[10px] text-slate-500 font-semibold">{user.name}</span>
                {canBoth ? (
                  <button
                    onClick={() => setSigningAs(s => s === "author" ? "reviewer" : "author")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-all ${
                      signingAs === "author" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"
                    }`}
                  >
                    {signingAs === "author" ? "✍ 작성자 서명" : "✅ 확인자 서명"}
                  </button>
                ) : (
                  <span className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border ${
                    signingAs === "author" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"
                  }`}>
                    {signingAs === "author" ? "✍ 작성자" : "✅ 확인자"}
                  </span>
                )}
              </div>
            );
          })()}
          <button onClick={handleSave} disabled={saving}
            className={`px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${saved ? "bg-green-600 text-white" : "bg-blue-600 text-white disabled:opacity-40"}`}>
            {saving ? "저장 중..." : saved ? "✓ 저장됨" : "저장"}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold flex items-center gap-2 border ${statusInfo.cls}`}>
          <span>{statusInfo.label}</span>
          {isLocked && <span className="ml-auto text-xs opacity-70">화면 터치 시 수정 사유를 적고 편집할 수 있습니다</span>}
          {isEditUnlocked && <span className="ml-auto text-xs text-red-600 animate-pulse">⚠️ 편집 가능 모드 활성화됨</span>}
        </div>

        {/* 1. PDF 직접 필기/타이핑/서명 영역 */}
        <div className="bg-slate-100 rounded-2xl border border-slate-300 p-2 overflow-x-auto">
          <PDFCanvasViewer
            pdfUrl={entry.pdfPath}
            drawings={entry.drawings}
            typedTexts={entry.typedTexts}
            canvasSignatures={entry.canvasSignatures}
            strikeThroughs={entry.strikeThroughs}
            readOnly={isLocked}
            onDraw={handleDraw}
            onDrawText={handleDrawText}
            onDrawSignature={handleDrawSignature}
            onDrawStrike={handleDrawStrike}
            onAttemptEdit={handleAttemptEdit}
            currentUser={user ? { ...user, signingAs } : { id: "", name: "", role: "investigator", signingAs }}
          />
        </div>

        {/* 2. 수정 이력 리스트 */}
        {entry.editHistory.length > 0 && (
          <div className="bg-white rounded-2xl border border-amber-200 p-4">
            <h2 className="text-sm font-bold text-amber-700 mb-2">📋 수정 이력 ({entry.editHistory.length}건)</h2>
            <div className="space-y-2">
              {entry.editHistory.map(h => {
                const d = new Date(h.editedAt);
                const fmt = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
                return (
                  <div key={h.id} className="text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <div className="flex justify-between mb-0.5">
                      <span className="font-semibold text-amber-800">{h.fieldLabel}</span>
                      <span className="text-amber-600">{h.editedByName} · {fmt}</span>
                    </div>
                    <div className="flex gap-2 text-slate-600">
                      <span className="line-through text-red-400">{h.oldValue || "(없음)"}</span>
                      <span>→</span>
                      <span className="font-semibold text-slate-800">{h.newValue}</span>
                    </div>
                    <p className="text-amber-700 mt-0.5">사유: {h.reason}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="pb-8" />
      </main>
    </div>
  );
}

export default function EntryPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-500">로딩 중...</div>}>
      <EntryContent />
    </Suspense>
  );
}
