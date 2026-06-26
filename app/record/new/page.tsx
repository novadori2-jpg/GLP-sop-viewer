"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import type { RecordEntry, TypedTextItem, CanvasSignatureItem, StrikeThroughItem } from "@/lib/record-data";
import { getCurrentUser } from "@/lib/record-data";
import type { CurrentUser } from "@/lib/record-data";
import { canSignAsAuthor, canSignAsReviewer } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/auth";
import { saveRecordEntry } from "@/lib/audit-logger";
import { EditHistoryModal } from "@/components/record/EditHistoryModal";
import dynamic from "next/dynamic";

// SSR 방지를 위해 PDFCanvasViewer 컴포넌트를 동적 임포트
const PDFCanvasViewer = dynamic(() => import("@/components/record/PDFCanvasViewer"), { ssr: false });

function NewRecordContent() {
  const params = useSearchParams();
  const router = useRouter();
  const pdfUrl = params.get("pdf") ?? "";
  const sopId = params.get("sopId") ?? "";

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [signingAs, setSigningAs] = useState<"author" | "reviewer">("author");
  const [saving, setSaving] = useState(false);

  // 수정 잠금 및 모달 상태
  const [isEditUnlocked, setIsEditUnlocked] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // URL에서 파일명 및 타이틀 추출
  const filename = pdfUrl.substring(pdfUrl.lastIndexOf("/") + 1);
  const decodedFilename = decodeURIComponent(filename);
  const nameWithoutExt = decodedFilename.substring(0, decodedFilename.lastIndexOf("."));
  const formTitle = nameWithoutExt.replace(/_/g, " ");

  const [entry, setEntry] = useState<RecordEntry>(() => {
    const initialUser = typeof window !== "undefined" ? getCurrentUser() : { id: "user-1", name: "연구원", role: "author" };
    const cleanSopId = sopId || "generic";
    const cleanSopNumber = cleanSopId.replace(/-\d{2}$/, "");

    // 파라미터 파싱
    const studyNum = params.get("studyNumber") || undefined;
    const catType = (params.get("categoryType") as any) || (studyNum ? "test" : "operational");
    const equipId = params.get("equipmentId") || undefined;
    const empId = params.get("employeeId") || undefined;
    const schedYM = params.get("scheduleYearMonth") || undefined;

    return {
      id: uuidv4(),
      formId: `FORM-PDF-${Date.now()}`,
      sopId: cleanSopId,
      sopNumber: cleanSopNumber,
      formTitle: formTitle || "GLP 작업 기록지",
      pdfPath: pdfUrl,
      pdfFilename: decodedFilename,
      status: "draft",
      categoryType: catType,
      studyNumber: studyNum,
      equipmentId: equipId,
      employeeId: empId,
      scheduleYearMonth: schedYM,
      drawings: {},
      typedTexts: {},
      canvasSignatures: {},
      strikeThroughs: {},
      editHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: initialUser.id,
      createdByName: initialUser.name,
    };
  });


  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.push("/login"); return; }
    setUser(u);
    // 기본 서명 모드: 작성자 서명 가능이면 author, 확인자만 가능이면 reviewer
    if (!canSignAsAuthor(u.role) && canSignAsReviewer(u.role)) {
      setSigningAs("reviewer");
    }
    const syncUser = () => {
      const updated = getCurrentUser();
      if (!updated) router.push("/login");
      else setUser(updated);
    };
    window.addEventListener("storage", syncUser);
    return () => window.removeEventListener("storage", syncUser);
  }, [router]);

  const handleDraw = (page: number, base64: string) => {
    setEntry(prev => ({
      ...prev,
      drawings: {
        ...prev.drawings,
        [page]: base64,
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleDrawText = (page: number, items: TypedTextItem[]) => {
    setEntry(prev => ({
      ...prev,
      typedTexts: {
        ...prev.typedTexts,
        [page]: items,
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleDrawSignature = async (page: number, items: CanvasSignatureItem[]) => {
    const updatedSigs = {
      ...entry.canvasSignatures,
      [page]: items,
    };

    // 전체 서명 목록 추출
    const allSigs = Object.values(updatedSigs).flat();
    const hasAuthorSig = allSigs.some(s => s?.userRole === "author");
    const hasReviewerSig = allSigs.some(s => s?.userRole === "reviewer");

    // 상태 결정
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
    setIsEditUnlocked(false); // 서명 즉시 락 복원
  };

  const handleDrawStrike = (page: number, items: StrikeThroughItem[]) => {
    setEntry(prev => ({
      ...prev,
      strikeThroughs: {
        ...prev.strikeThroughs,
        [page]: items,
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleAttemptEdit = () => {
    setShowEditModal(true);
  };

  const confirmUnlockEdit = (newValue: string, reason: string, signatureImage?: string) => {
    const histItem = {
      id: uuidv4(),
      sectionId: "drawings",
      fieldId: "canvas",
      fieldLabel: "기록지 본문 수정",
      oldValue: "작성 완료된 데이터",
      newValue: "필기 및 데이터 수정 개시",
      reason: reason,
      editedBy: user.id,
      editedByName: user.name,
      editedAt: new Date().toISOString(),
      signatureImage: signatureImage,
    };

    setEntry(prev => ({
      ...prev,
      editHistory: [...prev.editHistory, histItem],
      updatedAt: new Date().toISOString(),
    }));

    setIsEditUnlocked(true);
    setShowEditModal(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await saveRecordEntry({ ...entry, updatedAt: new Date().toISOString() });
    setSaving(false);
    setIsEditUnlocked(false); // 저장 후 락 복원
    
    if (entry.studyNumber) {
      router.push(`/study/${entry.studyNumber}`);
    } else if (entry.categoryType === "operational") {
      router.push("/operations");
    } else {
      router.push(`/sop/${entry.sopId}`);
    }
  };


  if (!user) {
    return <div className="flex items-center justify-center min-h-screen text-slate-500">인증 확인 중...</div>;
  }

  if (!pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-lg font-semibold text-slate-700">기록할 원본 PDF 경로가 전달되지 않았습니다.</p>
        <button onClick={() => router.back()} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold">돌아가기</button>
      </div>
    );
  }

  // 서명 완료 상태이거나 확인자 서명이 끝났고, 사용자가 잠금 해제를 하지 않은 경우 ReadOnly 잠금
  const isLocked = (entry.status !== "draft") && !isEditUnlocked;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
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
            const canAuthor = canSignAsAuthor(user.role);
            const canReviewer = canSignAsReviewer(user.role);
            const canBoth = canAuthor && canReviewer;
            return (
              <div className="mr-2 flex items-center gap-1">
                <span className="text-[10px] text-slate-500 font-semibold">{user.name}</span>
                {canBoth ? (
                  <button
                    onClick={() => setSigningAs(s => s === "author" ? "reviewer" : "author")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-all ${
                      signingAs === "author"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-purple-50 text-purple-700 border-purple-200"
                    }`}
                    title="서명 모드 전환"
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
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 cursor-pointer"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* 상태 표시 */}
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold flex items-center gap-2 border ${
          entry.status === "complete" ? "bg-green-50 text-green-800 border-green-200" :
          entry.status === "author_signed" ? "bg-blue-50 text-blue-800 border-blue-200" :
          "bg-amber-50 text-amber-800 border-amber-200"
        }`}>
          <span>
            {entry.status === "complete" ? "✓ 서명 완료 — 일지 작성 종료" :
             entry.status === "author_signed" ? "✍ 작성자 서명 완료 — 확인자 서명 대기" :
             "✏ 직접 필기 및 타이핑 작성 중 (미서명)"}
          </span>
          {isLocked && <span className="ml-auto text-xs opacity-70">화면 터치 시 수정 사유를 기입하고 편집할 수 있습니다</span>}
          {isEditUnlocked && <span className="ml-auto text-xs text-red-600 animate-pulse">⚠️ 편집 가능 모드 활성화됨</span>}
        </div>

        {/* 1. PDF 직접 필기/타이핑/서명 영역 */}
        <div className="bg-slate-100 rounded-2xl border border-slate-300 p-2 overflow-x-auto">
          <PDFCanvasViewer
            pdfUrl={pdfUrl}
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
            currentUser={{ ...user, signingAs }}
          />
        </div>

        {/* 2. 수정 사유 모달창 */}
        {showEditModal && (
          <EditHistoryModal
            fieldLabel="필기 일지 수정"
            oldValue="기록 완료된 데이터"
            onConfirm={confirmUnlockEdit}
            onCancel={() => setShowEditModal(false)}
            simplified
            userName={user.name}
          />
        )}

        <div className="pb-8" />
      </main>
    </div>
  );
}

export default function NewRecordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-500">로딩 중...</div>}>
      <NewRecordContent />
    </Suspense>
  );
}
