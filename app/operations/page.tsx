"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import type { RecordEntry, CurrentUser } from "@/lib/record-data";
import { getCurrentUser, setCurrentUser } from "@/lib/record-data";
import { getAllRecordEntries } from "@/lib/audit-logger";
import { MOCK_EMPLOYEES } from "@/lib/study-data";
import Link from "next/link";

interface AssetInfo {
  id: string;
  name: string;
  sopId: string;
  sopNumber: string;
  pdfPath: string;
  description: string;
}

const MOCK_ASSETS: AssetInfo[] = [
  {
    id: "BAL-001",
    name: "전자저울 (일상점검 및 교정)",
    sopId: "IAI-EQM-004-04",
    sopNumber: "IAI-EQM-004",
    pdfPath: "/pdfs/EQM-004-F02-02_전자저울_내부점검표.pdf",
    description: "E2/F1 표준분동을 활용한 전자저울 일상점검 및 교정",
  },
  {
    id: "PIP-001",
    name: "마이크로피펫 (중량법 교정)",
    sopId: "IAI-EQM-019-04",
    sopNumber: "IAI-EQM-019",
    pdfPath: "/pdfs/EQM-019-F01-03_피펫내부점검표.pdf",
    description: "증류수 중량법을 활용한 0.1~1000uL 마이크로피펫 교정 기록",
  },
  {
    id: "ROOM-102",
    name: "제1사육실 (온습도 관리)",
    sopId: "IAI-GMS-015_03",
    sopNumber: "IAI-GMS-015",
    pdfPath: "/pdfs/GMS-013-F08-00_자료보관실_환경기록서.pdf",
    description: "사육구역 환경 모니터링 기록 (온습도 기록계 점검)",
  },
];

