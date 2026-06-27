// GLP 기록지 데이터 모델
// 설계 원칙: 서명 후 데이터 불변, 수정 시 이력 강제 기록 (GLP 규정)

export type FieldType = "text" | "number" | "date" | "handwriting" | "checkbox" | "select";

export interface RecordField {
  id: string;
  label: string;         // 예: "시험 개시 수온 (℃)"
  type: FieldType;
  required: boolean;
  unit?: string;         // 예: "℃", "mg/L"
  options?: string[];    // select 타입용 선택지
  min?: number;          // number 유효성 검사
  max?: number;
  placeholder?: string;
  rows?: number;         // text 멀티라인용
}

export interface RecordSection {
  id: string;
  title: string;
  fields: RecordField[];
}

export interface RecordFormTemplate {
  id: string;            // 예: "FORM-IAI-ECT-001-01"
  sopId: string;         // 연결된 SOP ID (예: "IAI-ECT-001-05")
  sopNumber: string;     // 예: "IAI-ECT-001"
  title: string;         // 예: "어류급성독성시험 기록지"
  version: string;
  sections: RecordSection[];
  requiresAuthorSignature: boolean;
  requiresReviewerSignature: boolean;
}

export interface SignatureRecord {
  userId: string;
  userName: string;
  signatureImage: string; // base64 PNG (canvas.toDataURL)
  signedAt: string;       // ISO 8601 — 저장 후 절대 수정 불가
  deviceInfo: string;
}

export interface EditHistoryItem {
  id: string;
  sectionId: string;
  fieldId: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  reason: string;         // 수정 사유 (GLP 필수, 필드 비워둘 수 없음)
  editedBy: string;
  editedByName: string;
  editedAt: string;       // ISO 8601
  signatureImage?: string; // 수정 시 즉시 서명 이미지 (base64 PNG, GLP 강화 무결성용)
}

export type RecordEntryStatus = "draft" | "author_signed" | "submitted_for_qa" | "complete";

export interface TypedTextItem {
  id: string;
  x: number;          // 0.0 ~ 1.0 가로 비율
  y: number;          // 0.0 ~ 1.0 세로 비율
  text: string;
}

export interface CanvasSignatureItem {
  id: string;
  x: number;          // 0.0 ~ 1.0 가로 비율 (센터)
  y: number;          // 0.0 ~ 1.0 세로 비율 (센터)
  signatureImage: string; // base64 PNG
  userName: string;
  userId: string;
  userRole: "author" | "reviewer";
  signedAt: string;
  labelPos?: "below" | "left"; // 이름/날짜 표기 위치 (서명별로 독립 저장)
}

export interface StrikeThroughItem {
  id: string;
  startX: number;     // 0.0 ~ 1.0
  startY: number;     // 0.0 ~ 1.0
  endX: number;       // 0.0 ~ 1.0
  endY: number;       // 0.0 ~ 1.0
  reason: string;           // 수정 사유
  newValue?: string;        // 변경 내용 (수정 후 올바른 값)
  correctionSignature?: string; // 수정자 서명 이미지 (base64 PNG)
  userName: string;
  userId: string;
  editedAt: string;
}

export interface RecordEntry {
  id: string;             // uuid v4
  formId: string;         // pdf 파일명 기반 고유 ID
  sopId: string;
  sopNumber: string;
  formTitle: string;      // 양식 타이틀
  pdfPath: string;        // 원본 pdf 파일 경로 (예: /pdfs/filename.pdf)
  pdfFilename: string;    // 원본 pdf 파일명
  status: RecordEntryStatus;
  categoryType: "test" | "qa" | "operational"; // 추가: 카테고리 분류
  studyNumber?: string;   // 추가: 시험번호 매핑 (시험/QA)
  equipmentId?: string;   // 추가: 기기 관리번호 매핑 (운영)
  locationId?: string;    // 추가: 시설 관리번호 매핑 (운영)
  employeeId?: string;    // 추가: 사번 매핑 (운영 - 인력/교육)
  scheduleYearMonth?: string; // 추가: 총괄표용 연월 매핑 (운영 - 일정)
  drawings: Record<number, string>; // 페이지 번호(1-based) -> 필기 base64 PNG 데이터
  authorSignature?: SignatureRecord;
  reviewerSignature?: SignatureRecord;
  sdConfirmSignature?: SignatureRecord; // 시험책임자 당일 확인 서명 (기록지별)
  editHistory: EditHistoryItem[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  typedTexts?: Record<number, TypedTextItem[]>;      // 페이지 번호 -> 텍스트 목록
  canvasSignatures?: Record<number, CanvasSignatureItem[]>; // 페이지 번호 -> 서명 목록
  strikeThroughs?: Record<number, StrikeThroughItem[]>; // 페이지 번호 -> 취선 목록
}


export type UserRole = "admin" | "tfm" | "sd" | "investigator" | "archivist" | "qap" | "pi";

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  department?: string;
  signingAs?: "author" | "reviewer"; // 현재 서명 모드 (기록지 작성 시 사용)
}

// 임시 사용자 세션 (로컬스토리지 기반)
export function getCurrentUser(): CurrentUser | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("glp-current-user");
  if (stored) return JSON.parse(stored);
  return null;
}

export function setCurrentUser(user: CurrentUser | null): void {
  if (user === null) {
    localStorage.removeItem("glp-current-user");
  } else {
    localStorage.setItem("glp-current-user", JSON.stringify(user));
  }
}

