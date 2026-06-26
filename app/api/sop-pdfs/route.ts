import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sopId = searchParams.get("sopId");

    if (!sopId) {
      return NextResponse.json({ error: "sopId parameter is required" }, { status: 400 });
    }

    // 예: IAI-ECT-001-05 -> sopNumber: IAI-ECT-001 -> category: ect, numberPart: 001
    const sopNumber = sopId.replace(/-\d{2}$/, "");
    const cleanNumber = sopNumber.replace(/^IAI-/, "");
    const parts = cleanNumber.split("-");
    const currentCategory = parts[0]?.toLowerCase() || "";
    const currentNumber = parts[1] || "";

    const pdfsDir = path.join(process.cwd(), "public", "pdfs");

    if (!fs.existsSync(pdfsDir)) {
      return NextResponse.json([]);
    }

    const files = fs.readdirSync(pdfsDir);
    const matchedPdfs = files
      .filter((file) => {
        const lowerFile = file.toLowerCase();
        if (!lowerFile.endsWith(".pdf")) return false;

        // 파일명에서 카테고리와 일련번호를 엄격하게 파싱
        // 예: ect-001-f01-02_어류... -> [1]: iai- (optional), [2]: ect (category), [3]: 001 (number)
        const fileCodeMatch = lowerFile.match(/^(iai-)?([a-z]+)-(\d+)/i);
        if (!fileCodeMatch) return false;

        const fileCategory = fileCodeMatch[2]?.toLowerCase();
        const fileNumber = fileCodeMatch[3];

        // 현재 SOP의 카테고리(예: gms)와 일련번호(예: 001)가 완벽히 일치해야 매칭
        return fileCategory === currentCategory && fileNumber === currentNumber;
      })
      .map((file) => {
        const nameWithoutExt = file.substring(0, file.lastIndexOf("."));
        // 파일 표시용 타이틀 가공 (언더바를 공백으로 치환)
        let title = nameWithoutExt.replace(/_/g, " ");

        // 지침서 본문 여부 확인
        // 파일명에 SOP ID가 직접 포함되어 있거나, HForm/F01/F02 등의 서식 단어가 없는 경우 본문으로 가정
        const hasFormKeyword = /-[f|h]\d+/i.test(nameWithoutExt) || nameWithoutExt.toLowerCase().includes("기록지");
        const isMain = !hasFormKeyword && (
          nameWithoutExt.toLowerCase().includes(sopId.toLowerCase()) ||
          nameWithoutExt.toLowerCase().includes(sopNumber.toLowerCase())
        );

        return {
          filename: file,
          url: `/pdfs/${file}`,
          title: isMain ? `📖 지침서: ${title}` : `📋 양식: ${title}`,
          isMain,
        };
      })
      // 본문 지침서가 상단으로 오고, 그 뒤는 파일명 오름차순 정렬
      .sort((a, b) => {
        if (a.isMain && !b.isMain) return -1;
        if (!a.isMain && b.isMain) return 1;
        return a.filename.localeCompare(b.filename);
      });

    return NextResponse.json(matchedPdfs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
