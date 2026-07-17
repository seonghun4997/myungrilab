// 검색엔진 규칙 — 어드민과 개인 링크(감정서/인연함)는 색인 금지
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/r/", "/m/", "/proto", "/my"],
      },
    ],
  };
}
