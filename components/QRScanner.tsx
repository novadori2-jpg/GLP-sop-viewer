"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// html5-qrcode는 브라우저 전용 라이브러리
export default function QRScanner({ onClose }: { onClose: () => void }) {
  const divRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<unknown>(null);
  const [error, setError] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let html5QrcodeScanner: unknown;

    const startScanner = async () => {
      try {
        // 동적 임포트로 SSR 방지
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        html5QrcodeScanner = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );
        scannerRef.current = html5QrcodeScanner;

        (html5QrcodeScanner as { render: (s: (r: string) => void, e: (err: string) => void) => void }).render(
          (decodedText: string) => {
            // QR 코드가 SOP URL인지 확인 후 라우팅
            try {
              const url = new URL(decodedText);
              if (url.pathname.startsWith("/sop/")) {
                onClose();
                router.push(url.pathname);
                return;
              }
            } catch {
              // URL이 아닌 경우 SOP ID로 처리
            }
            // IAI-XXX-XXX-XX 형식의 SOP ID인 경우
            if (/^IAI-[A-Z]{2,3}-\d{3}-\d{2}$/.test(decodedText)) {
              onClose();
              router.push(`/sop/${decodedText}`);
            } else {
              setError(`인식할 수 없는 QR 코드입니다: ${decodedText}`);
            }
          },
          (errorMessage: string) => {
            if (!errorMessage.includes("No MultiFormat Readers")) {
              console.debug("QR scan error:", errorMessage);
            }
          }
        );
        setScanning(true);
      } catch (err) {
        setError("카메라 접근 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.");
        console.error(err);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        try {
          (scannerRef.current as { clear: () => Promise<void> }).clear().catch(() => {});
        } catch {
          // ignore
        }
      }
    };
  }, [router, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      <div className="bg-white p-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">QR 코드 스캔</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-slate-100 text-slate-700 font-semibold"
          aria-label="닫기"
        >
          닫기
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-sm">
            <div className="text-4xl mb-3">📷</div>
            <p className="text-red-700 font-medium">{error}</p>
            <button onClick={() => setError("")} className="mt-4 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold">
              다시 시도
            </button>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            <div id="qr-reader" ref={divRef} className="rounded-2xl overflow-hidden" />
            {!scanning && (
              <p className="text-center text-white mt-4 text-sm">카메라 초기화 중...</p>
            )}
            <p className="text-center text-slate-300 mt-4 text-sm">
              실험 기기/장비에 부착된 QR 코드를 스캔하세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
