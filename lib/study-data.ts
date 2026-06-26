import { getAllRecordEntries } from "./audit-logger";
import type { RecordEntry } from "./record-data";

export interface StudyInfo {
  studyNumber: string;
  title: string;
  testSubstance: string;
  status: "ongoing" | "submitted_for_qa" | "complete";
  startDate: string;
  endDate?: string;
  directorName: string;
  qaName: string;
  requiredForms: {
    sopId: string;
    sopNumber: string;
    formTitle: string;
    pdfPath: string;
  }[];
  qaStatementSignature?: string; // QA 최종 봉인 서명 이미지
  qaStatementDate?: string;      // QA 최종 봉인 일자
  qaStatementComments?: string;  // QA 최종 검토 코멘트
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
    studyNumber: "ECT-2026-001",
    title: "제브라피쉬를 이용한 시험물질 IAI-2026A의 어류 급성독성시험",
    testSubstance: "IAI-2026A",
    status: "ongoing",
    startDate: "2026-06-01",
    directorName: "연구원 (작성자)",
    qaName: "QAU검토자 (확인자)",
    requiredForms: [
      {
        sopId: "IAI-ECT-001-05",
        sopNumber: "IAI-ECT-001",
        formTitle: "어류순화기록서 (ECT-001-F01-02)",
        pdfPath: "/pdfs/ECT-001-F01-02_어류순화기록서.pdf",
      },
      {
        sopId: "IAI-ECT-001-05",
        sopNumber: "IAI-ECT-001",
        formTitle: "어체측정기록서 (ECT-001-F02-02)",
        pdfPath: "/pdfs/ECT-001-F02-02_어체측정기록서.pdf",
      },
      {
        sopId: "IAI-ECT-001-05",
        sopNumber: "IAI-ECT-001",
        formTitle: "어류 급성독성시험기록서 (ECT-001-F03-02)",
        pdfPath: "/pdfs/ECT-001-F03-02_어류_급성독성시험기록서.pdf",
      },
      {
        sopId: "IAI-ECT-001-05",
        sopNumber: "IAI-ECT-001",
        formTitle: "어류시험 환경측정기록서-지수식 (ECT-001-F04-01)",
        pdfPath: "/pdfs/ECT-001-F04-01_어류시험_환경측정기록서(지수식).pdf",
      },
    ],
  },
  {
    studyNumber: "ECT-2026-002",
    title: "물벼룩을 이용한 시험물질 IAI-2026B의 급성독성시험",
    testSubstance: "IAI-2026B",
    status: "submitted_for_qa",
    startDate: "2026-05-15",
    endDate: "2026-06-25",
    directorName: "연구원 (작성자)",
    qaName: "QAU검토자 (확인자)",
    requiredForms: [
      {
        sopId: "IAI-ECT-002-03",
        sopNumber: "IAI-ECT-002",
        formTitle: "물벼룩 급성독성시험기록서 (ECT-002-F01-02)",
        pdfPath: "/pdfs/ECT-002-F01-02_물벼룩_급성독성시험기록서.pdf",
      },
      {
        sopId: "IAI-ECT-002-03",
        sopNumber: "IAI-ECT-002",
        formTitle: "물벼룩시험 환경측정기록서 (ECT-002-F02-02)",
        pdfPath: "/pdfs/ECT-002-F02-02_물벼룩시험_환경측정기록서.pdf",
      },
    ],
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

// 이력 로컬스토리지 보존용 키
const STORAGE_KEY_STUDIES = "glp-studies-list";

export function getStudiesList(): StudyInfo[] {
  if (typeof window === "undefined") return MOCK_STUDIES;
  const stored = localStorage.getItem(STORAGE_KEY_STUDIES);
  if (stored) return JSON.parse(stored);
  localStorage.setItem(STORAGE_KEY_STUDIES, JSON.stringify(MOCK_STUDIES));
  return MOCK_STUDIES;
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
