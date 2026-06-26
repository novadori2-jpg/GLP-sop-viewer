"use client";
import { useRef, useState, useEffect } from "react";

interface Props {
  userName: string;
  onConfirm: (reason: string, newValue?: string, correctionSignature?: string) => void;
  onCancel: () => void;
}

export default function StrikeCorrectionModal({ userName, onConfirm, onCancel }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  
  // Signature canvas state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // When reaching step 3, clear or re-initialize canvas state
    if (step === 3 && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      setHasStroke(false);
    }
  }, [step]);

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (reason.trim().length < 5) return;
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };

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
    ctx.strokeStyle = "#ef4444"; // Red ink for correction signature to stand out
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
    if (reason.trim().length < 5 || !hasStroke || !canvasRef.current) return;
    const signatureImage = canvasRef.current.toDataURL("image/png");
    onConfirm(reason.trim(), newValue.trim() || undefined, signatureImage);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-red-50 border-b border-red-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-lg font-bold">⚠️</span>
            <div>
              <p className="text-sm font-bold text-red-800">GLP 취선 수정 이력 기록</p>
              <p className="text-[11px] text-red-600">수정 사항은 복원 불가하며 이력이 영구 기록됩니다.</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step Indicator */}
        <div className="bg-slate-50 px-6 py-2 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${step === 1 ? "bg-red-500 border-red-500 text-white font-bold" : "bg-white border-slate-300"}`}>1</span>
            <span className={step === 1 ? "text-slate-900 font-bold" : ""}>변경 내용</span>
          </div>
          <div className="w-4 h-px bg-slate-300" />
          <div className="flex items-center gap-1.5">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${step === 2 ? "bg-red-500 border-red-500 text-white font-bold" : "bg-white border-slate-300"}`}>2</span>
            <span className={step === 2 ? "text-slate-900 font-bold" : ""}>수정 사유</span>
          </div>
          <div className="w-4 h-px bg-slate-300" />
          <div className="flex items-center gap-1.5">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${step === 3 ? "bg-red-500 border-red-500 text-white font-bold" : "bg-white border-slate-300"}`}>3</span>
            <span className={step === 3 ? "text-slate-900 font-bold" : ""}>서명 인증</span>
          </div>
        </div>

        {/* Step Content */}
        <div className="p-5 space-y-4">
          
          {/* Step 1: New Value */}
          {step === 1 && (
            <div className="space-y-2 animate-in fade-in slide-in-from-right-2 duration-200">
              <label className="text-xs font-bold text-slate-700 block">
                새로운 수정값 입력 <span className="text-slate-400 font-normal">(선택)</span>
              </label>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-red-500"
                placeholder="지우기(공백)인 경우 비워두고 다음을 누르세요"
                autoFocus
              />
              <p className="text-[11px] text-slate-400">
                수정 후 표시될 값을 적습니다. 취선 처리만 하고 새로운 값을 기록하지 않는 경우 비워두어도 됩니다.
              </p>
            </div>
          )}

          {/* Step 2: Reason */}
          {step === 2 && (
            <div className="space-y-2 animate-in fade-in slide-in-from-right-2 duration-200">
              <label className="text-xs font-bold text-slate-700 block">
                수정 사유 입력 <span className="text-red-500">*</span>
                <span className="text-slate-400 font-normal ml-1">(최소 5자)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 resize-none"
                placeholder="예: 어류 폐사 개체수 오기재로 인한 수정"
                autoFocus
              />
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>자세하게 적어주세요.</span>
                <span className={reason.trim().length >= 5 ? "text-green-600 font-bold" : "text-red-400"}>
                  {reason.trim().length} / 5자
                </span>
              </div>
            </div>
          )}

          {/* Step 3: Signature */}
          {step === 3 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-right-2 duration-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  수정자 서명 <span className="text-red-500">*</span>
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
              <p className="text-[11px] text-red-500 text-center font-semibold">
                위 네모 상자 안에 본인 서명을 해 주세요. 서명자: {userName}
              </p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            {step > 1 ? (
              <button
                onClick={handleBack}
                className="flex-1 py-3 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                이전
              </button>
            ) : (
              <button
                onClick={onCancel}
                className="flex-1 py-3 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                취소
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={handleNext}
                disabled={step === 2 && reason.trim().length < 5}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-red-600 cursor-pointer transition-colors"
              >
                다음
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={!hasStroke || reason.trim().length < 5}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-red-700 cursor-pointer transition-colors"
              >
                수정 서명 제출
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
