// GLP 기록지 양식 템플릿 — 5종 우선 구현
import type { RecordFormTemplate } from "./record-data";

export const RECORD_TEMPLATES: RecordFormTemplate[] = [
  // ─── ECT-001: 어류급성독성시험 ────────────────────────────────────────
  {
    id: "FORM-IAI-ECT-001-01",
    sopId: "IAI-ECT-001-05",
    sopNumber: "IAI-ECT-001",
    title: "어류급성독성시험 기록지",
    version: "Rev.01",
    requiresAuthorSignature: true,
    requiresReviewerSignature: true,
    sections: [
      {
        id: "test-info",
        title: "시험 기본 정보",
        fields: [
          { id: "test-number", label: "시험번호", type: "text", required: true, placeholder: "예: ECT-2026-001" },
          { id: "test-substance", label: "시험물질명", type: "text", required: true },
          { id: "test-start-date", label: "시험 개시일", type: "date", required: true },
          { id: "test-end-date", label: "시험 종료일", type: "date", required: true },
          { id: "fish-species", label: "시험어종", type: "select", required: true, options: ["제브라피쉬 (Danio rerio)", "송사리 (Oryzias latipes)", "잉어 (Cyprinus carpio)", "무지개송어 (Oncorhynchus mykiss)"] },
          { id: "fish-count", label: "개체수 (마리/조)", type: "number", required: true, min: 1, max: 20, unit: "마리" },
          { id: "exposure-duration", label: "노출 시간", type: "number", required: true, unit: "hr", min: 24, max: 96 },
        ],
      },
      {
        id: "water-quality",
        title: "시험용수 수질",
        fields: [
          { id: "water-temp-start", label: "시험 개시 수온", type: "number", required: true, unit: "℃", min: 10, max: 30 },
          { id: "water-temp-end", label: "시험 종료 수온", type: "number", required: true, unit: "℃", min: 10, max: 30 },
          { id: "do-start", label: "시험 개시 DO", type: "number", required: true, unit: "mg/L", min: 0, max: 20 },
          { id: "do-end", label: "시험 종료 DO", type: "number", required: true, unit: "mg/L", min: 0, max: 20 },
          { id: "ph-start", label: "시험 개시 pH", type: "number", required: true, min: 0, max: 14 },
          { id: "ph-end", label: "시험 종료 pH", type: "number", required: true, min: 0, max: 14 },
          { id: "hardness", label: "경도", type: "number", required: false, unit: "mg CaCO₃/L" },
        ],
      },
      {
        id: "exposure-conc",
        title: "노출 농도 설정",
        fields: [
          { id: "conc-unit", label: "농도 단위", type: "select", required: true, options: ["mg/L", "μg/L", "%"] },
          { id: "conc-0", label: "대조군 농도", type: "number", required: true, min: 0, unit: "설정 단위" },
          { id: "conc-1", label: "농도 1", type: "number", required: true, min: 0 },
          { id: "conc-2", label: "농도 2", type: "number", required: false, min: 0 },
          { id: "conc-3", label: "농도 3", type: "number", required: false, min: 0 },
          { id: "conc-4", label: "농도 4", type: "number", required: false, min: 0 },
          { id: "conc-5", label: "농도 5", type: "number", required: false, min: 0 },
        ],
      },
      {
        id: "mortality",
        title: "폐사율 관찰 (개체수)",
        fields: [
          { id: "dead-24h-ctrl", label: "24h 폐사 — 대조군", type: "number", required: true, min: 0, unit: "마리" },
          { id: "dead-24h-c1", label: "24h 폐사 — 농도1", type: "number", required: true, min: 0, unit: "마리" },
          { id: "dead-24h-c2", label: "24h 폐사 — 농도2", type: "number", required: false, min: 0, unit: "마리" },
          { id: "dead-24h-c3", label: "24h 폐사 — 농도3", type: "number", required: false, min: 0, unit: "마리" },
          { id: "dead-48h-ctrl", label: "48h 폐사 — 대조군", type: "number", required: true, min: 0, unit: "마리" },
          { id: "dead-48h-c1", label: "48h 폐사 — 농도1", type: "number", required: true, min: 0, unit: "마리" },
          { id: "dead-48h-c2", label: "48h 폐사 — 농도2", type: "number", required: false, min: 0, unit: "마리" },
          { id: "dead-48h-c3", label: "48h 폐사 — 농도3", type: "number", required: false, min: 0, unit: "마리" },
          { id: "dead-96h-ctrl", label: "96h 폐사 — 대조군", type: "number", required: true, min: 0, unit: "마리" },
          { id: "dead-96h-c1", label: "96h 폐사 — 농도1", type: "number", required: true, min: 0, unit: "마리" },
          { id: "dead-96h-c2", label: "96h 폐사 — 농도2", type: "number", required: false, min: 0, unit: "마리" },
          { id: "dead-96h-c3", label: "96h 폐사 — 농도3", type: "number", required: false, min: 0, unit: "마리" },
          { id: "lc50-96h", label: "96h LC50", type: "number", required: false, unit: "mg/L" },
        ],
      },
      {
        id: "remarks",
        title: "특이사항",
        fields: [
          { id: "abnormal-behavior", label: "이상행동 관찰", type: "text", required: false, placeholder: "이상 없음 / 유영이상 등", rows: 2 },
          { id: "observation-sketch", label: "이상행동 수기 기록 / 스케치", type: "handwriting", required: false },
          { id: "remarks", label: "비고", type: "text", required: false, rows: 3 },
        ],
      },
    ],
  },

  // ─── ECT-002: 물벼룩급성독성시험 ─────────────────────────────────────
  {
    id: "FORM-IAI-ECT-002-01",
    sopId: "IAI-ECT-002-03",
    sopNumber: "IAI-ECT-002",
    title: "물벼룩급성독성시험 기록지",
    version: "Rev.01",
    requiresAuthorSignature: true,
    requiresReviewerSignature: true,
    sections: [
      {
        id: "test-info",
        title: "시험 기본 정보",
        fields: [
          { id: "test-number", label: "시험번호", type: "text", required: true },
          { id: "test-substance", label: "시험물질명", type: "text", required: true },
          { id: "test-start-date", label: "시험 개시일", type: "date", required: true },
          { id: "daphnia-age", label: "공시생물 연령", type: "number", required: true, unit: "h 이내 유충", min: 0, max: 24 },
          { id: "daphnia-source", label: "모충 배양 시작일", type: "date", required: true },
        ],
      },
      {
        id: "water-quality",
        title: "시험용수 수질",
        fields: [
          { id: "water-temp", label: "시험 온도", type: "number", required: true, unit: "℃", min: 18, max: 22 },
          { id: "ph", label: "pH", type: "number", required: true, min: 6, max: 9 },
          { id: "do", label: "DO", type: "number", required: true, unit: "mg/L", min: 0, max: 20 },
          { id: "hardness", label: "경도", type: "number", required: false, unit: "mg CaCO₃/L" },
        ],
      },
      {
        id: "immobility",
        title: "유영저해율 관찰",
        fields: [
          { id: "conc-unit", label: "농도 단위", type: "select", required: true, options: ["mg/L", "μg/L", "%"] },
          { id: "immob-24h-ctrl", label: "24h 유영저해 — 대조군", type: "number", required: true, min: 0, max: 100, unit: "%" },
          { id: "immob-24h-c1", label: "24h 유영저해 — 농도1", type: "number", required: true, min: 0, max: 100, unit: "%" },
          { id: "immob-24h-c2", label: "24h 유영저해 — 농도2", type: "number", required: false, min: 0, max: 100, unit: "%" },
          { id: "immob-24h-c3", label: "24h 유영저해 — 농도3", type: "number", required: false, min: 0, max: 100, unit: "%" },
          { id: "immob-48h-ctrl", label: "48h 유영저해 — 대조군", type: "number", required: true, min: 0, max: 100, unit: "%" },
          { id: "immob-48h-c1", label: "48h 유영저해 — 농도1", type: "number", required: true, min: 0, max: 100, unit: "%" },
          { id: "immob-48h-c2", label: "48h 유영저해 — 농도2", type: "number", required: false, min: 0, max: 100, unit: "%" },
          { id: "immob-48h-c3", label: "48h 유영저해 — 농도3", type: "number", required: false, min: 0, max: 100, unit: "%" },
          { id: "ec50-48h", label: "48h EC50", type: "number", required: false, unit: "mg/L" },
        ],
      },
      {
        id: "remarks",
        title: "특이사항",
        fields: [
          { id: "remarks", label: "비고", type: "text", required: false, rows: 3 },
        ],
      },
    ],
  },

  // ─── ECT-003: 담수조류생장저해시험 ───────────────────────────────────
  {
    id: "FORM-IAI-ECT-003-01",
    sopId: "IAI-ECT-003-03",
    sopNumber: "IAI-ECT-003",
    title: "담수조류생장저해시험 기록지",
    version: "Rev.01",
    requiresAuthorSignature: true,
    requiresReviewerSignature: true,
    sections: [
      {
        id: "test-info",
        title: "시험 기본 정보",
        fields: [
          { id: "test-number", label: "시험번호", type: "text", required: true },
          { id: "test-substance", label: "시험물질명", type: "text", required: true },
          { id: "algae-species", label: "시험조류", type: "select", required: true, options: ["Raphidocelis subcapitata", "Desmodesmus subspicatus", "Chlorella vulgaris"] },
          { id: "test-start-date", label: "시험 개시일", type: "date", required: true },
          { id: "test-end-date", label: "시험 종료일 (72h)", type: "date", required: true },
          { id: "initial-density", label: "초기 세포 밀도", type: "number", required: true, unit: "cells/mL" },
        ],
      },
      {
        id: "culture-condition",
        title: "배양 조건",
        fields: [
          { id: "temp", label: "배양 온도", type: "number", required: true, unit: "℃", min: 20, max: 25 },
          { id: "illuminance", label: "조도", type: "number", required: true, unit: "lux" },
          { id: "photoperiod", label: "광주기", type: "select", required: true, options: ["연속 광조사 (24h L)", "16L:8D", "12L:12D"] },
        ],
      },
      {
        id: "cell-count",
        title: "세포수 계수 (cells/mL)",
        fields: [
          { id: "count-0h-ctrl", label: "0h — 대조군", type: "number", required: true, min: 0 },
          { id: "count-0h-c1", label: "0h — 농도1", type: "number", required: true, min: 0 },
          { id: "count-72h-ctrl", label: "72h — 대조군", type: "number", required: true, min: 0 },
          { id: "count-72h-c1", label: "72h — 농도1", type: "number", required: true, min: 0 },
          { id: "count-72h-c2", label: "72h — 농도2", type: "number", required: false, min: 0 },
          { id: "count-72h-c3", label: "72h — 농도3", type: "number", required: false, min: 0 },
          { id: "erc50-72h", label: "72h ErC50", type: "number", required: false, unit: "mg/L" },
          { id: "noec", label: "NOEC", type: "number", required: false, unit: "mg/L" },
        ],
      },
      {
        id: "remarks",
        title: "특이사항",
        fields: [
          { id: "remarks", label: "비고", type: "text", required: false, rows: 3 },
        ],
      },
    ],
  },

  // ─── EQM-004: 전자저울 교정 기록 ─────────────────────────────────────
  {
    id: "FORM-IAI-EQM-004-01",
    sopId: "IAI-EQM-004-04",
    sopNumber: "IAI-EQM-004",
    title: "전자저울 일상점검 및 교정 기록지",
    version: "Rev.01",
    requiresAuthorSignature: true,
    requiresReviewerSignature: false,
    sections: [
      {
        id: "equipment-info",
        title: "기기 정보",
        fields: [
          { id: "equipment-id", label: "기기 관리번호", type: "text", required: true, placeholder: "예: BAL-001" },
          { id: "manufacturer", label: "제조사/모델명", type: "text", required: true },
          { id: "check-date", label: "점검일", type: "date", required: true },
          { id: "checker", label: "점검자", type: "text", required: true },
          { id: "location", label: "설치 위치", type: "text", required: true },
        ],
      },
      {
        id: "daily-check",
        title: "일상점검",
        fields: [
          { id: "level-check", label: "수평기 확인", type: "checkbox", required: true },
          { id: "clean-check", label: "저울판 청결 상태", type: "checkbox", required: true },
          { id: "zero-display", label: "전원 ON 후 영점 표시", type: "checkbox", required: true },
          { id: "environment-temp", label: "실내 온도", type: "number", required: true, unit: "℃" },
          { id: "environment-humidity", label: "실내 습도", type: "number", required: true, unit: "%" },
        ],
      },
      {
        id: "calibration",
        title: "표준분동 교정",
        fields: [
          { id: "weight-class", label: "표준분동 등급", type: "select", required: true, options: ["E1", "E2", "F1", "F2", "M1"] },
          { id: "nominal-1", label: "공칭값 1", type: "number", required: true, unit: "g" },
          { id: "measured-1", label: "측정값 1", type: "number", required: true, unit: "g" },
          { id: "nominal-2", label: "공칭값 2", type: "number", required: false, unit: "g" },
          { id: "measured-2", label: "측정값 2", type: "number", required: false, unit: "g" },
          { id: "nominal-3", label: "공칭값 3", type: "number", required: false, unit: "g" },
          { id: "measured-3", label: "측정값 3", type: "number", required: false, unit: "g" },
          { id: "tolerance", label: "허용오차", type: "number", required: true, unit: "mg" },
          { id: "pass-fail", label: "판정", type: "select", required: true, options: ["적합 (Pass)", "부적합 (Fail)"] },
        ],
      },
      {
        id: "remarks",
        title: "특이사항",
        fields: [
          { id: "remarks-sketch", label: "수기 점검 특이사항 / 메모", type: "handwriting", required: false },
          { id: "remarks", label: "비고", type: "text", required: false, rows: 2 },
        ],
      },
    ],
  },

  // ─── EQM-019: 피펫 교정 기록 ─────────────────────────────────────────
  {
    id: "FORM-IAI-EQM-019-01",
    sopId: "IAI-EQM-019-04",
    sopNumber: "IAI-EQM-019",
    title: "마이크로피펫 교정 기록지",
    version: "Rev.01",
    requiresAuthorSignature: true,
    requiresReviewerSignature: false,
    sections: [
      {
        id: "equipment-info",
        title: "피펫 정보",
        fields: [
          { id: "pipette-id", label: "관리번호", type: "text", required: true, placeholder: "예: PIP-001" },
          { id: "manufacturer", label: "제조사/모델명", type: "text", required: true },
          { id: "volume-range", label: "용량 범위", type: "select", required: true, options: ["0.1~2 μL", "0.5~10 μL", "2~20 μL", "10~100 μL", "20~200 μL", "100~1000 μL", "500~5000 μL"] },
          { id: "calibration-date", label: "교정일", type: "date", required: true },
          { id: "calibrator", label: "교정자", type: "text", required: true },
        ],
      },
      {
        id: "calibration",
        title: "중량법 교정 (증류수 25℃)",
        fields: [
          { id: "target-volume", label: "목표 용량", type: "number", required: true, unit: "μL" },
          { id: "weight-1", label: "측정값 1", type: "number", required: true, unit: "mg" },
          { id: "weight-2", label: "측정값 2", type: "number", required: true, unit: "mg" },
          { id: "weight-3", label: "측정값 3", type: "number", required: true, unit: "mg" },
          { id: "weight-4", label: "측정값 4", type: "number", required: false, unit: "mg" },
          { id: "weight-5", label: "측정값 5", type: "number", required: false, unit: "mg" },
          { id: "mean-volume", label: "평균 부피 (계산값)", type: "number", required: true, unit: "μL" },
          { id: "accuracy", label: "정확도", type: "number", required: true, unit: "%" },
          { id: "cv", label: "CV (정밀도)", type: "number", required: true, unit: "%" },
          { id: "allowable-error", label: "허용 오차", type: "number", required: true, unit: "%" },
          { id: "pass-fail", label: "판정", type: "select", required: true, options: ["적합 (Pass)", "부적합 (Fail)"] },
        ],
      },
      {
        id: "remarks",
        title: "특이사항",
        fields: [
          { id: "remarks", label: "비고", type: "text", required: false, rows: 2 },
        ],
      },
    ],
  },
];

