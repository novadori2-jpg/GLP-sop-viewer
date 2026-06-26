"use client";
import { CATEGORIES } from "@/lib/sop-data";

const COLOR_MAP: Record<string, string> = {
  blue:   "bg-blue-100 text-blue-800 border-blue-200",
  purple: "bg-purple-100 text-purple-800 border-purple-200",
  green:  "bg-green-100 text-green-800 border-green-200",
  cyan:   "bg-cyan-100 text-cyan-800 border-cyan-200",
  teal:   "bg-teal-100 text-teal-800 border-teal-200",
  orange: "bg-orange-100 text-orange-800 border-orange-200",
  red:    "bg-red-100 text-red-800 border-red-200",
  gray:   "bg-gray-100 text-gray-800 border-gray-200",
};

export default function CategoryBadge({ code }: { code: string }) {
  const cat = CATEGORIES[code];
  if (!cat) return null;
  const colorClass = COLOR_MAP[cat.color] ?? COLOR_MAP.gray;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
      {code} · {cat.name}
    </span>
  );
}
