"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const router = useRouter();

  // 디바운스 검색
  useEffect(() => {
    const timer = setTimeout(() => {
      if (value.trim()) {
        router.push(`/?q=${encodeURIComponent(value.trim())}`);
      } else {
        router.push("/");
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value, router]);

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="search"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="SOP 번호, 제목, 키워드로 검색..."
        className="w-full pl-12 pr-4 py-4 text-base rounded-2xl border-2 border-slate-200 bg-white
          focus:outline-none focus:border-blue-500 shadow-sm placeholder:text-slate-400"
        aria-label="SOP 검색"
      />
      {value && (
        <button
          onClick={() => setValue("")}
          className="absolute inset-y-0 right-0 pr-4 flex items-center min-h-0"
          aria-label="검색 초기화"
        >
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