import { SOP_DATA } from "./sop-data";

// sopId로 해당 기록지 템플릿 찾기
export function getTemplatesBySopId(sopId: string): RecordFormTemplate[] {
  // sopNumber 기반 매칭 (버전 suffix 무관)
  const sopNumber = sopId.replace(/-\d{2}$/, "");
  const specific = RECORD_TEMPLATES.filter(t => t.sopNumber === sopNumber);
  if (specific.length > 0) return specific;

  // 전용 양식이 없으면 범용 GLP 일지 자동 매핑
  const sop = SOP_DATA.find(s => s.id === sopId);
  const title = sop ? `${sop.title} 기록지` : "GLP 표준 작업 기록지";

  const genericTemplate: RecordFormTemplate = {
    id: `FORM-GENERIC-${sopId}`,
    sopId: sopId,
    sopNumber: sopNumber,
    title: title,
    version: "Rev.01",
    requiresAuthorSignature: true,
    requiresReviewerSignature: true,
    sections: [
      {
        id: "generic-info",
        title: "기본 정보",
        fields: [
          { id: "work-name", label: "작업/시험명", type: "text", required: true, placeholder: "예: 장비 일상 점검 및 세척 작업" },
          { id: "work-date", label: "작업 일자", type: "date", required: true },
          { id: "device-id", label: "장비/시설 관리번호", type: "text", required: false, placeholder: "예: EQM-012" },
        ],
      },
      {
        id: "generic-env",
        title: "환경 모니터링",
        fields: [
          { id: "env-temp", label: "실내 온도", type: "number", required: true, unit: "℃", min: 10, max: 40 },
          { id: "env-humidity", label: "실내 습도", type: "number", required: true, unit: "%", min: 10, max: 90 },
          { id: "status-ok", label: "작동 상태 정상 확인", type: "checkbox", required: true },
        ],
      },
      {
        id: "generic-record",
        title: "작업 상세 기록 및 수기 기록",
        fields: [
          { id: "work-sketch", label: "수기 작업 기록 / 스케치", type: "handwriting", required: false },
          { id: "work-details", label: "작업 상세 내용", type: "text", required: true, rows: 4, placeholder: "수행한 작업 내용 및 결과를 상세히 기록하세요." },
        ],
      },
      {
        id: "generic-remarks",
        title: "특이사항",
        fields: [
          { id: "remarks", label: "비고", type: "text", required: false, rows: 2 },
        ],
      },
    ],
  };

  return [genericTemplate];
}

export function getTemplateById(id: string): RecordFormTemplate | undefined {
  const specific = RECORD_TEMPLATES.find(t => t.id === id);
  if (specific) return specific;

  // 범용 양식에 대한 동적 로드 지원
  if (id.startsWith("FORM-GENERIC-")) {
    const sopId = id.substring("FORM-GENERIC-".length);
    const templates = getTemplatesBySopId(sopId);
    return templates.find(t => t.id === id);
  }
  return undefined;
}