function OperationsContent() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser>({ id: "user-1", name: "연구원", role: "author" });
  const [activeTab, setActiveTab] = useState<"assets" | "hr" | "schedule">("assets");
  const [records, setRecords] = useState<RecordEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // HR 관련 서식 목록
  const hrForms = [
    { title: "📄 개인이력서 (CV)", pdfPath: "/pdfs/GMS-005-F02-00_개인이력서.pdf", sopId: "IAI-GMS-005-01", sopNumber: "IAI-GMS-005" },
    { title: "✍️ 서명등록대장", pdfPath: "/pdfs/GMS-005-F01-00_서명등록대장.pdf", sopId: "IAI-GMS-005-01", sopNumber: "IAI-GMS-005" },
    { title: "🎓 교육보고서", pdfPath: "/pdfs/GMS-004-F03-02_교육보고서.pdf", sopId: "IAI-GMS-004-04", sopNumber: "IAI-GMS-004" },
  ];

  // 일정 관련 서식 목록
  const scheduleForms = [
    { title: "📅 연간교육훈련계획서", pdfPath: "/pdfs/GMS-004-F01-02_연간교육훈련계획서.pdf", sopId: "IAI-GMS-004-04", sopNumber: "IAI-GMS-004" },
    { title: "📋 시험 접수대장", pdfPath: "/pdfs/GMS-006-F02-02_시험_접수대장.pdf", sopId: "IAI-GMS-006-05", sopNumber: "IAI-GMS-006" },
  ];

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.push("/login"); return; }
    if (u.role !== "tfm") { router.push("/"); return; } // TFM 전용
    setUser(u);
    const syncUser = () => {
      const updated = getCurrentUser();
      if (!updated) router.push("/login");
      else setUser(updated);
    };
    window.addEventListener("storage", syncUser);
    loadRecords();
    return () => window.removeEventListener("storage", syncUser);
  }, [router]);

  const loadRecords = async () => {
    setLoading(true);
    const all = await getAllRecordEntries();
    setRecords(all.filter(e => e.categoryType === "operational"));
    setLoading(false);
  };

  const toggleUser = () => {
    const nextUser: CurrentUser = user.role === "author"
      ? { id: "user-2", name: "QAU검토자", role: "reviewer" }
      : { id: "user-1", name: "연구원", role: "author" };
    setCurrentUser(nextUser);
    setUser(nextUser);
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-100 text-slate-700 active:bg-slate-200 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-900">🛠️ 기관 운영 관리</h1>
              <p className="text-[10px] text-slate-400">자산 · 시설 · 인원 · 일정 비시험 SOP 기록부</p>
            </div>
          </div>

          <button
            onClick={toggleUser}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
              user.role === "author"
                ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
            }`}
            title="계정 역할 전환"
          >
            <span>👤 {user.role === "author" ? "연구원" : "검토자"}</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex bg-slate-200 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab("assets")}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "assets" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            📟 자산/시설 관리
          </button>
          <button
            onClick={() => setActiveTab("hr")}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "hr" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            👤 인적 자원 자격 (HR)
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "schedule" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            📅 운영/일정 총괄
          </button>
        </div>

        {/* Tab Content 1: Assets & Facilities */}
        {activeTab === "assets" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-700">📟 주요 자산/시설 일지 작성 서식</h2>
              <div className="divide-y divide-slate-100">
                {MOCK_ASSETS.map((asset) => {
                  // 해당 자산의 최근 작성 로그 필터링
                  const assetLogs = records.filter(r => r.equipmentId === asset.id);

                  return (
                    <div key={asset.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">
                            {asset.id}
                          </span>
                          <span className="text-sm font-bold text-slate-800">{asset.name}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{asset.description}</p>
                        {assetLogs.length > 0 && (
                          <p className="text-[10px] text-green-600 mt-1 font-semibold">
                            ✓ 누적 일지 {assetLogs.length}건 작성됨
                          </p>
                        )}
                      </div>

                      <div>
                        {user.role === "author" ? (
                          <Link
                            href={`/record/new?pdf=${encodeURIComponent(asset.pdfPath)}&sopId=${asset.sopId}&equipmentId=${asset.id}&categoryType=operational`}
                            className="inline-flex items-center justify-center text-xs bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm hover:bg-blue-700"
                          >
                            📝 점검 기록
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">읽기 전용</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 2: Personnel Qualifications & CVs */}
        {activeTab === "hr" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-700">👤 연구원 명단 및 개인이력서/교육일지 매핑</h2>
              <div className="divide-y divide-slate-100">
                {MOCK_EMPLOYEES.map((emp) => {
                  const empRecords = records.filter(r => r.employeeId === emp.id);

                  return (
                    <div key={emp.id} className="py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{emp.name} ({emp.role === "author" ? "연구원" : "QA원"})</p>
                          <p className="text-xs text-slate-400 mt-0.5">{emp.department} · {emp.email}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">사번: {emp.id}</span>
                      </div>

                      {/* 이 직원에 대한 개별 기록 작성 링크들 */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-2">
                        {hrForms.map((form) => {
                          const specificRec = empRecords.find(r => r.sopNumber === form.sopNumber);
                          return (
                            <div key={form.title} className="flex justify-between items-center text-xs bg-white border border-slate-200 p-2 rounded-lg">
                              <span className="font-semibold text-slate-700">{form.title}</span>
                              {specificRec ? (
                                <Link
                                  href={`/record/entry/${specificRec.id}`}
                                  className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded font-bold"
                                >
                                  조회
                                </Link>
                              ) : user.role === "author" ? (
                                <Link
                                  href={`/record/new?pdf=${encodeURIComponent(form.pdfPath)}&sopId=${form.sopId}&employeeId=${emp.id}&categoryType=operational`}
                                  className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded font-bold hover:bg-blue-100"
                                >
                                  작성
                                </Link>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium">미등록</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 3: Scheduling / Master Schedule */}
        {activeTab === "schedule" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-700">📅 2026년 월별 시험일정총괄표 관리</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {["2026-05", "2026-06", "2026-07", "2026-08"].map((ym) => {
                  const scheduleRec = records.find(r => r.scheduleYearMonth === ym);
                  const isCurrent = ym === "2026-06";

                  return (
                    <div
                      key={ym}
                      className={`p-3 border rounded-xl flex flex-col justify-between h-24 transition-all ${
                        isCurrent ? "border-blue-400 bg-blue-50/20" : "border-slate-200"
                      }`}
                    >
                      <div>
                        <p className="font-bold text-slate-800">{ym.replace("-", "년 ")}월</p>
                        {isCurrent && <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded mt-1 inline-block">이번 달</span>}
                      </div>

                      <div>
                        {scheduleRec ? (
                          <Link
                            href={`/record/entry/${scheduleRec.id}`}
                            className="text-[10px] text-green-600 font-bold hover:underline block text-center border border-green-200 rounded bg-green-50 py-0.5"
                          >
                            ✓ 기록 열람
                          </Link>
                        ) : user.role === "author" ? (
                          <Link
                            href={`/record/new?pdf=${encodeURIComponent(scheduleForms[0].pdfPath)}&sopId=${scheduleForms[0].sopId}&scheduleYearMonth=${ym}&categoryType=operational`}
                            className="text-[10px] text-blue-600 font-bold hover:underline block text-center border border-blue-200 rounded bg-blue-50 py-0.5"
                          >
                            📝 총괄표 작성
                          </Link>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium block text-center">미작성</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Operational Records List */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">📋 작성된 운영 SOP 기록지 히스토리</h2>
            <button
              onClick={loadRecords}
              className="text-xs text-blue-600 font-semibold cursor-pointer"
            >
              🔄 새로고침
            </button>
          </div>

          {loading ? (
            <div className="text-center py-4 text-xs text-slate-400">데이터를 가져오는 중...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <p className="text-xs text-slate-400">아직 등록된 운영 기록지 로그가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((rec) => (
                <Link
                  key={rec.id}
                  href={`/record/entry/${rec.id}`}
                  className="block p-3 border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/20 transition-all text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-[10px] text-slate-400">{rec.sopNumber}</p>
                      <p className="font-bold text-slate-800 mt-0.5">{rec.formTitle}</p>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                      {rec.equipmentId ? `📟 기기:${rec.equipmentId}` :
                       rec.employeeId ? `👤 사원:${rec.employeeId}` :
                       rec.scheduleYearMonth ? `📅 일정:${rec.scheduleYearMonth}` : "운영"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2">
                    <span>기록자: {rec.createdByName}</span>
                    <span>수정일: {new Date(rec.updatedAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

export default function OperationsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-500">로딩 중...</div>}>
      <OperationsContent />
    </Suspense>
  );
}
