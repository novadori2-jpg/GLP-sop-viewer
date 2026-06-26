"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SOP_DATA } from "@/lib/sop-data";
import type { SOPDocument } from "@/lib/sop-data";
import StatusBadge from "@/components/StatusBadge";
import CategoryBadge from "@/components/CategoryBadge";
import { logSOPView } from "@/lib/audit-logger";
import { getTemplatesBySopId } from "@/lib/record-templates";
import RecordList from "@/components/record/RecordList";
import { getCurrentUser } from "@/lib/record-data";
import type { CurrentUser } from "@/lib/record-data";
import { canCreateRecord } from "@/lib/permissions";

// 기존 PDFViewer 컴포넌트는 사용되지 않으므로 제거하고, 
// 대신 아래의 dynamic tab iframe 뷰어를 적용합니다.

// SOP 메타 정보 테이블
function SOPMetaTable({ sop }: { sop: SOPDocument }) {
  const cells = [
    { label: "SOP 번호", value: sop.number },
    { label: "버전", value: sop.version },
    { label: "제정일", value: sop.createdDate },
    { label: "최근 개정일", value: sop.revisedDate },
    { label: "효력발생일", value: sop.effectiveDate },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">문서 정보</h2>
      </div>
      <dl className="grid grid-cols-2">
        {cells.map(({ label, value }, i) => (
          <div
            key={label}
            className={`px-4 py-3 border-b border-slate-100 ${i % 2 === 0 ? "border-r" : ""}`}
          >
            <dt className="text-xs font-medium text-slate-400 mb-0.5">{label}</dt>
            <dd className="text-sm font-bold text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function SOPDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sopId = params.id as string;

  const sop = SOP_DATA.find(s => s.id === sopId);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [pdfFiles, setPdfFiles] = useState<{ filename: string; url: string; title: string; isMain: boolean }[]>([]);
  const [activePdfUrl, setActivePdfUrl] = useState<string>("");
  const [loadingPdfs, setLoadingPdfs] = useState(true);

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
    return () => window.removeEventListener("storage", syncUser);
  }, [router]);

  useEffect(() => {
    if (sop) {
      logSOPView({
        sopId: sop.id,
        sopNumber: sop.number,
        sopTitle: sop.title,
        action: "view",
      });

      // 관련 PDF 파일 목록 API 호출
      setLoadingPdfs(true);
      fetch(`/api/sop-pdfs?sopId=${sop.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setPdfFiles(data);
            if (data.length > 0) {
              setActivePdfUrl(data[0].url);
            }
          }
          setLoadingPdfs(false);
        })
        .catch(() => setLoadingPdfs(false));
    }
  }, [sop]);

  if (!sop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-5xl">📄</div>
        <p className="text-lg font-semibold text-slate-700">SOP를 찾을 수 없습니다</p>
        <p className="text-sm text-slate-500 font-mono">{sopId}</p>
        <Link href="/" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 구버전 경고 배너 */}
      {sop.status !== "effective" && (
        <div className="bg-red-600 text-white px-4 py-3 text-center">
          <p className="font-bold text-base">⚠ 경고: 이 문서는 폐기된 버전입니다</p>
          <p className="text-sm opacity-90">실험에 사용하지 마십시오. 최신 유효본을 확인하세요.</p>
        </div>
      )}

      {/* 헤더 네비게이션 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-2 rounded-xl bg-slate-100 text-slate-700 active:bg-slate-200 cursor-pointer"
            aria-label="뒤로 가기"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-slate-500 truncate">{sop.number}</p>
            <h1 className="text-base font-bold text-slate-900 truncate">{sop.title}</h1>
          </div>
          {user && (
            <span className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
              👤 {user.name}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* 상태 배지 */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <StatusBadge status={sop.status} large />
          <CategoryBadge code={sop.category} />
        </div>

        {/* 문서 요약 */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-sm text-blue-800 leading-relaxed">{sop.description}</p>
        </div>

        {/* 메타 정보 */}
        <SOPMetaTable sop={sop} />

        {/* 작성 완료된 필기 기록지 목록 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">작성된 필기 기록지 목록</h2>
          <RecordList sopId={sop.id} />
        </div>

        {/* PDF 뷰어 영역 (멀티 탭 지원) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">문서내용 및 양식서식</h2>
            <div className="flex items-center gap-2">
              {/* 권한이 있는 역할만 기록지 작성 버튼 노출 */}
              {activePdfUrl && !pdfFiles.find(p => p.url === activePdfUrl)?.isMain && user && canCreateRecord(user.role, sop.category) && (
                <Link
                  href={`/record/new?pdf=${encodeURIComponent(activePdfUrl)}&sopId=${sop.id}`}
                  className="inline-flex items-center justify-center text-xs text-white font-bold px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg shadow-sm cursor-pointer transition-colors"
                >
                  📝 이 양식에 필기 기록하기
                </Link>
              )}

              {activePdfUrl && (
                <a
                  href={activePdfUrl}
                  download
                  className="inline-flex items-center justify-center text-xs text-blue-600 font-semibold px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200 active:bg-blue-100 cursor-pointer"
                  onClick={() => {
                    const activePdf = pdfFiles.find(p => p.url === activePdfUrl);
                    logSOPView({
                      sopId: sop.id,
                      sopNumber: sop.number,
                      sopTitle: activePdf ? activePdf.title : sop.title,
                      action: "download",
                    });
                  }}
                >
                  다운로드
                </a>
              )}
            </div>
          </div>

          {loadingPdfs ? (
            <div className="h-64 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 text-xs">
              PDF 문서를 확인하는 중...
            </div>
          ) : pdfFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 bg-slate-50 border border-slate-200 border-dashed rounded-xl p-4 text-center">
              <span className="text-3xl mb-2">📄</span>
              <p className="text-sm font-semibold text-slate-500">등록된 PDF 파일이 없습니다</p>
              <p className="text-xs text-slate-400 mt-1">공유 폴더에서 HWP 변환 스크립트를 실행해 주세요</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* 멀티 탭 메뉴 */}
              {pdfFiles.length > 1 && (
                <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2">
                  {pdfFiles.map((pdf) => (
                    <button
                      key={pdf.filename}
                      onClick={() => setActivePdfUrl(pdf.url)}
                      className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        activePdfUrl === pdf.url
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {pdf.title}
                    </button>
                  ))}
                </div>
              )}
              {/* PDF 뷰어 프레임 */}
              <div className="pdf-container rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 h-[600px]">
                <iframe
                  src={activePdfUrl}
                  title="PDF Document Viewer"
                  className="w-full h-full"
                  style={{ border: "none" }}
                  aria-label="PDF Document"
                />
              </div>
            </div>
          )}
        </div>

        {/* 키워드 태그 */}
        <div className="flex flex-wrap gap-2 pb-6">
          {sop.keywords.map(kw => (
            <Link
              key={kw}
              href={`/?q=${encodeURIComponent(kw)}`}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-600 hover:border-blue-400"
            >
              #{kw}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
