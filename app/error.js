"use client";
// ============================================================
// 전역 에러 방어막 — v25.2
// ① ChunkLoadError(배포 직후 옛 캐시)면 1회 자동 새로고침으로 자가 치유
// ② 그 외 오류는 홍서당 톤 안내 + 에러 원문 노출 (제보 정확도 ↑)
// ============================================================
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);

  useEffect(() => {
    try {
      const msg = String(error?.message || "");
      const isChunk = error?.name === "ChunkLoadError" || /Loading chunk|ChunkLoadError|dynamically imported module|Importing a module script failed/i.test(msg);
      if (isChunk && !sessionStorage.getItem("hs_chunk_reload")) {
        sessionStorage.setItem("hs_chunk_reload", "1");
        window.location.reload();
      }
    } catch (e) {}
  }, [error]);

  return (
    <main className="wrap" style={{ paddingTop: 80, paddingBottom: 60, textAlign: "center", minHeight: "100vh" }}>
      <img src="/char/lost.webp" alt="" width={760} height={1010}
        style={{ display: "block", width: "min(70%, 300px)", height: "auto", margin: "0 auto",
          WebkitMaskImage: "radial-gradient(ellipse 66% 70% at 50% 40%, black 50%, transparent 96%)",
          maskImage: "radial-gradient(ellipse 66% 70% at 50% 40%, black 50%, transparent 96%)" }} />
      <h1 className="display" style={{ fontSize: 22, color: "var(--tx)", margin: "-36px 0 8px", position: "relative", lineHeight: 1.5 }}>
        길이 잠시 어긋났어요
      </h1>
      <p style={{ fontSize: 13, color: "var(--tx-dim)", marginBottom: 20, lineHeight: 1.7 }}>
        새로고침 한 번이면 대부분 돌아와요.<br />계속 그러면 아래 문구를 캡처해서 보내주세요.
      </p>
      <button className="btn" style={{ maxWidth: 260, margin: "0 auto 10px", fontSize: 15 }}
        onClick={() => { try { sessionStorage.removeItem("hs_chunk_reload"); } catch (e) {} reset(); }}>
        다시 시도하기
      </button>
      <a href="/" style={{ display: "block", fontSize: 13, color: "var(--tx-dim)", marginBottom: 26 }}>홍서당 처음으로 ›</a>
      <p className="mono" style={{ fontSize: 10, color: "var(--tx-dim)", opacity: .65, wordBreak: "break-all", maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
        {String(error?.name || "Error")}: {String(error?.message || "").slice(0, 220)}
      </p>
    </main>
  );
}
