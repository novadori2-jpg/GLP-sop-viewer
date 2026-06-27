import type { UserRole } from "./record-data";

// SOP 카테고리별 업무 분류
export const TEST_CATEGORIES = ["ECT", "TIP", "TIA", "ANC", "TSF", "EQM"];
export const QA_CATEGORIES = ["QAU"];
export const ARCHIVE_CATEGORIES = ["GMS"];
export const ANALYSIS_CATEGORIES = ["TIA"];

export interface RolePermissions {
  canViewAllSOPs: boolean;             // 전체 SOP 조회
  canAccessOperations: boolean;        // 기관 운영 관리 페이지
  canViewStudyBinder: boolean;         // 시험/QA 바인더 탭
  canCreateRecord: string[];           // 기록지 작성 가능 카테고리
  canSignAsAuthor: string[] | "all";   // 작성자 서명 가능 카테고리
  canSignAsReviewer: string[] | "all"; // 확인자 서명 가능 카테고리
  canReviewStudyBinder: boolean;       // 시험 바인더 최종 검토 서명 (QAP)
}

export const PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canViewAllSOPs: true,
    canAccessOperations: false,
    canViewStudyBinder: false,
    canCreateRecord: [],
    canSignAsAuthor: [],
    canSignAsReviewer: [],
    canReviewStudyBinder: false,
  },
  tfm: {
    // 운영책임자: 전체 조회, 기관 운영 관리
    canViewAllSOPs: true,
    canAccessOperations: true,
    canViewStudyBinder: false,
    canCreateRecord: [],
    canSignAsAuthor: [],
    canSignAsReviewer: [],
    canReviewStudyBinder: false,
  },
  sd: {
    // 시험책임자: 시험 기록지 작성자 및 확인자 서명 모두 가능
    canViewAllSOPs: true,
    canAccessOperations: false,
    canViewStudyBinder: true,
    canCreateRecord: [...TEST_CATEGORIES],
    canSignAsAuthor: [...TEST_CATEGORIES],
    canSignAsReviewer: [...TEST_CATEGORIES],
    canReviewStudyBinder: false,
  },
  investigator: {
    // 시험담당자: 시험 기록지 작성 및 작성자 서명만 가능
    canViewAllSOPs: true,
    canAccessOperations: false,
    canViewStudyBinder: true,
    canCreateRecord: [...TEST_CATEGORIES],
    canSignAsAuthor: [...TEST_CATEGORIES],
    canSignAsReviewer: [],
    canReviewStudyBinder: false,
  },
  archivist: {
    // 자료보관책임자: 자료 관련 SOP 기록지 작성 및 서명
    canViewAllSOPs: true,
    canAccessOperations: false,
    canViewStudyBinder: false,
    canCreateRecord: [...ARCHIVE_CATEGORIES],
    canSignAsAuthor: [...ARCHIVE_CATEGORIES],
    canSignAsReviewer: [...ARCHIVE_CATEGORIES],
    canReviewStudyBinder: false,
  },
  qap: {
    // QAP: QA 기록지 작성/서명, 전체 자료 열람, 바인더 검토 서명
    canViewAllSOPs: true,
    canAccessOperations: false,
    canViewStudyBinder: true,
    canCreateRecord: [...QA_CATEGORIES],
    canSignAsAuthor: [...QA_CATEGORIES],
    canSignAsReviewer: "all", // 전체 기록지 확인자 서명 가능
    canReviewStudyBinder: true,
  },
  pi: {
    // 분석책임자: 분석 관련 SOP 기록지 작성 및 서명
    canViewAllSOPs: true,
    canAccessOperations: false,
    canViewStudyBinder: false,
    canCreateRecord: [...ANALYSIS_CATEGORIES],
    canSignAsAuthor: [...ANALYSIS_CATEGORIES],
    canSignAsReviewer: [...ANALYSIS_CATEGORIES],
    canReviewStudyBinder: false,
  },
  formulator: {
    // 조제책임자: 시험 관련 기록지 작성 및 서명
    canViewAllSOPs: true,
    canAccessOperations: false,
    canViewStudyBinder: true,
    canCreateRecord: [...TEST_CATEGORIES],
    canSignAsAuthor: [...TEST_CATEGORIES],
    canSignAsReviewer: [...TEST_CATEGORIES],
    canReviewStudyBinder: false,
  },
};

export function getPermissions(role: UserRole): RolePermissions {
  return PERMISSIONS[role];
}

export function canCreateRecord(role: UserRole, category?: string): boolean {
  const cats = PERMISSIONS[role].canCreateRecord;
  if (cats.length === 0) return false;
  if (!category) return cats.length > 0;
  return cats.includes(category.toUpperCase());
}

export function canSignAsAuthor(role: UserRole, category?: string): boolean {
  const perm = PERMISSIONS[role].canSignAsAuthor;
  if (perm === "all") return true;
  if (perm.length === 0) return false;
  if (!category) return perm.length > 0;
  return perm.includes(category.toUpperCase());
}

export function canSignAsReviewer(role: UserRole, category?: string): boolean {
  const perm = PERMISSIONS[role].canSignAsReviewer;
  if (perm === "all") return true;
  if (perm.length === 0) return false;
  if (!category) return perm.length > 0;
  return perm.includes(category.toUpperCase());
}

export function canReviewStudyBinder(role: UserRole): boolean {
  return PERMISSIONS[role].canReviewStudyBinder;
}
