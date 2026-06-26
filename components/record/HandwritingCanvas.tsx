"use client";
import { useRef, useEffect, useState, useCallback } from "react";

interface Props {
  value?: string;           // base64 PNG
  onChange?: (v: string) => void;
  readOnly?: boolean;
  label?: string;
}

export default function HandwritingCanvas({ value, onChange, readOnly, label }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [penSize, setPenSize] = useState(2);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // 저장된 이미지 복원
  useEffect(() => {
    if (!value || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0);
    };
    img.src = value;
  }, [value]);

  // 모바일 터치 스크롤링 및 제스처 방지 (필기감 최적화)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const preventDefault = (e: TouchEvent) => {
      e.preventDefault();
    };
    canvas.addEventListener("touchstart", preventDefault, { passive: false });
    canvas.addEventListener("touchmove", preventDefault, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", preventDefault);
      canvas.removeEventListener("touchmove", preventDefault);
    };
  }, []);

  const getPos = (e: React.PointerEvent): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (readOnly) return;
    e.preventDefault();
    setDrawing(true);
    lastPos.current = getPos(e);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drawing || readOnly || !canvasRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d")!;
    const pos = getPos(e);
    const pressure = e.pressure > 0 ? e.pressure : 1;

    ctx.beginPath();
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = penSize * pressure;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  }, [drawing, readOnly, penSize]);

  const onPointerUp = () => {
    if (!drawing) return;
    setDrawing(false);
    lastPos.current = null;
    if (canvasRef.current && onChange) {
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  };

  const clear = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    onChange?.("");
  };

  return (
    <div className="space-y-2">
      {!readOnly && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">펜 굵기</span>
          {[1, 2, 4].map(s => (
            <button
              key={s}
              onClick={() => setPenSize(s)}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                penSize === s ? "border-blue-500 bg-blue-50" : "border-slate-200"
              }`}
            >
              <div
                className="rounded-full bg-slate-800"
                style={{ width: s * 3, height: s * 3 }}
              />
            </button>
          ))}
          <button
            onClick={clear}
            className="ml-auto text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg"
          >
            지우기
          </button>
        </div>
      )}
      <div className={`border-2 rounded-xl overflow-hidden ${readOnly ? "border-slate-100 bg-slate-50" : "border-slate-300 bg-white cursor-crosshair"}`}>
        <canvas
          ref={canvasRef}
          width={600}
          height={180}
          className="w-full touch-none"
          style={{ display: "block" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>
      {!readOnly && (
        <p className="text-xs text-slate-400 text-center">손가락 또는 스타일러스로 직접 쓰세요</p>
      )}
    </div>
  );
}
