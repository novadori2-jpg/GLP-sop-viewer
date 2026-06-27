import { getAllRecordEntries } from "./audit-logger";
import type { RecordEntry } from "./record-data";

export type StudyType = "F" | "D" | "A"; // 어류급성 | 물벼룩 | 조류
export type BinderType = "study" | "qa";
export type StudyStatus = "ongoing" | "sd_binder_signed" | "submitted_for_qa" | "complete";

export interface BinderForm {
  sopId: string;
  sopNumber: string;
  formTitle: string;
  pdfPath: string;
  quantity: number; // 해당 기록지 매수 (기본 1)
}

export interface BinderSignatureRecord {
  userId: string;
  userName: string;
  signatureImage: string;
  signedAt: string;
}

export interface StudyInfo {
  studyNumber: string;        // e.g. "F26001" or "QA F26001"
  binderType: BinderType;     // "study" | "qa"
  studyType?: StudyType;      // 시험 바인더만: "F" | "D" | "A"
  qaTargetStudyNumber?: string; // QA 바인더만: 대상 시험번호
  title: string;
  testSubstance: string;
  status: StudyStatus;
  startDate: string;
  endDate?: string;
  // 담당자
  sdId: string;
  directorName: string;       // SD 이름
  investigatorIds?: string[]; // 시험담당자 IDs (여러 명 가능, SD 포함 가능)
  investigatorNames?: string[];
  archivistId?: string;       // 자료보관책임자
  archivistName?: string;
  qapId: string;
  qaName: string;             // QAP 이름
  tfmId?: string;             // QA 바인더용: 운영책임자 ID
  tfmName?: string;           // QA 바인더용: 운영책임자 이름
  // 서식 목록
  requiredForms: BinderForm[];
  // 서명
  sdBinderSignature?: BinderSignatureRecord;  // SD 바인더 최종 서명
  tfmSignature?: BinderSignatureRecord;       // 운영책임자 서명 (QA 바인더)
  qaStatementSignature?: string;
  qaStatementDate?: string;
  qaStatementComments?: string;
  createdAt: string;
}

export interface EmployeeInfo {
  id: string;
  name: string;
  role: "author" | "reviewer" | "admin";
  email: string;
  department: string;
  cvPdfPath: string;
  cvTitle: string;
}

export const MOCK_STUDIES: StudyInfo[] = [
  {
    studyNumber: "F26001",
    binderType: "study",
    studyType: "F",
    title: "어류 급성독성시험 F26001",
    testSubstance: "IAI-2026A",
    status: "ongoing",
    startDate: "2026-06-01",
    sdId: "sd",
    directorName: "홍길동",
    qapId: "qap",
    qaName: "김철수",
    requiredForms: [
      { sopId: "IAI-ECT-001-05", sopNumber: "IAI-ECT-001", formTitle: "어류순화기록서 (ECT-001-F01-02)", pdfPath: "/pdfs/ECT-001-F01-02_어류순화기록서.pdf", quantity: 1 },
      { sopId: "IAI-ECT-001-05", sopNumber: "IAI-ECT-001", formTitle: "어체측정기록서 (ECT-001-F02-02)", pdfPath: "/pdfs/ECT-001-F02-02_어체측정기록서.pdf", quantity: 1 },
      { sopId: "IAI-ECT-001-05", sopNumber: "IAI-ECT-001", formTitle: "어류 급성독성시험기록서 (ECT-001-F03-02)", pdfPath: "/pdfs/ECT-001-F03-02_어류_급성독성시험기록서.pdf", quantity: 1 },
    ],
    createdAt: "2026-06-01T00:00:00.000Z",
  },
  {
    studyNumber: "D26001",
    binderType: "study",
    studyType: "D",
    title: "물벼룩 급성독성시험 D26001",
    testSubstance: "IAI-2026B",
    status: "submitted_for_qa",
    startDate: "2026-05-15",
    endDate: "2026-06-25",
    sdId: "sd",
    directorName: "홍길동",
    qapId: "qap",
    qaName: "김철수",
    requiredForms: [
      { sopId: "IAI-ECT-002-03", sopNumber: "IAI-ECT-002", formTitle: "물벼룩 급성독성시험기록서 (ECT-002-F01-02)", pdfPath: "/pdfs/ECT-002-F01-02_물벼룩_급성독성시험기록서.pdf", quantity: 1 },
      { sopId: "IAI-ECT-002-03", sopNumber: "IAI-ECT-002", formTitle: "물벼룩시험 환경측정기록서 (ECT-002-F02-02)", pdfPath: "/pdfs/ECT-002-F02-02_물벼룩시험_환경측정기록서.pdf", quantity: 1 },
    ],
    createdAt: "2026-05-15T00:00:00.000Z",
  },
];

