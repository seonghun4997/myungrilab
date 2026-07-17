"use client";
// ============================================================
// 紅線 관문 (/hongseon) — 소개팅 등불의 전용 입구
// 신규: 감정서부터 / 기존(인연함 보유): 인연함 바로가기 승격
// ============================================================
import { useEffect, useState } from "react";

export default function Hongseon() {
  const [myMatch, setMyMatch] = useState(null);

  useEffect(() => {
    try {
      setMyMatch(localStorage.getItem("hs_my_match"));
      sessionStorage.setItem("hs_focus", "hongseon");
    } catch (e) {}
  }, []);

  // UTM 등 쿼리 관통
  const readingHref = () => {
    let qs = "";
    try { qs = window.location.search.replace(/^\?/, ""); } catch (e) {}
    const q = [qs, "focus=hongseon"].filter(Boolean).join("&");
    return `/reading?${q}`;
  };

  const Cta = ({ href, red, children }) => (
    <a href={href} className="btn" style={{
      display: "block", textAlign: "center", textDecoration: "none", marginBottom: 10,
      fontSize: 15, padding: "15px 16px",
      ...(red ? { background: "rgba(255,90,122,.12)", border: "1px solid rgba(255,90,122,.6)", color: "#ff8ba3" } : {}),
    }}>{children}</a>
  );

  return (
    <main className="wrap" style={{ paddingTop: 0, paddingBottom: 60 }}>
      {/* 홍선 컷 — 경계 없는 통합 */}
      <div style={{ margin: "0 -22px" }}>
        <img src="/char/thread.webp" alt="붉은 실을 든 홍서 아씨" width={760} height={1010}
          style={{ display: "block", width: "min(100%, 520px)", height: "auto", margin: "0 auto",
            WebkitMaskImage: "radial-gradient(ellipse 66% 72% at 50% 38%, black 52%, transparent 97%)",
            maskImage: "radial-gradient(ellipse 66% 72% at 50% 38%, black 52%, transparent 97%)" }} />
      </div>

      <div style={{ marginTop: -70, position: "relative", zIndex: 2 }}>
        <div className="eyebrow" style={{ textAlign: "center" }}>紅線 · 명반 궁합 소개팅</div>
        <h1 className="display" style={{ fontSize: 24, textAlign: "center", margin: "10px 0 8px", color: "var(--tx)", lineHeight: 1.5, textShadow: "0 2px 18px rgba(11,10,34,.9)" }}>
          명반이 맞는 짝을,<br />붉은 실로 이어드려요
        </h1>
      </div>

      {/* 3스텝 */}
      <div style={{ border: "1px solid rgba(196,176,255,.3)", borderRadius: 16, padding: "16px 18px", margin: "18px 0 12px", background: "rgba(139,108,255,.06)" }}>
        <b style={{ fontSize: 13.5, color: "var(--tx)" }}>어떻게 되나요</b>
        <div style={{ fontSize: 13, color: "var(--tx-dim)", lineHeight: 2, marginTop: 6 }}>
          ① 감정서로 <b style={{ color: "var(--tx)" }}>내 명반</b>을 먼저 확인하고<br />
          ② 매일 밤, 궁합이 가장 맞는 <b style={{ color: "var(--tx)" }}>한 분의 카드</b>를 받고<br />
          ③ 서로 [잇기]를 누르면 — <b style={{ color: "#ff8ba3" }}>연락처가 교환</b>돼요
        </div>
      </div>
      <p style={{ textAlign: "center", fontSize: 12, color: "var(--tx-dim)", marginBottom: 18 }}>
        실명·사진 비공개 · 감정서 구매자만 · 베타 기간 성사비 0원
      </p>

      {/* 상태 분기 CTA */}
      {myMatch ? (
        <>
          <Cta href={`/m/${myMatch}`} red>🧧 내 인연함 열기 — 오늘의 카드 확인 ›</Cta>
          <Cta href={readingHref()}>새 명반으로 다시 시작하기 ›</Cta>
        </>
      ) : (
        <>
          <Cta href={readingHref()} red>감정서 받고 시작하기 ›</Cta>
          <Cta href="/my">이미 감정서가 있어요 — 🌙 내 서고에서 찾기 ›</Cta>
        </>
      )}

      <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--tx-dim)", marginTop: 22, lineHeight: 1.8 }}>
        명반 없이는 실을 걸 수 없어요 —<br />홍서 아씨는 두 사람의 별자리를 보고 잇습니다.
      </p>
    </main>
  );
}
