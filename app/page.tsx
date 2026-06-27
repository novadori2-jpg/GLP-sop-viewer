"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SOP_DATA, CATEGORIES, searchSOPs, groupByCategory } from "@/lib/sop-data";
import SearchBar from "@/components/SearchBar";
import SOPCard from "@/components/SOPCard";
import { getCurrentUser, setCurrentUser } from "@/lib/record-data";
import type { CurrentUser } from "@/lib/record-data";
import dynamic from "next/dynamic";
import type { StudyInfo } from "@/lib/study-data";
import { getPermissions } from "@/lib/permissions";


// QR 스캐너는 브라우저 전용이므로 동적 임포트
const QRScanner = dynamic(() => import("@/components/QRScanner"), { ssr: false });

function SOPListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [showQR, setShowQR] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [currentUser, setLocalUser] = useState<CurrentUser | null>(null);
  const [activeTab, setActiveTab] = useState<"sop" | "binder">("sop");
  const [studies, setStudies] = useState<StudyInfo[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    setIsOffline(!navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 사용자 세션 체크 및 리다이렉트
    const user = getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setLocalUser(user);
    fetch("/api/binders").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setStudies(data);
    });

    const syncUser = () => {
      const u = getCurrentUser();
      if (!u) {
        router.push("/login");
      } else {
        setLocalUser(u);
      }
    };
    window.addEventListener("storage", syncUser);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("storage", syncUser);
    };
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    const { logout } = require("@/lib/auth");
    logout();
    router.push("/login");
  };

  const results = query ? searchSOPs(query) : SOP_DATA.filter(s => s.status === "effective");
  const grouped = groupByCategory(results);
  const totalCount = SOP_DATA.filter(s => s.status === "effective").length;

  if (!currentUser) {
    return <div className="flex items-center justify-center min-h-screen text-slate-500">인증 확인 중...</div>;
  }

  const { getRoleLabel } = require("@/lib/auth");

  return (
    <div className="min-h-screen bg-slate-50">
      {isOffline && (
        <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium">
          📡 오프라인 상태 — 캐시된 SOP만 열람 가능합니다
        </div>
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {query && (
                <Link
                  href="/"
                  className="flex items-center justify-center p-2 rounded-xl bg-slate-100 text-slate-700 active:bg-slate-200"
                  aria-label="홈으로"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
              )}
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">GLP SOP</h1>
                <p className="text-xs text-slate-500">I.A.I · 총 {totalCount}건</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right text-slate-900 pr-1">
                <p className="text-xs font-bold">{currentUser.name} 님</p>
                <p className="text-[10px] text-slate-400 font-semibold">{getRoleLabel(currentUser.role)}</p>
              </div>
              {currentUser.role === "admin" && (
                <Link
                  href="/admin/users"
                  className="px-3 py-2 bg-purple-100 border border-purple-200 hover:bg-purple-200 text-purple-700 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center"
                  title="사용자 관리"
                >
                  👥 관리
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="px-3 py-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                title="로그아웃"
              >
                로그아웃
              </button>

              <button
                onClick={() => setShowQR(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-sm active:bg-blue-700 cursor-pointer"
                aria-label="QR 코드 스캔"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span className="hidden sm:inline">QR 스캔</span>
              </button>
            </div>
          </div>
          <SearchBar defaultValue={query} />
        </div>
      </header>


      <main className="max-w-2xl mx-auto px-4 py-4">
        {/* Navigation Tabs */}
        {(() => {
          const perms = getPermissions(currentUser.role);
          return (
            <div className="flex bg-slate-200/60 p-1 rounded-xl gap-1 mb-6 shadow-inner">
              <button
                onClick={() => setActiveTab("sop")}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === "sop" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                📄 SOP 조회
              </button>
              {perms.canViewStudyBinder && (
                <button
                  onClick={() => setActiveTab("binder")}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === "binder" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  📂 시험/QA 바인더
                </button>
              )}
              {perms.canAccessOperations && (
                <Link
                  href="/operations"
                  className="flex-1 py-2 text-center text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white/40 flex items-center justify-center transition-all"
                >
                  🛠️ 기관 운영 관리
                </Link>
              )}
            </div>
          );
        })()}

        {activeTab === "sop" ? (
          <>
            {query && (
              <div className="mb-4">
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-blue-600">"{query}"</span> 검색 결과{" "}
                  <span className="font-bold">{results.length}건</span>
                </p>
              </div>
            )}

            {results.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🔍</div>
                <p className="text-lg font-semibold text-slate-700">검색 결과가 없습니다</p>
                <p className="text-sm text-slate-500 mt-1">다른 키워드로 검색해 보세요</p>
              </div>
            ) : (
              <>
                {!query && (
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {Object.entries(CATEGORIES).map(([code, cat]) => (
                      <Link
                        key={code}
                        href={`/?q=${code}`}
                        className="inline-flex flex-col items-center justify-center py-2 px-1 bg-white border border-slate-200 rounded-xl text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
                      >
                        <span className="text-xs font-bold text-blue-600">{code}</span>
                        <span className="text-xs text-slate-600 mt-0.5 leading-tight">{cat.name}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {query ? (
                  <div className="grid gap-3">
                    {results.map(sop => <SOPCard key={sop.id} sop={sop} />)}
                  </div>
                ) : (
                  Object.entries(CATEGORIES).map(([code, cat]) => {
                    const sops = grouped[code];
                    if (!sops?.length) return null;
                    return (
                      <section key={code} className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <h2 className="text-lg font-bold text-slate-800">{cat.name}</h2>
                          <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                            {sops.length}건
                          </span>
                          <span className="text-xs text-slate-400">{cat.description}</span>
                        </div>
                        <div className="grid gap-3">
                          {sops.map(sop => <SOPCard key={sop.id} sop={sop} />)}
                        </div>
                      </section>
                    );
                  })
                )}
              </>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">🧪 GLP 바인더 목록</h2>
              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                총 {studies.length}건
              </span>
            </div>
            {(currentUser.role === "sd" || currentUser.role === "qap" || currentUser.role === "admin") && (
              <Link
                href="/binder/new"
                className="flex items-center gap-3 px-4 py-3.5 bg-blue-600 rounded-xl text-sm font-bold text-white shadow-sm"
              >
                <span className="text-lg">+</span>
                <span>
                  {currentUser.role === "sd" ? "새 시험 바인더 만들기" :
                   currentUser.role === "qap" ? "새 QA 바인더 만들기" : "새 바인더 만들기"}
                </span>
              </Link>
            )}
            <Link
              href="/records"
              className="flex items-center gap-2 px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700"
            >
              <span>📋</span>
              <span>시험번호별 기록지 전체 보기</span>
              <svg className="w-4 h-4 text-slate-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <div className="grid gap-3">
              {studies.filter(study =>
                study.binderType !== "qa" || ["qap", "tfm", "admin"].includes(currentUser?.role ?? "")
              ).map((study) => (
                <div key={study.studyNumber} className="relative">
                  <Link
                    href={study.binderType === "qa"
                      ? `/binder/qa/${encodeURIComponent(study.studyNumber)}`
                      : `/study/${encodeURIComponent(study.studyNumber)}`}
                    className="block p-5 bg-white border border-slate-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50/10 transition-all shadow-sm pr-12"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${
                          study.binderType === "qa" ? "bg-indigo-100 text-indigo-700" : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}>
                          {study.binderType === "qa" ? "QA" : "시험"}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-800 truncate">{study.studyNumber}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
                        study.status === "complete" ? "bg-green-100 text-green-700" :
                        study.status === "submitted_for_qa" ? "bg-amber-100 text-amber-700" :
                        study.status === "sd_binder_signed" ? "bg-blue-100 text-blue-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {study.status === "complete" ? "봉인완료" :
                         study.status === "submitted_for_qa" ? "QA검토대기" :
                         study.status === "sd_binder_signed" ? "SD서명완료" : "진행중"}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 mt-2 leading-snug">{study.title}</h3>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-3 border-t border-slate-100 pt-2">
                      <span>SD: {study.directorName}</span>
                      <span>{study.startDate}</span>
                    </div>
                  </Link>
                  {/* 삭제 버튼 */}
                  <button
                    onClick={() => setDeleteConfirm(study.studyNumber)}
                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>

            {/* 삭제 확인 모달 */}
            {deleteConfirm && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 max-w-xs w-full space-y-4 shadow-xl">
                  <h3 className="text-base font-bold text-slate-900">바인더 삭제</h3>
                  <p className="text-sm text-slate-600">
                    <span className="font-bold text-red-600">{deleteConfirm}</span> 바인더를 삭제하시겠습니까?<br/>
                    <span className="text-xs text-slate-400 mt-1 block">삭제된 바인더는 복구할 수 없습니다.</span>
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setDeleteConfirm(null)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 cursor-pointer">
                      취소
                    </button>
                    <button onClick={async () => {
                      await fetch(`/api/binders/${encodeURIComponent(deleteConfirm)}`, { method: "DELETE" });
                      setStudies(prev => prev.filter(s => s.studyNumber !== deleteConfirm));
                      setDeleteConfirm(null);
                    }}
                      className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold cursor-pointer">
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>


      {showQR && <QRScanner onClose={() => setShowQR(false)} />}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-slate-500">로딩 중...</div>}>
      <SOPListContent />
    </Suspense>
  );
}
