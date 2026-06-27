"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/auth";
import { getCurrentUser } from "@/lib/record-data";
import type { UserRole } from "@/lib/record-data";

const ALL_ROLES: UserRole[] = ["admin", "tfm", "sd", "investigator", "archivist", "qap", "pi"];

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  tfm: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  sd: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  investigator: "bg-green-500/20 text-green-300 border-green-500/30",
  archivist: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  qap: "bg-red-500/20 text-red-300 border-red-500/30",
  pi: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  formulator: "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

interface DBUser {
  user_id: string;
  name: string;
  role: UserRole;
  email?: string;
  department?: string;
}

interface FormState {
  id: string;
  name: string;
  password: string;
  role: UserRole;
  department: string;
  email: string;
}

const emptyForm = (): FormState => ({
  id: "", name: "", password: "", role: "investigator", department: "", email: "",
});

export default function UserManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<DBUser[]>([]);
  const [mode, setMode] = useState<"list" | "add" | "edit">("list");
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/"); return; }
    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  };

  const handleAdd = () => { setError(""); setSuccess(""); setForm(emptyForm()); setMode("add"); };

  const handleEdit = (user: DBUser) => {
    setError(""); setSuccess("");
    setForm({ id: user.user_id, name: user.name, password: "", role: user.role, department: user.department || "", email: user.email || "" });
    setEditingId(user.user_id);
    setMode("edit");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "add") {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: form.id, name: form.name, password: form.password, role: form.role, email: form.email, department: form.department }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "오류가 발생했습니다."); return; }
        setSuccess(`'${form.name}' 계정이 추가되었습니다.`);
      } else if (mode === "edit" && editingId) {
        const body: Record<string, unknown> = { name: form.name, role: form.role, email: form.email, department: form.department };
        if (form.password) body.password = form.password;
        const res = await fetch(`/api/users/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "오류가 발생했습니다."); return; }
        setSuccess(`'${form.name}' 계정이 수정되었습니다.`);
      }
      await fetchUsers();
      setMode("list");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "삭제 실패"); return; }
    setDeleteConfirm(null);
    setSuccess("계정이 삭제되었습니다.");
    await fetchUsers();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="bg-slate-800/80 border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => mode !== "list" ? setMode("list") : router.push("/")} className="p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer">←</button>
        <div>
          <h1 className="text-sm font-bold">사용자 계정 관리</h1>
          <p className="text-[10px] text-slate-400">관리자 전용</p>
        </div>
        {mode === "list" && (
          <button onClick={handleAdd} className="ml-auto bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer">
            + 계정 추가
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {success && (
          <div className="bg-green-900/30 border border-green-700/50 text-green-300 text-xs rounded-xl px-4 py-3 flex items-center gap-2">
            ✓ {success}
            <button onClick={() => setSuccess("")} className="ml-auto text-green-500 cursor-pointer">✕</button>
          </div>
        )}
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 text-red-300 text-xs rounded-xl px-4 py-3">⚠️ {error}</div>
        )}

        {(mode === "add" || mode === "edit") && (
          <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-5">
            <h2 className="text-sm font-bold mb-4">{mode === "add" ? "새 계정 추가" : "계정 수정"}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">아이디 *</label>
                  <input type="text" value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} disabled={mode === "edit"} placeholder="영문/숫자" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">이름 *</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="실명" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                  비밀번호 {mode === "edit" ? "(변경 시에만 입력)" : "*"}
                </label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={mode === "edit" ? "변경하지 않으면 빈칸" : "비밀번호"} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer">{showPw ? "숨김" : "표시"}</button>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold block mb-2">역할 *</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_ROLES.map(role => (
                    <button key={role} type="button" onClick={() => setForm(f => ({ ...f, role }))} className={`text-left px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${form.role === role ? "bg-blue-600 border-blue-500 text-white" : "bg-white/5 border-white/10 text-slate-300 hover:border-white/30"}`}>
                      <div className="font-bold">{ROLE_LABELS[role]}</div>
                      <div className="text-[9px] opacity-70 mt-0.5">{ROLE_DESCRIPTIONS[role].split("(")[1]?.replace(")", "") || ""}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">부서</label>
                  <input type="text" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="소속 부서" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">이메일</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="이메일 주소" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setMode("list"); setError(""); }} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-semibold transition-colors cursor-pointer">취소</button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-bold transition-colors cursor-pointer disabled:opacity-50">
                  {loading ? "처리 중..." : mode === "add" ? "추가" : "저장"}
                </button>
              </div>
            </form>
          </div>
        )}

        {mode === "list" && (
          <div className="space-y-2">
            <p className="text-[10px] text-slate-500 px-1">총 {users.length}개 계정</p>
            {users.map(user => (
              <div key={user.user_id} className="bg-slate-800/60 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold">{user.name}</span>
                    <span className="text-[10px] text-slate-500">@{user.user_id}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ROLE_COLORS[user.role]}`}>{ROLE_LABELS[user.role]}</span>
                  </div>
                  {user.department && <p className="text-[11px] text-slate-400 mt-0.5">{user.department}</p>}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => handleEdit(user)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer">수정</button>
                  {deleteConfirm === user.user_id ? (
                    <div className="flex gap-1">
                      <button onClick={() => handleDelete(user.user_id)} className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer">삭제</button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[11px] cursor-pointer">취소</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(user.user_id)} className="px-3 py-1.5 bg-white/5 hover:bg-red-900/30 border border-white/10 hover:border-red-700/50 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-red-400 transition-colors cursor-pointer">삭제</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
