import { setCurrentUser, getCurrentUser } from "./record-data";
import type { CurrentUser, UserRole } from "./record-data";

export interface UserCredential {
  id: string;
  name: string;
  role: UserRole;
  password: string;
  department: string;
  email: string;
  createdAt?: string;
  isDefault?: boolean; // 기본 제공 계정 여부
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "관리자",
  tfm: "운영책임자",
  sd: "시험책임자",
  investigator: "시험담당자",
  archivist: "자료보관책임자",
  qap: "QAP",
  pi: "분석책임자",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "관리자 (System Admin)",
  tfm: "운영책임자 (TFM)",
  sd: "시험책임자 (Study Director)",
  investigator: "시험담당자 (Investigator)",
  archivist: "자료보관책임자 (Archivist)",
  qap: "QAP (신뢰성보증원)",
  pi: "분석책임자 (Principal Investigator)",
};

// 초기 기본 계정 (최초 1회 localStorage로 복사됨)
export const DEFAULT_CREDENTIALS: UserCredential[] = [
  {
    id: "admin",
    name: "관리자",
    role: "admin",
    password: "admin1234",
    department: "시스템 관리",
    email: "admin@iai-glp.co.kr",
    isDefault: true,
  },
  {
    id: "sd",
    name: "홍길동",
    role: "sd",
    password: "sd1234",
    department: "환경독성시험부",
    email: "study_director@iai-glp.co.kr",
    isDefault: true,
  },
  {
    id: "investigator",
    name: "이몽룡",
    role: "investigator",
    password: "inv1234",
    department: "환경독성시험부",
    email: "investigator1@iai-glp.co.kr",
    isDefault: true,
  },
  {
    id: "archivist",
    name: "박보관",
    role: "archivist",
    password: "arch1234",
    department: "자료보관실",
    email: "archivist@iai-glp.co.kr",
    isDefault: true,
  },
  {
    id: "qap",
    name: "김철수",
    role: "qap",
    password: "qap1234",
    department: "신뢰성보증팀 (QAU)",
    email: "qau_auditor@iai-glp.co.kr",
    isDefault: true,
  },
  {
    id: "pi",
    name: "성춘향",
    role: "pi",
    password: "pi1234",
    department: "기기분석팀",
    email: "pi_analysis@iai-glp.co.kr",
    isDefault: true,
  },
];

const USERS_STORAGE_KEY = "glp-users";
const USERS_VERSION_KEY = "glp-users-version";
const CURRENT_VERSION = "2"; // admin 역할 추가 시 버전 올림

// localStorage에서 모든 사용자 불러오기 (없으면 기본값으로 초기화)
export function getAllUsers(): UserCredential[] {
  if (typeof window === "undefined") return DEFAULT_CREDENTIALS;
  // 버전이 다르면 기본값으로 재초기화 (스키마 변경 시 데이터 마이그레이션)
  const savedVersion = localStorage.getItem(USERS_VERSION_KEY);
  if (savedVersion !== CURRENT_VERSION) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_CREDENTIALS));
    localStorage.setItem(USERS_VERSION_KEY, CURRENT_VERSION);
    return DEFAULT_CREDENTIALS;
  }

  const stored = localStorage.getItem(USERS_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fall through to reinitialize
    }
  }
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_CREDENTIALS));
  return DEFAULT_CREDENTIALS;
}

export function saveAllUsers(users: UserCredential[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

export function addUser(user: Omit<UserCredential, "createdAt">): { ok: boolean; error?: string } {
  const users = getAllUsers();
  if (users.find(u => u.id === user.id)) {
    return { ok: false, error: "이미 존재하는 아이디입니다." };
  }
  if (!user.id.trim() || !user.name.trim() || !user.password.trim()) {
    return { ok: false, error: "아이디, 이름, 비밀번호는 필수입니다." };
  }
  users.push({ ...user, createdAt: new Date().toISOString() });
  saveAllUsers(users);
  return { ok: true };
}

export function updateUser(id: string, updates: Partial<Omit<UserCredential, "id">>): { ok: boolean; error?: string } {
  const users = getAllUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return { ok: false, error: "사용자를 찾을 수 없습니다." };
  users[idx] = { ...users[idx], ...updates };
  saveAllUsers(users);
  return { ok: true };
}

export function deleteUser(id: string): { ok: boolean; error?: string } {
  const users = getAllUsers();
  const target = users.find(u => u.id === id);
  if (!target) return { ok: false, error: "사용자를 찾을 수 없습니다." };
  saveAllUsers(users.filter(u => u.id !== id));
  return { ok: true };
}

export function getRoleLabel(role: UserRole): string {
  return ROLE_DESCRIPTIONS[role] || role;
}

export function login(id: string, password: string): CurrentUser | null {
  const users = getAllUsers();
  const user = users.find(u => u.id === id && u.password === password);
  if (user) {
    const sessionUser: CurrentUser = {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      department: user.department,
    };
    setCurrentUser(sessionUser);
    return sessionUser;
  }
  return null;
}

export function logout(): void {
  setCurrentUser(null);
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}
