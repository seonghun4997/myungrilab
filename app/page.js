"use client";
// ============================================================
// 메인 홈 (허브) — "무엇이 궁금해서 오셨는가"
// 서비스 등불 타일 → /reading (관심사 focus 파라미터 전달)
// 재방문자는 내 감정서/인연함으로 3초 귀가
// ============================================================
import { useState, useEffect } from "react";
import { CONFIG } from "../lib/content";


const LANTERNS = [
  { id: "total", icon: "🔮", t: "전통 자미두수 감정", d: "12개 영역·10년 대운 — 인생 전체를 한 권으로", accent: "#c4b0ff", main: true },
  { id: "hongseon", icon: "🧧", t: "紅線 소개팅", d: "명반이 맞는 짝을 찾아 붉은 실로 잇습니다", accent: "#ff8ba3" },
  { id: "wealth", icon: "💰", t: "재물운", d: "돈이 들어오는 길과 새는 길, 트이는 해", accent: "#ffd479" },
  { id: "love", icon: "❤️", t: "연애·결혼운", d: "내 인연은 언제, 어떤 모습으로 올까", accent: "#ff8ba3" },
  { id: "career", icon: "💼", t: "직업·이직운", d: "천직과 이직 타이밍, 월급쟁이 vs 사장 팔자", accent: "#9bd0ff" },
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
    <main className="wrap" style={{ paddingTop: 54, paddingBottom: 60, minHeight: "100vh" }}>
      {/* 홍서 아씨 — 풀블리드, 밤하늘이 사이트 배경으로 녹아듦 */}
      <div style={{ margin: "-54px -22px 0" }}>
        <img src="/char/hero.webp" alt="홍서 아씨" width={379} height={340}
          style={{ display: "block", width: "100%", height: "auto", WebkitMaskImage: "linear-gradient(to bottom, black 58%, transparent 99%)", maskImage: "linear-gradient(to bottom, black 58%, transparent 99%)" }} />
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

      {/* 등불 타일 */}
      <div style={{ display: "grid", gap: 12 }}>
        {LANTERNS.map((l) => (
          <a
            key={l.id}
            href={go(l.id)}
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

      <p className="mono" style={{ textAlign: "center", fontSize: 11, color: "var(--tx-dim)", marginTop: 26 }}>
        무료 진단 · 회원가입 없음 · 3분
      </p>
      <p style={{ textAlign: "center", fontSize: 11, color: "var(--tx-dim)", marginTop: 30, lineHeight: 1.8 }}>
        {CONFIG.BRAND}({CONFIG.BRAND_HANJA}) — 어느 등을 들어도 같은 명반에서 시작해요.<br />
        紅線 소개팅은 감정서를 받은 분께 열리는 문이에요.
      </p>
    </main>
  );
}
