// GLP Audit Trail 로거 + 기록지 DB (v2)
// GLP 규정: 모든 열람·작성·서명 기록을 영구 보관, 삭제 불가

import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { RecordEntry, RecordFormTemplate } from "./record-data";

interface AuditDB extends DBSchema {
  auditLogs: {
    key: string;
    value: {
      id: string;
      sopId: string;
      sopNumber: string;
      sopTitle: string;
      userId: string;
      userName: string;
      action: "view" | "search" | "download";
      timestamp: string;
      deviceInfo: string;
    };
    indexes: { "by-sopId": string; "by-timestamp": string };
  };
  cachedSOPs: {
    key: string;
    value: {
      id: string;
      pdfBlob: ArrayBuffer;
      cachedAt: string;
      expiresAt: string;
    };
  };
  recordEntries: {
    key: string;
    value: RecordEntry;
    indexes: { "by-sopId": string; "by-status": string };
  };
  formTemplates: {
    key: string;
    value: RecordFormTemplate;
    indexes: { "by-sopId": string };
  };
}

let db: IDBPDatabase<AuditDB> | null = null;

async function getDB(): Promise<IDBPDatabase<AuditDB>> {
  if (db) return db;
  db = await openDB<AuditDB>("glp-sop-audit", 2, {
    upgrade(database, oldVersion) {
      // v1 스토어 (기존 유지)
      if (oldVersion < 1) {
        const auditStore = database.createObjectStore("auditLogs", { keyPath: "id" });
        auditStore.createIndex("by-sopId", "sopId");
        auditStore.createIndex("by-timestamp", "timestamp");
        database.createObjectStore("cachedSOPs", { keyPath: "id" });
      }
      // v2 스토어 (신규)
      if (oldVersion < 2) {
        const entryStore = database.createObjectStore("recordEntries", { keyPath: "id" });
        entryStore.createIndex("by-sopId", "sopId");
        entryStore.createIndex("by-status", "status");
        const templateStore = database.createObjectStore("formTemplates", { keyPath: "id" });
        templateStore.createIndex("by-sopId", "sopId");
      }
    },
  });
  return db;
}

// ─── SOP 열람 로그 ─────────────────────────────────────────────────────
export async function logSOPView(params: {
  sopId: string;
  sopNumber: string;
  sopTitle: string;
  action?: "view" | "search" | "download";
}): Promise<void> {
  try {
    const database = await getDB();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await database.put("auditLogs", {
      id,
      sopId: params.sopId,
      sopNumber: params.sopNumber,
      sopTitle: params.sopTitle,
      userId: "anonymous",
      userName: "연구원",
      action: params.action ?? "view",
      timestamp: new Date().toISOString(),
      deviceInfo: navigator.userAgent.substring(0, 100),
    });
  } catch {
    console.warn("Audit log failed (offline?)");
  }
}

// ─── PDF 오프라인 캐시 ─────────────────────────────────────────────────
export async function cachePDF(sopId: string, blob: ArrayBuffer): Promise<void> {
  try {
    const database = await getDB();
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    await database.put("cachedSOPs", {
      id: sopId,
      pdfBlob: blob,
      cachedAt: new Date().toISOString(),
      expiresAt: expires.toISOString(),
    });
  } catch {
    console.warn("Cache write failed");
  }
}

export async function getCachedPDF(sopId: string): Promise<ArrayBuffer | null> {
  try {
    const database = await getDB();
    const cached = await database.get("cachedSOPs", sopId);
    if (!cached) return null;
    if (new Date(cached.expiresAt) < new Date()) {
      await database.delete("cachedSOPs", sopId);
      return null;
    }
    return cached.pdfBlob;
  } catch {
    return null;
  }
}

// ─── 기록지 CRUD ────────────────────────────────────────────────────────
export async function saveRecordEntry(entry: RecordEntry): Promise<void> {
  const database = await getDB();
  await database.put("recordEntries", entry);
}

export async function getRecordEntry(id: string): Promise<RecordEntry | undefined> {
  const database = await getDB();
  return database.get("recordEntries", id);
}

export async function getRecordEntriesBySop(sopId: string): Promise<RecordEntry[]> {
  const database = await getDB();
  // sopNumber 기반 매칭
  const sopNumber = sopId.replace(/-\d{2}$/, "");
  const all = await database.getAll("recordEntries");
  return all
    .filter(e => e.sopNumber === sopNumber)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAllRecordEntries(): Promise<RecordEntry[]> {
  const database = await getDB();
  return database.getAll("recordEntries");
}
