import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const pdfsDir = path.join(process.cwd(), "public", "pdfs");
    if (!fs.existsSync(pdfsDir)) return NextResponse.json([]);

    const files = fs.readdirSync(pdfsDir)
      .filter(f => f.toLowerCase().endsWith(".pdf"))
      .sort()
      .map(file => {
        const nameWithoutExt = file.substring(0, file.lastIndexOf("."));
        const title = nameWithoutExt.replace(/_/g, " ");
        // 코드 파싱: ECT-001-F01-02 등
        const codeMatch = file.match(/^(IAI-)?([A-Z]+)-(\d+)/i);
        const category = codeMatch ? codeMatch[2].toUpperCase() : "기타";
        const isForm = /-[FH]\d+/i.test(nameWithoutExt);
        return {
          filename: file,
          url: `/pdfs/${file}`,
          title: isForm ? `📋 ${title}` : `📖 ${title}`,
          category,
          isForm,
        };
      });

    return NextResponse.json(files);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
