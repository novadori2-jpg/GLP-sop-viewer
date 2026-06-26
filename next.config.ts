import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF 파일 서빙을 위한 헤더 설정
  async headers() {
    return [
      {
        source: "/pdfs/:path*",
        headers: [
          { key: "Content-Type", value: "application/pdf" },
          { key: "Content-Disposition", value: "inline" },
        ],
      },
    ];
  },
};

export default nextConfig;
