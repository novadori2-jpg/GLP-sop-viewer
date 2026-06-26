"use client";
import { useState, useRef } from "react";
import type { EditHistoryItem } from "@/lib/record-data";

interface Props {
  fieldLabel: string;
  oldValue: string;
  onConfirm: (newValue: string, reason: string, signatureImage?: string) => void;
  onCancel: () => void;
  fieldType?: string;
  unit?: string;
  simplified?: boolean; // true면 "새 값" 입력 없이 수정 사유 + 즉시 서명만 받음
  userName?: string;
}

export function EditHistoryModal({
  fieldLabel,
  oldValue,
  onConfirm,
  onCancel,
  fieldType,
  unit,
  simplified,
  userName,
}: Props) {
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  const [hasStroke, setHasStroke] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const isValid = simplified
    ? reason.trim().length >= 2
    : newValue.trim() !== "" && reason.trim().length >= 5;

  const getPos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvasRef.current!.width / rect.width),
      y: (e.clientY - rect.top) * (canvasRef.current!.height / rect.height),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setDrawing(true);
    lastPos.current = getPos(e);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing || !canvasRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d")!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e40af";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
    setHasStroke(true);
  };

  const onPointerUp = () => setDrawing(false);

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    canvasRef.current.getContext("2d")!.clearRect(0, 0, 360, 120);
    setHasStroke(false);
  };

  const handleConfirm = () => {
    if (!isValid) return;
    let signatureImage: string | undefined;
    if (simplified && hasStroke && canvasRef.current) {
      signatureImage = canvasRef.current.toDataURL("image/png");
    }
    onConfirm(newValue, reason, signatureImage);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 text-lg">⚠</span>
            <div>
              <p className="text-sm font-bold text-amber-800">서명 후 수정 — GLP 이력 기록 필요</p>
              <p className="text-xs text-amber-600">수정 사유 기입 및 서명이 필요합니다</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* 수정 항목 */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">수정 항목</p>
            <p className="text-base font-bold text-slate-900">{fieldLabel}</p>
          </div>

          {/* 이전 값 */}
          <div className="bg-red-50 rounded-xl px-4 py-3">
            <p className="text-xs text-red-500 font-medium mb-0.5">이전 값</p>
            <p className="text-sm font-bold text-red-800">{oldValue || "(비어있음)"} {unit}</p>
          </div>

          {/* 새 값 (simplified 모드에서는 숨김) */}
          {!simplified && (
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                새 값 <span className="text-red-500">*</span>
              </label>
              {fieldType === "number" ? (
                <input
                  type="number"
                  inputMode="decimal"
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500"
                  placeholder={`새 값 입력${unit ? ` (${unit})` : ""}`}
                  autoFocus
                />
              ) : (
                <input
                  type="text"
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-500"
                  placeholder="새 값 입력"
                  autoFocus
                />
              )}
            </div>
          )}

          {/* 수정 사유 */}
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              수정 사유 <span className="text-red-500">*</span>
              <span className="text-slate-400 font-normal ml-1">(최소 {simplified ? 2 : 5}자)</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
              placeholder="예: 오기재로 인한 수정, 재측정 결과 반영 등"
              autoFocus={simplified}
            />
            <p className="text-xs text-slate-400 mt-0.5">{reason.length}자 입력됨</p>
          </div>

          {/* 즉시 서명 (simplified 모드에서만 표시) */}
          {simplified && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-600">
                  수정자 서명 <span className="text-slate-400 font-normal">(선택)</span>
                </label>
                <button
                  onClick={clearCanvas}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  다시 쓰기
                </button>
              </div>
              <div className="border-2 border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <canvas
                  ref={canvasRef}
                  width={360}
                  height={120}
                  className="w-full touch-none cursor-crosshair bg-white"
                  style={{ display: "block" }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerLeave={onPointerUp}
                />
              </div>
              {userName && (
                <p className="text-[10px] text-slate-400 mt-1 text-center">
                  {userName} · {new Date().toLocaleDateString("ko-KR")}
                </p>
              )}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 py-3 border border-slate-300 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isValid}
              className="flex-1 py-3 bg-amber-500 text-white rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-amber-600 cursor-pointer transition-colors"
            >
              수정 완료 (이력 기록)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 수정 이력 목록 표시
export function EditHistoryList({ history }: { history: EditHistoryItem[] }) {
  if (history.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-bold text-slate-500 mb-2">수정 이력 ({history.length}건)</p>
      <div className="space-y-2">
        {history.map(h => {
          const d = new Date(h.editedAt);
          const fmt = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
          return (
            <div key={h.id} className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-amber-800">{h.fieldLabel}</span>
                <span className="text-amber-600">{h.editedByName} · {fmt}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="line-through text-red-500">{h.oldValue || "(없음)"}</span>
                <span className="text-slate-400">→</span>
                <span className="font-semibold text-slate-800">{h.newValue}</span>
              </div>
              <p className="text-amber-700 mt-1">사유: {h.reason}</p>
              {h.signatureImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={h.signatureImage} alt="수정자 서명" className="h-8 mt-1 object-contain border border-amber-200 rounded bg-white px-1" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
