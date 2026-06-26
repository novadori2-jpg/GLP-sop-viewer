"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login, getRoleLabel, getAllUsers } from "@/lib/auth";
import { getCurrentUser } from "@/lib/record-data";

export default function LoginPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) router.push("/");
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !password.trim()) {
      setError("아이디와 비밀번호를 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError("");
    setTimeout(() => {
      const sessionUser = login(id.trim(), password.trim());
      setLoading(false);
      if (sessionUser) {
        router.push("/");
      } else {
        setError("아이디 또는 비밀번호가 잘못되었습니다.");
      }
    }, 400);
  };

  const handleQuickLogin = (quickId: string, quickPw: string) => {
    setLoading(true);
    setError("");
    setTimeout(() => {
      const sessionUser = login(quickId, quickPw);
      setLoading(false);
      if (sessionUser) router.push("/");
    }, 200);
  };

  const users = getAllUsers();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 text-white animate-in fade-in zoom-in duration-300">

        {/* Title */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 text-white text-2xl font-bold shadow-lg mb-2">
            🧬
          </div>
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-blue-400 via-indigo-200 to-white bg-clip-text text-transparent">
            GLP SOP 조회 및 기록지 시스템
          </h1>
          <p className="text-xs text-slate-400">
            Good Laboratory Practice (우수실험실운영기준) 통합 관리 포털
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">아이디</label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="아이디 입력"
              autoComplete="username"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              autoComplete="current-password"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 font-semibold bg-red-950/30 border border-red-900/50 rounded-xl px-4 py-2.5">
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-900/30 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center"
          >
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            ) : (
              "로그인"
            )}
          </button>
        </form>

        {/* Quick login toggle */}
        <button
          type="button"
          onClick={() => setShowQuick(v => !v)}
          className="w-full mt-5 text-[10px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer flex items-center justify-center gap-1"
        >
          <span>{showQuick ? "▲" : "▼"}</span>
          <span>간편 시뮬레이션 로그인 {showQuick ? "숨기기" : "보기"}</span>
        </button>

        {showQuick && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {users.map((cred) => (
              <button
                key={cred.id}
                onClick={() => handleQuickLogin(cred.id, cred.password)}
                disabled={loading}
                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left hover:border-blue-500/50 transition-all cursor-pointer flex flex-col group"
              >
                <span className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors">
                  {cred.name}
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5">
                  {getRoleLabel(cred.role)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
