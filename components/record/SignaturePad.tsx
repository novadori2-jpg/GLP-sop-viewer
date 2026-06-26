"use client";
import { useRef, useState } from "react";
import type { SignatureRecord, UserRole } from "@/lib/record-data";

interface Props {
  label: string;            // "작성자 서명" | "확인자 서명"
  existing?: SignatureRecord;
  onSign: (record: SignatureRecord) => void;
  disabled?: boolean;       // 서명 순서 제어용 (작성자 서명 전 확인자 차단)
  userName: string;
  userId: string;
  userRole: UserRole;
}


export default function SignaturePad({ label, existing, onSign, disabled, userName, userId, userRole }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

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

  const confirm = () => {
    if (!canvasRef.current || !hasStroke) return;
    const signatureImage = canvasRef.current.toDataURL("image/png");
    onSign({
      userId,
      userName,
      signatureImage,
      signedAt: new Date().toISOString(),
      deviceInfo: navigator.userAgent.substring(0, 100),
    });
    setConfirming(false);
  };

  // 이미 서명된 경우
  if (existing) {
    const d = new Date(existing.signedAt);
    const formatted = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-green-800">{label}</span>
          <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-medium">서명 완료</span>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={existing.signatureImage} alt="서명" className="h-16 object-contain bg-white rounded-lg border border-green-100 px-2" />
        <p className="text-xs text-green-700 mt-2">
          <span className="font-semibold">{existing.userName}</span> · {formatted}
        </p>
      </div>
    );
  }

  // 작성자 서명 전단계 차단 (확인자 서명용)
  if (disabled) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 opacity-50">
        <p className="text-sm font-bold text-slate-500">{label}</p>
        <p className="text-xs text-slate-400 mt-1">작성자 서명 완료 후 활성화됩니다</p>
      </div>
    );
  }

  // 역할 권한 체크
  const isAuthorSign = label.includes("작성자");
  const isReviewerSign = label.includes("확인자") || label.includes("검토자");

  let hasAuthority = false;
  let authorityErrorMessage = "";

  if (isAuthorSign) {
    // QAP는 기초자료 작성자가 될 수 없음 (GLP 독립성 원칙)
    if (userRole === "qap") {
      hasAuthority = false;
      authorityErrorMessage = "⚠️ QAP(신뢰성보증원)는 GLP 규정상 기초자료 작성자 서명을 할 수 없습니다.";
    } else {
      hasAuthority = true;
    }
  } else if (isReviewerSign) {
    // 확인자(검토자) 서명은 관리 책임을 가진 역할만 가능 (sd, tfm, qap, archivist, pi)
    // 시험담당자(investigator)는 확인자 서명을 할 수 없음
    if (userRole === "investigator") {
      hasAuthority = false;
      authorityErrorMessage = "⚠️ 시험담당자(Investigator)는 확인자 서명을 할 수 없습니다.";
    } else {
      hasAuthority = true;
    }
  }

  if (!hasAuthority) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 opacity-65">
        <p className="text-sm font-bold text-slate-500">{label}</p>
        <p className="text-xs text-red-500 font-semibold mt-1">
          {authorityErrorMessage || "⚠️ 이 서명에 대한 권한이 없습니다."}
        </p>
      </div>
    );
  }


  if (!confirming) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-sm font-bold text-blue-800 mb-2">{label}</p>
        <button
          onClick={() => setConfirming(true)}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm active:bg-blue-700"
        >
          서명하기
        </button>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border-2 border-blue-400 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-blue-800">{label} — {userName}</p>
        <button onClick={() => setConfirming(false)} className="text-xs text-slate-500">취소</button>
      </div>
      <div className="bg-white border border-blue-200 rounded-xl overflow-hidden">
        <canvas
          ref={canvasRef}
          width={400}
          height={160}
          className="w-full touch-none cursor-crosshair"
          style={{ display: "block" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
      </div>
      <p className="text-xs text-blue-600 text-center">서명란에 직접 서명하세요</p>
      <div className="flex gap-2">
        <button onClick={clear} className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-600 font-medium">
          다시 쓰기
        </button>
        <button
          onClick={confirm}
          disabled={!hasStroke}
          className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 active:bg-blue-700"
        >
          서명 완료
        </button>
      </div>
    </div>
  );
}
