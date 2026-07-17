"use client";
// 최상위(레이아웃 자체) 오류용 — 최소 구성
export default function GlobalError({ error, reset }) {
  return (
    <html lang="ko">
      <body style={{ background: "#0B0A22", color: "#EFEAFF", fontFamily: "sans-serif", textAlign: "center", paddingTop: 120 }}>
        <h1 style={{ fontSize: 20 }}>길이 잠시 어긋났어요</h1>
        <p style={{ fontSize: 13, opacity: .7, margin: "10px 0 22px" }}>새로고침 한 번이면 대부분 돌아와요.</p>
        <button onClick={() => reset()} style={{ padding: "12px 28px", borderRadius: 10, border: "1px solid rgba(255,212,121,.6)", background: "transparent", color: "#FFD479", fontSize: 15, cursor: "pointer" }}>다시 시도하기</button>
        <p style={{ fontSize: 10, opacity: .5, marginTop: 24, wordBreak: "break-all", maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>{String(error?.message || "").slice(0, 200)}</p>
      </body>
    </html>
  );
}
