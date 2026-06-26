"use client";
import { useRef, useState, useEffect } from "react";

interface Props {
  isOpen: boolean;
  userName: string;
  onConfirm: (comments: string, signatureImage: string) => void;
  onCancel: () => void;
}

export default function QAStatementModal({ isOpen, userName, onConfirm, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [comments, setComments] = useState("");
  const [drawing, setDrawing] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setComments("");
      setHasStroke(false);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
    ctx.strokeStyle = "#4f46e5"; // Indigo ink for QA auditor signature
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
    setHasStroke(true);
  };

  const onPointerUp = () => setDrawing(false);

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    canvasRef.current.getContext("2d")!.clearRect(0, 0, 400, 160);
    setHasStroke(false);
  };

  const handleConfirm = () => {
    if (!hasStroke || !canvasRef.current || comments.trim().length < 5) return;
    const signatureImage = canvasRef.current.toDataURL("image/png");
    onConfirm(comments.trim(), signatureImage);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-indigo-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-indigo-900">🛡️ 신뢰성보증확인서 (QA Statement) 서명</h3>
            <p className="text-xs text-slate-400 mt-0.5">QA 검토자: {userName}</p>
          </div>
          <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Comments Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            QA 최종 검토 의견 <span className="text-red-500">*</span>
            <span className="text-slate-400 font-normal ml-1">(최소 5자)</span>
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 resize-none"
            placeholder="해당 시험 바인더 전체 문서의 신뢰성보증 검토 소견을 기입하세요."
            autoFocus
          />
        </div>

        {/* Signature Canvas */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">
              QA 수기 전자서명 <span className="text-red-500">*</span>
            </label>
            <button
              onClick={clearCanvas}
              className="text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
            >
              다시 쓰기
            </button>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner">
            <canvas
              ref={canvasRef}
              width={400}
              height={160}
              className="w-full touch-none cursor-crosshair bg-white"
              style={{ display: "block" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            />
          </div>
        </div>

        <p className="text-[11px] text-indigo-600 text-center font-medium">
          의견을 작성하고 네모 박스 안에 서명한 뒤 제출하면 시험 바인더가 최종 잠금 처리됩니다.
        </p>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!hasStroke || comments.trim().length < 5}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-indigo-700 cursor-pointer transition-colors"
          >
            서명 완료 (최종 봉인)
          </button>
        </div>

      </div>
    </div>
  );
}