export const MOCK_EMPLOYEES: EmployeeInfo[] = [
  {
    id: "user-1",
    name: "연구원",
    role: "author",
    email: "researcher1@iai-glp.co.kr",
    department: "환경독성시험부",
    cvPdfPath: "/pdfs/GMS-005-F02-00_개인이력서.pdf",
    cvTitle: "개인이력서 (GMS-005-F02-00)",
  },
  {
    id: "user-2",
    name: "QAU검토자",
    role: "reviewer",
    email: "qa_auditor@iai-glp.co.kr",
    department: "신뢰성보증팀 (QAU)",
    cvPdfPath: "/pdfs/GMS-005-F02-00_개인이력서.pdf",
    cvTitle: "개인이력서 (GMS-005-F02-00)",
  },
];

// ─── 시험번호 자동 생성 ─────────────────────────────────────────────────────
export const STUDY_TYPE_LABELS: Record<StudyType, string> = {
  F: "어류 급성독성시험 (F)",
  D: "물벼룩 급성독성시험 (D)",
  A: "조류 성장저해시험 (A)",
};

export function generateStudyNumber(type: StudyType, isQA: boolean = false): string {
  const year = new Date().getFullYear().toString().slice(2); // "26"
  const prefix = type + year; // e.g. "F26"
  const qaPrefix = "QA " + prefix;
  const targetPrefix = isQA ? qaPrefix : prefix;

  const all = getStudiesList();
  let maxSerial = 0;
  for (const s of all) {
    if (s.studyNumber.startsWith(targetPrefix)) {
      const serial = parseInt(s.studyNumber.slice(targetPrefix.length), 10);
      if (!isNaN(serial) && serial > maxSerial) maxSerial = serial;
    }
  }
  return targetPrefix + String(maxSerial + 1).padStart(3, "0");
}

// 이력 로컬스토리지 보존용 키
const STORAGE_KEY_STUDIES = "glp-studies-list";

export function getStudiesList(): StudyInfo[] {
  if (typeof window === "undefined") return MOCK_STUDIES;
  const stored = localStorage.getItem(STORAGE_KEY_STUDIES);
  if (stored) {
    try {
      const parsed: StudyInfo[] = JSON.parse(stored);
      // 구버전 데이터(binderType 없음) 마이그레이션
      const migrated = parsed.map(s => ({
        ...s,
        binderType: s.binderType ?? "study",
        sdId: s.sdId ?? "sd",
        qapId: s.qapId ?? "qap",
        createdAt: s.createdAt ?? s.startDate + "T00:00:00.000Z",
      } as StudyInfo));
      return migrated;
    } catch { /* fall through */ }
  }
  localStorage.setItem(STORAGE_KEY_STUDIES, JSON.stringify(MOCK_STUDIES));
  return MOCK_STUDIES;
}

export function addStudy(study: StudyInfo): void {
  const list = getStudiesList();
  list.unshift(study);
  saveStudiesList(list);
}

export function deleteStudy(studyNumber: string): void {
  const list = getStudiesList().filter(s => s.studyNumber !== studyNumber);
  saveStudiesList(list);
}

export function saveStudiesList(studies: StudyInfo[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_STUDIES, JSON.stringify(studies));
}

// 특정 시험번호에 바인딩된 모든 작성 기록지 조회
export async function getStudyRecords(studyNumber: string): Promise<RecordEntry[]> {
  const all = await getAllRecordEntries();
  return all.filter(e => e.studyNumber === studyNumber);
}
