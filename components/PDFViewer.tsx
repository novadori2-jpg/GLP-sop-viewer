"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  pdfUrl: string;
}

export default function PDFViewer({ pdfUrl }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pdfUrl) return;

    let cancelled = false;

    async function renderPDF() {
      setLoading(true);
      setError("");
      if (containerRef.current) containerRef.current.innerHTML = "";

      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

        const pdf = await pdfjsLib.getDocument({ url: pdfUrl }).promise;
        if (cancelled) return;

        setNumPages(pdf.numPages);

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;

          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.8 });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.display = "block";
          canvas.style.marginBottom = "8px";
          canvas.style.borderRadius = "4px";
          canvas.style.boxShadow = "0 1px 4px rgba(0,0,0,0.15)";

          const ctx = canvas.getContext("2d")!;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (page.render as any)({ canvasContext: ctx, viewport }).promise;

          if (cancelled) return;
          containerRef.current?.appendChild(canvas);
        }

        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          setError("PDF를 불러오지 못했습니다. [" + msg + "]");
          setLoading(false);
        }
      }
    }

    renderPDF();
    return () => { cancelled = true; };
  }, [pdfUrl]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm gap-2">
        <span>⚠️ {error}</span>
        <a href={pdfUrl} download className="text-blue-500 underline text-xs">직접 다운로드</a>
      </div>
    );
  }

  return (
    <div className="relative">
      {loading && (
        <div className="flex items-center justify-center h-48 text-slate-400 text-xs gap-2">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
          PDF 로딩 중... {numPages > 0 && `(${numPages}페이지)`}
        </div>
      )}
      <div ref={containerRef} className="bg-slate-100 rounded-lg p-2" />
    </div>
  );
}
