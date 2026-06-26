"use client";
import { useState } from "react";
import type { RecordField, RecordSection, EditHistoryItem } from "@/lib/record-data";
import HandwritingCanvas from "./HandwritingCanvas";
import { EditHistoryModal, EditHistoryList } from "./EditHistoryModal";

interface Props {
  sections: RecordSection[];
  values: Record<string, string | number | boolean>;
  handwritingData: Record<string, string>;
  editHistory: EditHistoryItem[];
  readOnly: boolean;           // 서명 후 true
  onChange: (fieldId: string, value: string | number | boolean) => void;
  onHandwritingChange: (fieldId: string, data: string) => void;
  onEditWithHistory: (fieldId: string, fieldLabel: string, oldValue: string, newValue: string, reason: string) => void;
  currentUserName: string;
  currentUserId: string;
}

interface EditTarget {
  fieldId: string;
  fieldLabel: string;
  oldValue: string;
  fieldType: string;
  unit?: string;
  sectionId: string;
}

export default function RecordForm({
  sections, values, handwritingData, editHistory,
  readOnly, onChange, onHandwritingChange, onEditWithHistory,
  currentUserName, currentUserId,
}: Props) {
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  const handleFieldChange = (field: RecordField, sectionId: string, newVal: string | number | boolean) => {
    if (!readOnly) {
      onChange(field.id, newVal);
      return;
    }
    // 서명 후 수정 → 이력 팝업
    const oldVal = String(values[field.id] ?? "");
    setEditTarget({ fieldId: field.id, fieldLabel: field.label, oldValue: oldVal, fieldType: field.type, unit: field.unit, sectionId });
  };

  const confirmEdit = (newValue: string, reason: string) => {
    if (!editTarget) return;
    onEditWithHistory(editTarget.fieldId, editTarget.fieldLabel, editTarget.oldValue, newValue, reason);
    setEditTarget(null);
  };

  const renderField = (field: RecordField, sectionId: string) => {
    const val = values[field.id];
    const strVal = val !== undefined ? String(val) : "";
    const fieldHistory = editHistory.filter(h => h.fieldId === field.id);

    const labelEl = (
      <div className="flex items-center gap-1 mb-1.5">
        <label className="text-sm font-medium text-slate-700">{field.label}</label>
        {field.required && <span className="text-red-500 text-xs">*</span>}
        {field.unit && <span className="text-xs text-slate-400">({field.unit})</span>}
      </div>
    );

    let inputEl: React.ReactNode;

    switch (field.type) {
      case "handwriting":
        inputEl = (
          <HandwritingCanvas
            value={handwritingData[field.id]}
            onChange={v => !readOnly && onHandwritingChange(field.id, v)}
            readOnly={readOnly}
          />
        );
        break;

      case "number":
        inputEl = (
          <input
            type="number"
            inputMode="decimal"
            value={strVal}
            readOnly={readOnly}
            min={field.min}
            max={field.max}
            onChange={e => handleFieldChange(field, sectionId, e.target.value)}
            onClick={() => readOnly && handleFieldChange(field, sectionId, strVal)}
            className={`w-full border-2 rounded-xl px-4 py-3 text-base focus:outline-none transition-colors ${
              readOnly
                ? "border-slate-100 bg-slate-50 text-slate-700 cursor-pointer"
                : "border-slate-200 bg-white focus:border-blue-500"
            }`}
            placeholder={field.placeholder ?? `${field.min ?? ""}~${field.max ?? ""}`}
          />
        );
        break;

      case "date":
        inputEl = (
          <input
            type="date"
            value={strVal}
            readOnly={readOnly}
            onChange={e => handleFieldChange(field, sectionId, e.target.value)}
            onClick={() => readOnly && handleFieldChange(field, sectionId, strVal)}
            className={`w-full border-2 rounded-xl px-4 py-3 text-base focus:outline-none ${
              readOnly ? "border-slate-100 bg-slate-50 cursor-pointer" : "border-slate-200 focus:border-blue-500"
            }`}
          />
        );
        break;

      case "checkbox":
        inputEl = (
          <button
            onClick={() => handleFieldChange(field, sectionId, !val)}
            className={`flex items-center gap-3 w-full py-3 px-4 border-2 rounded-xl transition-colors ${
              val ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"
            } ${readOnly ? "cursor-pointer" : ""}`}
          >
            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 ${
              val ? "border-blue-500 bg-blue-500" : "border-slate-300"
            }`}>
              {val && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
            </div>
            <span className={`text-sm font-medium ${val ? "text-blue-700" : "text-slate-500"}`}>
              {val ? "확인 완료" : "미확인"}
            </span>
          </button>
        );
        break;

      case "select":
        inputEl = (
          <select
            value={strVal}
            disabled={readOnly}
            onChange={e => handleFieldChange(field, sectionId, e.target.value)}
            className={`w-full border-2 rounded-xl px-4 py-3 text-base focus:outline-none bg-white ${
              readOnly ? "border-slate-100 bg-slate-50 text-slate-700" : "border-slate-200 focus:border-blue-500"
            }`}
          >
            <option value="">선택하세요</option>
            {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        );
        break;

      default: // text
        inputEl = (
          <textarea
            value={strVal}
            readOnly={readOnly}
            rows={field.rows ?? 1}
            onChange={e => handleFieldChange(field, sectionId, e.target.value)}
            onClick={() => readOnly && handleFieldChange(field, sectionId, strVal)}
            className={`w-full border-2 rounded-xl px-4 py-3 text-base focus:outline-none resize-none ${
              readOnly ? "border-slate-100 bg-slate-50 cursor-pointer" : "border-slate-200 focus:border-blue-500"
            }`}
            placeholder={field.placeholder}
          />
        );
    }

    return (
      <div key={field.id} className="mb-4">
        {labelEl}
        {inputEl}
        <EditHistoryList history={fieldHistory} />
      </div>
    );
  };

  return (
    <>
      {sections.map(section => (
        <div key={section.id} className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{section.title}</h3>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <div className="space-y-1">
            {section.fields.map(f => renderField(f, section.id))}
          </div>
        </div>
      ))}

      {editTarget && (
        <EditHistoryModal
          fieldLabel={editTarget.fieldLabel}
          oldValue={editTarget.oldValue}
          fieldType={editTarget.fieldType}
          unit={editTarget.unit}
          onConfirm={confirmEdit}
          onCancel={() => setEditTarget(null)}
        />
      )}
    </>
  );
}
