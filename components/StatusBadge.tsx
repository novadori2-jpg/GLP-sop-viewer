"use client";
import type { SOPStatus } from "@/lib/sop-data";

const STATUS_CONFIG: Record<SOPStatus, { label: string; className: string; icon: string }> = {
  effective: {
    label: "현재 유효 (Effective)",
    className: "bg-green-100 text-green-800 border-green-300",
    icon: "✓",
  },
  superseded: {
    label: "개정 폐기 (Superseded)",
    className: "bg-red-100 text-red-800 border-red-300",
    icon: "⚠",
  },
  retired: {
    label: "완전 폐기 (Retired)",
    className: "bg-gray-100 text-gray-600 border-gray-300",
    icon: "✕",
  },
};

export default function StatusBadge({ status, large }: { status: SOPStatus; large?: boolean }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded-lg font-semibold ${cfg.className} ${
        large ? "px-4 py-2 text-base" : "px-2.5 py-1 text-xs"
      }`}
    >
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}
