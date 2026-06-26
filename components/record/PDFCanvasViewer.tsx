"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { CurrentUser, TypedTextItem, CanvasSignatureItem, StrikeThroughItem } from "@/lib/record-data";
import SignatureModal from "./SignatureModal";
import StrikeCorrectionModal from "./StrikeCorrectionModal";


interface Props {
  pdfUrl: string;
  drawings: Record<number, string>; // 페이지 번호(1-based) -> base64
  readOnly: boolean;
  onDraw: (page: number, base64: string) => void;
  onAttemptEdit?: () => void; // readOnly 상태에서 터치 시 수정 이력 팝업 유도용

  typedTexts?: Record<number, TypedTextItem[]>;
  canvasSignatures?: Record<number, CanvasSignatureItem[]>;
  strikeThroughs?: Record<number, StrikeThroughItem[]>;
  onDrawText?: (page: number, items: TypedTextItem[]) => void;
  onDrawSignature?: (page: number, items: CanvasSignatureItem[]) => void;
  onDrawStrike?: (page: number, items: StrikeThroughItem[]) => void;
  currentUser: CurrentUser;
}

export default function PDFCanvasViewer({
  pdfUrl,
  drawings,
  readOnly,
  onDraw,
  onAttemptEdit,
  typedTexts = {},
  canvasSignatures = {},
  strikeThroughs = {},
  onDrawText,
  onDrawSignature,
  onDrawStrike,
  currentUser,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [loading, setLoading] = useState(true);
  
  // 도구 상태 확장: 펜, 지우개, 텍스트, 서명, 취선
  const [tool, setTool] = useState<"pen" | "eraser" | "text" | "signature" | "strikethrough">("pen");
  const [penSize, setPenSize] = useState<number>(2);
  // 서명 이름/날짜 표기 위치: "below"=서명 하단, "left"=서명 좌측
  const [sigLabelPos, setSigLabelPos] = useState<"below" | "left">("below");

  // 입력 모달/팝업 상태
  const [activeTextInput, setActiveTextInput] = useState<{ pageNumber: number; x: number; y: number } | null>(null);
  const [activeSigInput, setActiveSigInput] = useState<{ pageNumber: number; x: number; y: number } | null>(null);
  const [activeStrikeInput, setActiveStrikeInput] = useState<{
    pageNumber: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);

  // 문서 내에 서명이 하나라도 들어갔는지 판별
  const hasSignature = Object.values(canvasSignatures).some((arr) => arr && arr.length > 0);

  // 1. PDF.js CDN 비동기 로딩
  useEffect(() => {
    const loadPdfjs = async () => {
      setLoading(true);
      if (!(window as any).pdfjsLib) {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.onload = async () => {
          const pdfjsLib = (window as any).pdfjsLib;
          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          await loadDocument(pdfjsLib);
        };
        document.body.appendChild(script);
      } else {
        await loadDocument((window as any).pdfjsLib);
      }
    };

    const loadDocument = async (pdfjsLib: any) => {
      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch (err) {
        console.error("PDF 로딩 실패:", err);
        setLoading(false);
      }
    };

    loadPdfjs();
  }, [pdfUrl]);

  // 2. 화면 너비에 맞춘 스케일 계산
  useEffect(() => {
    if (!pdfDoc) return;
    const handleResize = async () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const firstPage = await pdfDoc.getPage(1);
      const originalWidth = firstPage.getViewport({ scale: 1 }).width;
      
      const calculatedScale = (width - 16) / originalWidth;
      setScale(calculatedScale > 0.3 ? calculatedScale : 0.8);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [pdfDoc]);

  // 서명이 들어갔을 때 자동으로 지우개 툴을 해제하고 취선 툴 등으로 전환되도록 처리
  useEffect(() => {
    if (hasSignature && tool === "eraser") {
      setTool("strikethrough");
    }
  }, [hasSignature, tool]);

  const handleAddText = (page: number, x: number, y: number, text: string) => {
    const newItem = { id: uuidv4(), x, y, text };
    const list = typedTexts[page] ?? [];
    onDrawText?.(page, [...list, newItem]);
  };

  const handleAddSignature = (signatureImage: string) => {
    if (!activeSigInput) return;
    const { pageNumber, x, y } = activeSigInput;

    // 역할 제한: 검토자(reviewer) 서명은 기존 작성자(author) 서명이 최소 1개 있어야 가능
    const allSigs = Object.values(canvasSignatures).flat();
    const hasAuthorSig = allSigs.some((s) => s?.userRole === "author");

    if (currentUser.signingAs === "reviewer" && !hasAuthorSig) {
      alert("⚠️ 작성자(연구원) 서명이 최소 1개 이상 등록된 이후에 검토자 서명을 진행할 수 있습니다.");
      setActiveSigInput(null);
      return;
    }

    const newItem: CanvasSignatureItem = {
      id: uuidv4(),
      x,
      y,
      signatureImage,
      userName: currentUser.name,
      userId: currentUser.id,
      userRole: currentUser.signingAs === "reviewer" ? "reviewer" : "author",
      signedAt: new Date().toISOString(),
      labelPos: sigLabelPos, // 서명 시점의 레이블 위치를 해당 서명에 일대일로 저장
    };

    const list = canvasSignatures[pageNumber] ?? [];
    onDrawSignature?.(pageNumber, [...list, newItem]);
    setActiveSigInput(null);
  };

  const handleAddStrikeThrough = (reason: string, newValue?: string, correctionSignature?: string) => {
    if (!activeStrikeInput) return;
    const { pageNumber, startX, startY, endX, endY } = activeStrikeInput;

    const newItem: StrikeThroughItem = {
      id: uuidv4(),
      startX,
      startY,
      endX,
      endY,
      reason,
      newValue,
      correctionSignature,
      userName: currentUser.name,
      userId: currentUser.id,
      editedAt: new Date().toISOString(),
    };

    const list = strikeThroughs[pageNumber] ?? [];
    onDrawStrike?.(pageNumber, [...list, newItem]);
    setActiveStrikeInput(null);
  };

  const handleEraseAt = (page: number, x: number, y: number) => {
    // 1) 텍스트 지우기 (클릭 위치 반경 3% 이내)
    const listText = typedTexts[page] ?? [];
    const filteredText = listText.filter((t) => Math.hypot(t.x - x, t.y - y) > 0.03);
    if (filteredText.length !== listText.length) {
      onDrawText?.(page, filteredText);
    }

    // 2) 본문 서명 지우기 (클릭 위치 반경 4% 이내, 오직 draft일 때만 가능)
    const listSig = canvasSignatures[page] ?? [];
    const filteredSig = listSig.filter((s) => Math.hypot(s.x - x, s.y - y) > 0.04);
    if (filteredSig.length !== listSig.length) {
      onDrawSignature?.(page, filteredSig);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-2xl p-6 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
        <p className="text-sm font-semibold">PDF 서식을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-4 w-full">
      {/* 툴바 */}
      {!readOnly && (
        <div className="sticky top-[60px] z-30 bg-slate-900 text-white rounded-xl px-4 py-2.5 flex items-center gap-2 flex-wrap shadow-md">
          <span className="text-xs text-slate-400 mr-1">도구:</span>
          <button
            onClick={() => setTool("pen")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tool === "pen" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            ✏️ 펜 필기
          </button>
          
          {!hasSignature ? (
            <button
              onClick={() => setTool("eraser")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tool === "eraser" ? "bg-red-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              🧹 지우개
            </button>
          ) : (
            <span className="text-[10px] text-amber-500 bg-amber-950/40 border border-amber-900/40 px-2.5 py-1.5 rounded-lg font-semibold select-none">
              🔒 GLP 서명 완료 (지우개 제한)
            </span>
          )}

          <button
            onClick={() => setTool("text")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tool === "text" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            🔤 텍스트 입력
          </button>

          <button
            onClick={() => setTool("signature")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tool === "signature" ? "bg-green-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            ✍️ 본문 서명
          </button>

          {hasSignature && (
            <button
              onClick={() => setTool("strikethrough")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tool === "strikethrough" ? "bg-red-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              ❌ 취선 (수정선)
            </button>
          )}

          {tool === "pen" && (
            <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
              <span className="text-xs text-slate-400">두께:</span>
              {[1, 2, 4].map((size) => (
                <button
                  key={size}
                  onClick={() => setPenSize(size)}
                  className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                    penSize === size ? "border-blue-500 bg-blue-900/50" : "border-slate-600 bg-slate-800 hover:bg-slate-700"
                  }`}
                >
                  <div className="rounded-full bg-white" style={{ width: size * 2, height: size * 2 }} />
                </button>
              ))}
            </div>
          )}

          {/* 서명 이름/날짜 위치 토글 */}
          {tool === "signature" && (
            <div className="flex items-center gap-1.5 border-l border-slate-700 pl-3">
              <span className="text-xs text-slate-400">이름/날짜:</span>
              <button
                onClick={() => setSigLabelPos("below")}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  sigLabelPos === "below" ? "bg-green-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                하단
              </button>
              <button
                onClick={() => setSigLabelPos("left")}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                  sigLabelPos === "left" ? "bg-green-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                좌측
              </button>
            </div>
          )}
        </div>
      )}

      {/* PDF 페이지 리스트 */}
      <div className="space-y-4">
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
          <PDFPageRow
            key={pageNumber}
            pdfDoc={pdfDoc}
            pageNumber={pageNumber}
            scale={scale}
            drawingData={drawings[pageNumber]}
            readOnly={readOnly}
            tool={tool}
            penSize={penSize}
            sigLabelPos={sigLabelPos}
            onDraw={(data) => onDraw(pageNumber, data)}
            onAttemptEdit={onAttemptEdit}
            typedTexts={typedTexts[pageNumber]}
            canvasSignatures={canvasSignatures[pageNumber]}
            strikeThroughs={strikeThroughs[pageNumber]}
            onEraseTextSig={(x, y) => handleEraseAt(pageNumber, x, y)}
            activeTextInput={activeTextInput}
            setActiveTextInput={setActiveTextInput}
            activeSigInput={activeSigInput}
            setActiveSigInput={setActiveSigInput}
            activeStrikeInput={activeStrikeInput}
            setActiveStrikeInput={setActiveStrikeInput}
            onAddText={(x, y, text) => handleAddText(pageNumber, x, y, text)}
          />
        ))}
      </div>

      {/* 서명 모달 팝업 */}
      <SignatureModal
        isOpen={activeSigInput !== null}
        userName={currentUser.name}
        userRole={currentUser.signingAs ?? "author"}
        onConfirm={handleAddSignature}
        onCancel={() => setActiveSigInput(null)}
      />

      {/* 취선 수정 모달 팝업 — 변경내용 + 수정사유 + 서명 3단계 폼 */}
      {activeStrikeInput && (
        <StrikeCorrectionModal
          userName={currentUser.name}
          onConfirm={(reason, newValue, correctionSignature) => handleAddStrikeThrough(reason, newValue, correctionSignature)}
          onCancel={() => setActiveStrikeInput(null)}
        />
      )}
    </div>
  );
}

// 개별 페이지 서브 컴포넌트 interface
interface PageRowProps {
  pdfDoc: any;
  pageNumber: number;
  scale: number;
  drawingData?: string;
  readOnly: boolean;
  tool: "pen" | "eraser" | "text" | "signature" | "strikethrough";
  penSize: number;
  sigLabelPos: "below" | "left";
  onDraw: (base64: string) => void;
  onAttemptEdit?: () => void;
  
  typedTexts?: TypedTextItem[];
  canvasSignatures?: CanvasSignatureItem[];
  strikeThroughs?: StrikeThroughItem[];
  onEraseTextSig: (x: number, y: number) => void;

  activeTextInput: { pageNumber: number; x: number; y: number } | null;
  setActiveTextInput: (val: { pageNumber: number; x: number; y: number } | null) => void;
  activeSigInput: { pageNumber: number; x: number; y: number } | null;
  setActiveSigInput: (val: { pageNumber: number; x: number; y: number } | null) => void;
  activeStrikeInput: { pageNumber: number; startX: number; startY: number; endX: number; endY: number } | null;
  setActiveStrikeInput: (val: { pageNumber: number; startX: number; startY: number; endX: number; endY: number } | null) => void;
  
  onAddText: (x: number, y: number, text: string) => void;
}

function PDFPageRow({
  pdfDoc,
  pageNumber,
  scale,
  drawingData,
  readOnly,
  tool,
  penSize,
  sigLabelPos,
  onDraw,
  onAttemptEdit,
  typedTexts = [],
  canvasSignatures = [],
  strikeThroughs = [],
  onEraseTextSig,
  activeTextInput,
  setActiveTextInput,
  activeSigInput,
  setActiveSigInput,
  activeStrikeInput,
  setActiveStrikeInput,
  onAddText,
}: PageRowProps) {
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [drawing, setDrawing] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const lastDrawnBase64 = useRef<string | undefined>(drawingData);
  const imageCache = useRef<Record<string, HTMLImageElement>>({});

  // 임시 취선 드래그용 실시간 드래깅선 상태
  const [tempLine, setTempLine] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);

  // 1. PDF.js 페이지 렌더링
  useEffect(() => {
    let active = true;
    let renderTask: any = null;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        
        const width = viewport.width;
        const height = viewport.height;
        
        if (!active) return;
        setDimensions({ width, height });

        const canvas = pdfCanvasRef.current;
        if (canvas) {
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d")!;
          
          const renderContext = {
            canvasContext: ctx,
            viewport: viewport,
          };
          renderTask = page.render(renderContext);
          await renderTask.promise;
        }
      } catch (err: any) {
        if (err.name === "RenderingCancelledException" || err.message?.includes("cancelled")) {
          // Safe to ignore
        } else {
          console.error(`페이지 ${pageNumber} 렌더링 실패:`, err);
        }
      }
    };

    renderPage();

    return () => {
      active = false;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageNumber, scale]);

  // 타이핑 텍스트, 본문 서명, 취선을 캔버스 위에 합성하여 렌더링하는 헬퍼
  const renderStaticElements = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // 1) 텍스트 타이핑 렌더링
    if (typedTexts.length > 0) {
      ctx.fillStyle = "#000000";
      ctx.font = `${14 * (w / 800)}px sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      typedTexts.forEach((item) => {
        ctx.fillText(item.text, item.x * w, item.y * h);
      });
    }

    // 2) 본문 서명 렌더링 (서명 이미지 + 이름/날짜 정보 합성)
    if (canvasSignatures.length > 0) {
      canvasSignatures.forEach((item) => {
        const sigW = 100 * (w / 800);
        const sigH = 40 * (w / 800);
        const fontSize = 8 * (w / 800);
        const lineH = fontSize + 3;
        const d = new Date(item.signedAt);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

        const drawSig = (img: HTMLImageElement) => {
          ctx.drawImage(img, item.x * w - sigW / 2, item.y * h - sigH / 2, sigW, sigH);

          ctx.fillStyle = "#1e40af";
          ctx.font = `bold ${fontSize}px sans-serif`;

          // 서명별로 독립 저장된 labelPos 사용 (item.labelPos 없으면 below 기본값)
          if (item.labelPos === "left") {
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            ctx.fillText(item.userName, item.x * w - sigW / 2 - 5, item.y * h - lineH / 2);
            ctx.fillText(dateStr, item.x * w - sigW / 2 - 5, item.y * h + lineH / 2);
          } else {
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(item.userName, item.x * w, item.y * h + sigH / 2 + 2);
            ctx.fillText(dateStr, item.x * w, item.y * h + sigH / 2 + lineH + 2);
          }
        };

        if (imageCache.current[item.id]) {
          drawSig(imageCache.current[item.id]);
        } else {
          const img = new Image();
          img.onload = () => {
            imageCache.current[item.id] = img;
            drawSig(img);
          };
          img.src = item.signatureImage;
        }
      });
    }

    // 3) 적색 취선(수정선) 렌더링 — 스마트 레이블 배치 + 변경내용 + 수정서명 렌더링
    if (strikeThroughs.length > 0) {
      strikeThroughs.forEach((item) => {
        // 취선 그리기
        ctx.beginPath();
        ctx.moveTo(item.startX * w, item.startY * h);
        ctx.lineTo(item.endX * w, item.endY * h);
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2 * (w / 800);
        ctx.stroke();

        // 수정자 + 사유 + 날짜 스탬프 — 스마트 배치
        const fontSize = 7.5 * (w / 800);
        ctx.fillStyle = "#ef4444";
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textBaseline = "middle";
        const d = new Date(item.editedAt);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        // 라벨: 변경내용이 있으면 포함
        const label = item.newValue
          ? `[수정: ${item.reason} / 바꿀값: ${item.newValue} / ${dateStr} / ${item.userName}]`
          : `[수정: ${item.reason} / ${dateStr} / ${item.userName}]`;

        // 취선 끝점이 우측 55% 이상이면 취선 위에, 아니면 우측에 배치
        const isRightEdge = item.endX > 0.55;
        if (isRightEdge) {
          ctx.textAlign = "right";
          ctx.fillText(label, Math.max(item.startX, item.endX) * w, Math.min(item.startY, item.endY) * h - fontSize - 2);
        } else {
          ctx.textAlign = "left";
          ctx.fillText(label, item.endX * w + 6, item.endY * h);
        }
      });
    }
  }, [typedTexts, canvasSignatures, strikeThroughs, sigLabelPos]);

  // 2. 드로잉용 캔버스 크기 제어 및 드로잉 복원 + 정적 요소(텍스트/서명/취선) 리렌더
  useEffect(() => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas || dimensions.width === 0 || dimensions.height === 0) return;

    const sizeChanged = drawCanvas.width !== dimensions.width || drawCanvas.height !== dimensions.height;
    if (sizeChanged) {
      drawCanvas.width = dimensions.width;
      drawCanvas.height = dimensions.height;
      lastDrawnBase64.current = undefined; // 크기 변경 시 강제 리드로우
    }

    const ctx = drawCanvas.getContext("2d")!;
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    if (drawingData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);
        renderStaticElements(ctx, dimensions.width, dimensions.height);
      };
      img.src = drawingData;
    } else {
      renderStaticElements(ctx, dimensions.width, dimensions.height);
    }
    lastDrawnBase64.current = drawingData;
  }, [drawingData, dimensions, renderStaticElements]);

  // 3. 모바일 터치 스크롤링 가로채기 (필기 도중 화면이 움직이는 현상 방지)
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const preventDefault = (e: TouchEvent) => {
      if (!readOnly && (tool === "pen" || tool === "strikethrough")) {
        e.preventDefault();
      }
    };
    canvas.addEventListener("touchstart", preventDefault, { passive: false });
    canvas.addEventListener("touchmove", preventDefault, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", preventDefault);
      canvas.removeEventListener("touchmove", preventDefault);
    };
  }, [readOnly, tool]);

  const getPos = (e: React.PointerEvent): { x: number; y: number } => {
    const rect = drawCanvasRef.current!.getBoundingClientRect();
    const scaleX = drawCanvasRef.current!.width / rect.width;
    const scaleY = drawCanvasRef.current!.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const getRatios = (e: React.PointerEvent): { x: number; y: number } => {
    const rect = drawCanvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (readOnly) {
      e.preventDefault();
      onAttemptEdit?.();
      return;
    }
    e.preventDefault();

    const ratios = getRatios(e);

    // 1) 텍스트 도구 선택 시 타이핑 인풋 팝업 배치
    if (tool === "text") {
      setActiveTextInput({ pageNumber, x: ratios.x, y: ratios.y });
      return;
    }

    // 2) 본문 서명 도구 선택 시 서명 위치 예약 및 모달 오픈
    if (tool === "signature") {
      setActiveSigInput({ pageNumber, x: ratios.x, y: ratios.y });
      return;
    }

    // 3) 지우개 도구 클릭 시 주위 텍스트/서명 삭제
    if (tool === "eraser") {
      onEraseTextSig(ratios.x, ratios.y);
      return;
    }

    // 4) 취선 도구 클릭 시 취선 시작점 셋팅
    if (tool === "strikethrough") {
      setDrawing(true);
      lastPos.current = getPos(e);
      setTempLine({ startX: ratios.x, startY: ratios.y, endX: ratios.x, endY: ratios.y });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // 5) 기본 펜 필기 시작
    if (tool === "pen") {
      setDrawing(true);
      lastPos.current = getPos(e);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drawing || readOnly || !drawCanvasRef.current) return;
    e.preventDefault();
    
    const pos = getPos(e);
    const ratios = getRatios(e);

    // 취선 드래깅 시 실시간 SVG 렌더링용 임시 라인 갱신
    if (tool === "strikethrough") {
      setTempLine((prev) => (prev ? { ...prev, endX: ratios.x, endY: ratios.y } : null));
      return;
    }

    // 펜 필기 선 그리기
    if (tool === "pen") {
      const ctx = drawCanvasRef.current.getContext("2d")!;
      const pressure = e.pressure > 0 ? e.pressure : 1;

      ctx.beginPath();
      ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#1e3a8a"; 
      ctx.lineWidth = penSize * pressure;
      ctx.stroke();
      lastPos.current = pos;
    }
  }, [drawing, readOnly, tool, penSize]);

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drawing) return;
    setDrawing(false);
    lastPos.current = null;

    // 1) 취선 드래그 종료 -> 수정 사유 팝업창 오픈 유도
    if (tool === "strikethrough" && tempLine) {
      setActiveStrikeInput({
        pageNumber,
        startX: tempLine.startX,
        startY: tempLine.startY,
        endX: tempLine.endX,
        endY: tempLine.endY,
      });
      setTempLine(null);
      return;
    }

    // 2) 펜 필기 종료 시 base64 갱신 저장
    if (tool === "pen" && drawCanvasRef.current) {
      const dataUrl = drawCanvasRef.current.toDataURL("image/png");
      lastDrawnBase64.current = dataUrl;
      onDraw(dataUrl);
    }
  };

  return (
    <div 
      className="relative select-none border border-slate-300 shadow-sm rounded-xl bg-white mx-auto"
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      {/* 1. PDF 렌더링 레이어 */}
      <canvas ref={pdfCanvasRef} style={{ display: "block" }} />
      
      {/* 2. 필기/텍스트/서명 오버레이 레이어 */}
      <canvas
        ref={drawCanvasRef}
        className="absolute inset-0 touch-none cursor-crosshair z-10"
        style={{ display: "block" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />

      {/* 실시간 적색 취선 가이드라인 표시 */}
      {tempLine && (
        <svg className="absolute inset-0 pointer-events-none w-full h-full z-20">
          <line
            x1={`${tempLine.startX * 100}%`}
            y1={`${tempLine.startY * 100}%`}
            x2={`${tempLine.endX * 100}%`}
            y2={`${tempLine.endY * 100}%`}
            stroke="#ef4444"
            strokeWidth={2}
          />
        </svg>
      )}

      {/* 인라인 텍스트 입력창 */}
      {activeTextInput && activeTextInput.pageNumber === pageNumber && (
        <input
          type="text"
          autoFocus
          placeholder="텍스트 입력..."
          className="absolute z-30 bg-white border border-blue-500 rounded px-1.5 py-0.5 text-xs shadow-md font-sans focus:outline-none focus:ring-1 focus:ring-blue-400"
          style={{
            left: `${activeTextInput.x * 100}%`,
            top: `${activeTextInput.y * 100}%`,
            transform: "translate(-3px, -50%)",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const val = (e.target as HTMLInputElement).value;
              if (val.trim()) {
                onAddText(activeTextInput.x, activeTextInput.y, val.trim());
              }
              setActiveTextInput(null);
            } else if (e.key === "Escape") {
              setActiveTextInput(null);
            }
          }}
          onBlur={(e) => {
            const val = e.target.value;
            if (val.trim()) {
              onAddText(activeTextInput.x, activeTextInput.y, val.trim());
            }
            setActiveTextInput(null);
          }}
        />
      )}

      {/* 페이지 번호 배지 */}
      <div className="absolute top-2 left-2 bg-slate-800/80 text-white text-[10px] px-2 py-0.5 rounded font-mono z-10 select-none pointer-events-none">
        p. {pageNumber}
      </div>
    </div>
  );
}
