"use client";
// ============================================================
// 메인 홈 (허브) — "무엇이 궁금해서 오셨는가"
// 서비스 등불 타일 → /reading (관심사 focus 파라미터 전달)
// 재방문자는 내 감정서/인연함으로 3초 귀가
// ============================================================
import { useState, useEffect } from "react";
import { CONFIG } from "../lib/content";


const LANTERNS = [
  { id: "total", icon: "🔮", t: "전통 사주 감정", d: "12개 영역·10년 대운 — 인생 전체를 한 권으로", accent: "#c4b0ff", main: true },
  { id: "hongseon", icon: "🧧", t: "紅線 소개팅", d: "명반이 맞는 짝을 붉은 실로 이어드려요", accent: "#ff8ba3", href: "/hongseon" },
];
// 준비 중 관심사 — 대표 감정의 가치 소구로 재활용
const SOON = [
  { icon: "💰", t: "재물운", d: "감정서 제8장에서 만나요" },
  { icon: "❤️", t: "연애·결혼운", d: "감정서 제3장에서 만나요" },
  { icon: "💼", t: "직업·이직운", d: "감정서 제8장에서 만나요" },
];

export default function Hub() {
  const [my, setMy] = useState({ r: null, m: null });

  useEffect(() => {
    try {
      setMy({ r: localStorage.getItem("hs_my_report"), m: localStorage.getItem("hs_my_match") });
    } catch (e) {}
  }, []);

  // 광고 UTM 등 현재 쿼리를 그대로 퍼널에 전달 + 관심사 부착
  const go = (id) => {
    let qs = "";
    try { qs = window.location.search.replace(/^\?/, ""); } catch (e) {}
    const focus = id === "total" ? "" : `focus=${id}`;
    const q = [qs, focus].filter(Boolean).join("&");
    return `/reading${q ? `?${q}` : ""}`;
  };

  return (
    <main className="wrap" style={{ paddingTop: 54, paddingBottom: 60, minHeight: "100vh", position: "relative" }}>
      {/* 홍서 아씨 — 풀블리드, 밤하늘이 사이트 배경으로 녹아듦 */}
      <div style={{ margin: "-54px -22px 0" }}>
        <img src="/char/hero.webp" alt="홍서 아씨" width={764} height={636}
          style={{ display: "block", width: "min(100%, 560px)", height: "auto", margin: "0 auto",
            WebkitMaskImage: "radial-gradient(ellipse 64% 74% at 50% 34%, black 52%, transparent 97%)",
            maskImage: "radial-gradient(ellipse 64% 74% at 50% 34%, black 52%, transparent 97%)" }} />
      </div>
      <div style={{ marginTop: -64, position: "relative", zIndex: 2 }}>
        <div className="eyebrow" style={{ textAlign: "center" }}>紅緖堂 · {CONFIG.CLAIM}</div>
        <h1 className="display" style={{ fontSize: 26, textAlign: "center", margin: "10px 0 8px", color: "var(--tx)", lineHeight: 1.45, textShadow: "0 2px 18px rgba(11,10,34,.9)" }}>
          무엇이 궁금해서 오셨어요?
        </h1>
        <p style={{ textAlign: "center", fontSize: 13.5, color: "var(--tx-dim)", marginBottom: 24 }}>
          등불 하나를 고르면, 제가 명반을 펴볼게요.
        </p>
      </div>

      {/* 재방문 귀갓길 */}
      {(my.r || my.m) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", marginBottom: 26 }}>
          {my.r && (
            <a className="resume-chip rv" style={{ textDecoration: "none", background: "rgba(155,124,255,.14)", borderColor: "rgba(155,124,255,.55)", color: "var(--amethyst-hi)" }} href={`/r/${my.r}`}>
              🌙 내 감정서 다시 보기 →
            </a>
          )}
          {my.m && (
            <a className="resume-chip" style={{ textDecoration: "none", background: "rgba(255,107,138,.10)", borderColor: "rgba(255,107,138,.45)", color: "#ff8ba3" }} href={`/m/${my.m}`}>
              🧧 내 인연함 열기 →
            </a>
          )}
        </div>
      )}

      {/* 내 서고 (우상단 고정) */}
      <a href="/my" className="mono" style={{
        position: "absolute", top: 14, right: 16, zIndex: 5, textDecoration: "none",
        fontSize: 11.5, color: "var(--gold)", border: "1px solid rgba(255,212,121,.5)",
        borderRadius: 18, padding: "6px 12px", background: "rgba(11,10,34,.55)", backdropFilter: "blur(4px)",
      }}>🌙 내 서고</a>

      {/* 등불 타일 */}
      <div style={{ display: "grid", gap: 12 }}>
        {LANTERNS.map((l) => (
          <a
            key={l.id}
            href={l.href || go(l.id)}
            style={{
              display: "flex", alignItems: "center", gap: 14, textDecoration: "none",
              border: `1px solid ${l.main ? l.accent : "rgba(196,176,255,.28)"}`,
              background: l.main ? "rgba(139,108,255,.12)" : "rgba(139,108,255,.05)",
              borderRadius: 16, padding: l.main ? "18px 18px" : "14px 18px",
              boxShadow: l.main ? "0 0 26px rgba(139,108,255,.18)" : "none",
            }}
          >
            <span style={{ fontSize: l.main ? 30 : 24 }} aria-hidden="true">{l.icon}</span>
            <span style={{ flex: 1 }}>
              <b style={{ display: "block", fontSize: l.main ? 17 : 15.5, color: l.accent, marginBottom: 2 }}>
                {l.t}{l.main && <span className="mono" style={{ fontSize: 10, marginLeft: 8, color: "var(--gold)", border: "1px solid rgba(255,212,121,.5)", borderRadius: 6, padding: "1px 6px", verticalAlign: 2 }}>대표 감정</span>}
              </b>
              <span style={{ fontSize: 12.5, color: "var(--tx-dim)", lineHeight: 1.55 }}>{l.d}</span>
            </span>
            <span style={{ color: l.accent, fontSize: 18 }} aria-hidden="true">›</span>
          </a>
        ))}
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {SOON.map((t) => (
          <div key={t.t} aria-disabled="true" style={{
            display: "flex", alignItems: "center", gap: 12, opacity: .5,
            border: "1px dashed rgba(196,176,255,.3)", borderRadius: 14, padding: "10px 16px",
          }}>
            <span style={{ fontSize: 18 }} aria-hidden="true">{t.icon}</span>
            <span style={{ flex: 1, fontSize: 13.5, color: "var(--tx)" }}>{t.t}</span>
            <span className="mono" style={{ fontSize: 10.5, color: "var(--tx-dim)" }}>{t.d}</span>
          </div>
        ))}
      </div>

      <p className="mono" style={{ textAlign: "center", fontSize: 11, color: "var(--tx-dim)", marginTop: 26 }}>
        무료 진단 · 회원가입 없음 · 3분
      </p>
      <p style={{ textAlign: "center", fontSize: 11, color: "var(--tx-dim)", marginTop: 30, lineHeight: 1.8 }}>
        {CONFIG.BRAND}({CONFIG.BRAND_HANJA}) — 어느 등을 들어도 같은 명반에서 시작해요.<br />
        紅線 소개팅은 감정서를 받은 분께 열리는 문이에요.<br />
        <span className="mono" style={{ fontSize: 9.5, opacity: .55 }}>{CONFIG.VERSION}</span>
      </p>
    </main>
  );
}
