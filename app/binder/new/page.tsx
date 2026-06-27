"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/record-data";
import { getAllUsers } from "@/lib/auth";
import type { UserCredential } from "@/lib/auth";
import {
  generateStudyNumber, addStudy, getStudiesList,
  STUDY_TYPE_LABELS,
} from "@/lib/study-data";
import type { StudyType, BinderType, BinderForm, StudyInfo } from "@/lib/study-data";

type Step = "type" | "info" | "forms" | "confirm";

interface PdfFile {
  filename: string;
  url: string;
  title: string;
  category: string;
  isForm: boolean;
}

export default function NewBinderPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("type");

  // 바인더 기본 정보
  const [binderType, setBinderType] = useState<BinderType>("study");
  const [studyType, setStudyType] = useState<StudyType>("F");
  const [qaTargetStudyNumber, setQaTargetStudyNumber] = useState("");
  const [generatedNumber, setGeneratedNumber] = useState("");
  const [sdId, setSdId] = useState("");
  const [qapId, setQapId] = useState("");
  const [tfmId, setTfmId] = useState("");

  // 서식 선택: url -> 수량
  const [pdfs, setPdfs] = useState<PdfFile[]>([]);
  const [selectedForms, setSelectedForms] = useState<Record<string, number>>({});
  const [pdfSearch, setPdfSearch] = useState("");

  const [users, setUsers] = useState<UserCredential[]>([]);
  const [studies, setStudies] = useState<StudyInfo[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.push("/login"); return; }
    setUsers(getAllUsers());
    setStudies(getStudiesList().filter(s => s.binderType === "study"));
  }, [router]);

  // 시험번호 미리보기 갱신
  useEffect(() => {
    if (binderType === "study") {
      setGeneratedNumber(generateStudyNumber(studyType, false));
    } else {
      if (qaTargetStudyNumber) {
        setGeneratedNumber("QA " + qaTargetStudyNumber);
      } else {
        setGeneratedNumber("");
      }
    }
  }, [binderType, studyType, qaTargetStudyNumber]);

  // PDF 목록 로드
  useEffect(() => {
    if (step === "forms") {
      fetch("/api/all-pdfs").then(r => r.json()).then(setPdfs);
    }
  }, [step]);

  const sdUsers = users.filter(u => u.role === "sd");
  const qapUsers = users.filter(u => u.role === "qap");
  const tfmUsers = users.filter(u => u.role === "tfm");

  const getUser = (id: string) => users.find(u => u.id === id);

  const filteredPdfs = pdfs.filter(p =>
    p.title.toLowerCase().includes(pdfSearch.toLowerCase()) ||
    p.filename.toLowerCase().includes(pdfSearch.toLowerCase())
  );

  const toggleForm = (url: string) => {
    setSelectedForms(prev => {
      if (url in prev) {
        const next = { ...prev };
        delete next[url];
        return next;
      }
      return { ...prev, [url]: 1 };
    });
  };

  const setFormQty = (url: string, qty: number) => {
    if (qty < 1) return;
    setSelectedForms(prev => ({ ...prev, [url]: qty }));
  };

  const selectedUrls = Object.keys(selectedForms);

  const canGoNext = () => {
    if (step === "type") return true;
    if (step === "info") {
      if (!sdId || !qapId) return false;
      if (binderType === "qa" && (!tfmId || !qaTargetStudyNumber)) return false;
      return true;
    }
    if (step === "forms") return selectedUrls.length > 0;
    return true;
  };

  const next = () => {
    if (step === "type") setStep("info");
    else if (step === "info") setStep("forms");
    else if (step === "forms") setStep("confirm");
  };

  const handleCreate = async () => {
    setSaving(true);
    const sd = getUser(sdId)!;
    const qap = getUser(qapId)!;
    const tfm = tfmId ? getUser(tfmId) : undefined;

    const forms: BinderForm[] = selectedUrls.map(url => {
      const pdf = pdfs.find(p => p.url === url)!;
      return {
        sopId: "",
        sopNumber: pdf.category,
        formTitle: pdf.title.replace(/^📋 |^📖 /, ""),
        pdfPath: url,
        quantity: selectedForms[url] ?? 1,
      };
    });

    const now = new Date().toISOString();
    const study: StudyInfo = {
      studyNumber: generatedNumber,
      binderType,
      studyType: binderType === "study" ? studyType : undefined,
      qaTargetStudyNumber: binderType === "qa" ? qaTargetStudyNumber : undefined,
      title: binderType === "study"
        ? `${STUDY_TYPE_LABELS[studyType]} ${generatedNumber}`
        : `QA 점검 바인더 (${qaTargetStudyNumber})`,
      testSubstance: "",
      status: "ongoing",
      startDate: now.slice(0, 10),
      sdId,
      directorName: sd.name,
      qapId,
      qaName: qap.name,
      tfmId: tfm?.id,
      tfmName: tfm?.name,
      requiredForms: forms,
      createdAt: now,
    };

    addStudy(study);
    router.push(`/study/${encodeURIComponent(generatedNumber)}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-slate-100 text-slate-700 cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <p className="text-xs text-slate-400">새 바인더 생성</p>
            <h1 className="text-base font-bold text-slate-900">
              {step === "type" && "바인더 종류 선택"}
              {step === "info" && "담당자 지정"}
              {step === "forms" && "기록지 선택"}
              {step === "confirm" && "생성 확인"}
            </h1>
          </div>
          {/* 진행 단계 */}
          <div className="flex gap-1">
            {(["type","info","forms","confirm"] as Step[]).map((s, i) => (
              <div key={s} className={`w-2 h-2 rounded-full ${step === s ? "bg-blue-600" : i < ["type","info","forms","confirm"].indexOf(step) ? "bg-blue-300" : "bg-slate-200"}`} />
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-4">

        {/* STEP 1: 바인더 종류 */}
        {step === "type" && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">어떤 바인더를 만드시겠습니까?</p>
            {[
              { type: "study" as BinderType, icon: "🧪", title: "시험 바인더", desc: "GLP 시험 기록지 묶음 (어류/물벼룩/조류 등)" },
              { type: "qa" as BinderType, icon: "🔍", title: "QA 바인더", desc: "신뢰성보증 점검 기록지 묶음" },
            ].map(opt => (
              <button key={opt.type} onClick={() => setBinderType(opt.type)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  binderType === opt.type ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"
                }`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{opt.icon}</span>
                  <div>
                    <p className="font-bold text-slate-900">{opt.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                  {binderType === opt.type && <span className="ml-auto text-blue-600 font-bold">✓</span>}
                </div>
              </button>
            ))}

            {/* 시험 종류 선택 (시험 바인더) */}
            {binderType === "study" && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <p className="text-sm font-bold text-slate-700">시험 종류</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["F","D","A"] as StudyType[]).map(t => (
                    <button key={t} onClick={() => setStudyType(t)}
                      className={`p-3 rounded-xl border-2 text-center cursor-pointer transition-all ${
                        studyType === t ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"
                      }`}>
                      <p className="text-xl font-black text-slate-800">{t}</p>
                      <p className="text-[10px] text-slate-500 mt-1 leading-tight">{STUDY_TYPE_LABELS[t].split(" ")[0]}</p>
                    </button>
                  ))}
                </div>
                {generatedNumber && (
                  <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center gap-2">
                    <span className="text-xs text-blue-600 font-medium">자동 부여 시험번호</span>
                    <span className="font-black text-blue-800 text-base tracking-widest ml-auto">{generatedNumber}</span>
                  </div>
                )}
              </div>
            )}

            {/* QA 바인더: 대상 시험 선택 */}
            {binderType === "qa" && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <p className="text-sm font-bold text-slate-700">점검 대상 시험번호</p>
                {studies.length === 0 ? (
                  <p className="text-sm text-slate-400">등록된 시험 바인더가 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {studies.map(s => (
                      <button key={s.studyNumber} onClick={() => setQaTargetStudyNumber(s.studyNumber)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                          qaTargetStudyNumber === s.studyNumber ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"
                        }`}>
                        <span className="font-bold text-slate-900 text-sm">{s.studyNumber}</span>
                        <span className="text-xs text-slate-400 ml-2">{s.directorName}</span>
                      </button>
                    ))}
                  </div>
                )}
                {generatedNumber && (
                  <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-center gap-2">
                    <span className="text-xs text-blue-600 font-medium">QA 바인더 번호</span>
                    <span className="font-black text-blue-800 text-base ml-auto">{generatedNumber}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: 담당자 지정 */}
        {step === "info" && (
          <div className="space-y-4">
            <UserSelect label="시험책임자 (SD)" users={sdUsers} value={sdId} onChange={setSdId} />
            <UserSelect label="담당 QAP" users={qapUsers} value={qapId} onChange={setQapId} />
            {binderType === "qa" && (
              <UserSelect label="운영책임자 (TFM)" users={tfmUsers} value={tfmId} onChange={setTfmId} />
            )}
          </div>
        )}

        {/* STEP 3: 기록지 선택 */}
        {step === "forms" && (
          <div className="space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="기록지 검색..."
                value={pdfSearch}
                onChange={e => setPdfSearch(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:border-blue-400"
              />
            </div>
            <p className="text-xs text-slate-400">{selectedUrls.length}종 선택 · 총 {Object.values(selectedForms).reduce((a,b)=>a+b,0)}매</p>
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
              {filteredPdfs.map(pdf => {
                const isSelected = pdf.url in selectedForms;
                const qty = selectedForms[pdf.url] ?? 0;
                return (
                  <div key={pdf.url}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                      isSelected ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"
                    }`}>
                    {/* 체크박스 영역 */}
                    <button onClick={() => toggleForm(pdf.url)} className="cursor-pointer flex-shrink-0">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected ? "border-blue-500 bg-blue-500" : "border-slate-300"
                      }`}>
                        {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                    </button>
                    {/* 제목 */}
                    <div className="min-w-0 flex-1" onClick={() => toggleForm(pdf.url)}>
                      <p className="text-sm font-semibold text-slate-800 truncate">{pdf.title}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{pdf.filename}</p>
                    </div>
                    {/* 수량 조절 */}
                    {isSelected && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => qty <= 1 ? toggleForm(pdf.url) : setFormQty(pdf.url, qty - 1)}
                          className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center cursor-pointer"
                        >−</button>
                        <span className="w-6 text-center text-sm font-bold text-blue-700">{qty}</span>
                        <button
                          onClick={() => setFormQty(pdf.url, qty + 1)}
                          className="w-7 h-7 rounded-lg bg-blue-500 text-white font-bold text-sm flex items-center justify-center cursor-pointer"
                        >+</button>
                        <span className="text-[10px] text-slate-400 ml-0.5">매</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: 확인 */}
        {step === "confirm" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <InfoRow label="바인더 종류" value={binderType === "study" ? "🧪 시험 바인더" : "🔍 QA 바인더"} />
              <InfoRow label="시험번호" value={<span className="font-black text-blue-700 text-base tracking-widest">{generatedNumber}</span>} />
              {binderType === "qa" && <InfoRow label="대상 시험" value={qaTargetStudyNumber} />}
              {binderType === "study" && <InfoRow label="시험 종류" value={STUDY_TYPE_LABELS[studyType]} />}
              <InfoRow label="시험책임자" value={getUser(sdId)?.name ?? ""} />
              <InfoRow label="담당 QAP" value={getUser(qapId)?.name ?? ""} />
              {tfmId && <InfoRow label="운영책임자" value={getUser(tfmId)?.name ?? ""} />}
              <InfoRow label="기록지" value={`${selectedUrls.length}종 · 총 ${Object.values(selectedForms).reduce((a,b)=>a+b,0)}매`} />
            </div>
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2">
              <p className="text-xs font-bold text-slate-500">선택된 기록지</p>
              {selectedUrls.map(url => {
                const pdf = pdfs.find(p => p.url === url);
                const qty = selectedForms[url];
                return (
                  <div key={url} className="flex items-center justify-between text-xs text-slate-700">
                    <span>• {pdf?.title}</span>
                    {qty > 1 && <span className="font-bold text-blue-600">{qty}매</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3">
        <div className="max-w-xl mx-auto flex gap-3">
          {step !== "type" && (
            <button onClick={() => {
              if (step === "info") setStep("type");
              else if (step === "forms") setStep("info");
              else if (step === "confirm") setStep("forms");
            }} className="px-5 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 cursor-pointer">
              이전
            </button>
          )}
          {step !== "confirm" ? (
            <button onClick={next} disabled={!canGoNext()}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-40 cursor-pointer">
              다음
            </button>
          ) : (
            <button onClick={handleCreate} disabled={saving}
              className="flex-1 py-3 rounded-xl bg-green-600 text-white text-sm font-bold disabled:opacity-40 cursor-pointer">
              {saving ? "생성 중..." : "✓ 바인더 생성"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function UserSelect({ label, users, value, onChange }: {
  label: string;
  users: UserCredential[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
      <p className="text-sm font-bold text-slate-700">{label}</p>
      {users.length === 0 ? (
        <p className="text-sm text-slate-400">해당 역할의 계정이 없습니다.</p>
      ) : (
        <div className="space-y-1.5">
          {users.map(u => (
            <button key={u.id} onClick={() => onChange(u.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                value === u.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 text-sm">{u.name}</span>
                  <span className="text-xs text-slate-400 ml-2">{u.department}</span>
                </div>
                {value === u.id && <span className="text-blue-600 font-bold text-sm">✓</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
