"use client";
import { useRef, useState, useEffect } from "react";

interface Props {
  isOpen: boolean;
  userName: string;
  userRole: string;
  onConfirm: (signatureImage: string) => void;
  onCancel: () => void;
}

export default function SignatureModal({ isOpen, userName, userRole, onConfirm, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      // 모달이 열릴 때 캔버스 및 스트로크 상태 초기화
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      setHasStroke(false);
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
    ctx.strokeStyle = "#1e40af";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
    setHasStroke(true);
  };

  const onPointerUp = () => setDrawing(false);

  const clear = () => {
    if (!canvasRef.current) return;
    canvasRef.current.getContext("2d")!.clearRect(0, 0, 400, 160);
    setHasStroke(false);
  };

  const handleConfirm = () => {
    if (!canvasRef.current || !hasStroke) return;
    const signatureImage = canvasRef.current.toDataURL("image/png");
    onConfirm(signatureImage);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">✍️ GLP 본문 전자서명</h3>
            <p className="text-xs text-slate-400 mt-0.5">서명자: {userName} ({userRole === "reviewer" ? "확인자" : "작성자"})</p>
          </div>
          <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
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
        
        <p className="text-[11px] text-blue-600 text-center font-medium">네모박스 안에 손가락이나 펜으로 직접 서명해 주세요.</p>

        <div className="flex gap-2 pt-2">
          <button
            onClick={clear}
            className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-600 font-bold hover:bg-slate-50 cursor-pointer transition-colors"
          >
            다시 쓰기
          </button>
          <button
            onClick={handleConfirm}
            disabled={!hasStroke}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-40 cursor-pointer transition-colors"
          >
            서명 완료
          </button>
        </div>
      </div>
    </div>
  );
}
