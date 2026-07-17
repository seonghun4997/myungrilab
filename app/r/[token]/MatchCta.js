"use client";
// ============================================================
// 리포트 맺음 — 紅線 매칭 유도 카드 (v16: 카카오톡 대신 /m/토큰 직행)
//  report_match_view — 이 섹션까지 읽음 (완독 근사치)
//  report_match_click — "매칭 시작" 클릭
// ============================================================
import { useEffect, useRef } from "react";
import { ev } from "../../../lib/track";
import { AVATAR_META } from "../../../lib/content";

function Ava({ e, size = 46 }) {
  const meta = AVATAR_META[e];
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", background: meta?.bg || "#f0eaff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.5 }}>
      {meta ? (
        <img src={meta.img} alt="" style={{ width: "68%" }} onError={(ev2) => { ev2.currentTarget.replaceWith(document.createTextNode(e)); }} />
      ) : e}
    </span>
  );
}

export default function MatchCta({ token }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let fired = false;
    const io = new IntersectionObserver(
      (ents) => {
        if (ents[0].isIntersecting && !fired) {
          fired = true;
          ev("report_match_view");
          io.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ marginTop: 30 }}>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div className="eyebrow">인연 분야</div>
        <h2 className="display" style={{ fontSize: 19, color: "var(--tx)", margin: "10px 0 4px" }}>
          제8장의 그 사람, 실제로 만나보실래요?
        </h2>
        <img src="/char/thread.webp" alt="" width={350} height={288} style={{ display: "block", width: 168, height: "auto", margin: "0 auto 6px", WebkitMaskImage: "radial-gradient(ellipse 72% 66% at 50% 45%, black 58%, transparent 100%)", maskImage: "radial-gradient(ellipse 72% 66% at 50% 45%, black 58%, transparent 100%)" }} />
        <p style={{ fontSize: 12.5, color: "var(--tx-dim)" }}>홍서 아씨가 명반 궁합이 맞는 인연에게 붉은 실을 걸어드려요</p>
      </div>

      <a href={`/m/${token}`} onClick={() => ev("report_match_click")}
        style={{ display: "block", textDecoration: "none", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(255,92,122,.45)", background: "#171233", position: "relative" }}>
        <svg viewBox="0 0 520 100" width="100%" style={{ display: "block", position: "absolute", inset: 0, height: "100%" }} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="520" height="100" fill="#171233" />
          <circle cx="452" cy="26" r="30" fill="#f4e9c8" opacity="0.1" />
          <circle cx="452" cy="26" r="15" fill="#f4e9c8" opacity="0.9" />
          <circle cx="60" cy="18" r="1.4" fill="#fff" opacity="0.6" /><circle cx="180" cy="12" r="1.1" fill="#fff" opacity="0.5" />
          <circle cx="300" cy="20" r="1.3" fill="#fff" opacity="0.6" /><circle cx="120" cy="80" r="1.1" fill="#fff" opacity="0.5" />
          <circle cx="360" cy="84" r="1.2" fill="#fff" opacity="0.5" />
        </svg>
        <div style={{ position: "relative", padding: "18px 16px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <Ava e="🐶" />
            <svg width="56" height="26" viewBox="0 0 56 26" aria-hidden="true">
              <path d="M3 16 C 18 4, 38 24, 53 10" stroke="#ff5c7a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
              <circle cx="3" cy="16" r="2.8" fill="#ff5c7a" /><circle cx="53" cy="10" r="2.8" fill="#ff5c7a" />
            </svg>
            <Ava e="🐱" />
          </div>
          <div className="display" style={{ textAlign: "center", fontSize: 21, color: "#fff", margin: "12px 0 4px", letterSpacing: ".02em" }}>紅線 매칭</div>
          <p style={{ textAlign: "center", fontSize: 12.5, color: "#d9d2f5", margin: "0 0 12px", lineHeight: 1.7 }}>
            내 명반의 부처궁과 맞닿는 상대를 찾아<br />궁합 점수와 함께 인연 카드로 보내드려요
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {["명반 궁합 점수", "블라인드 프로필", "성사 시에만 성사비"].map((t) => (
              <span key={t} style={{ fontSize: 11, color: "#b7a8ff", border: "1px solid rgba(183,168,255,.4)", borderRadius: 999, padding: "4px 10px" }}>{t}</span>
            ))}
          </div>
          <div style={{ background: "linear-gradient(135deg,#ff6b7d,#e63b52)", color: "#fff", borderRadius: 999, textAlign: "center", padding: "13px", fontSize: 14.5, fontWeight: 700 }}>
            내 인연함 열기 — 매칭 시작하기
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: "#9b93c9", margin: "10px 0 0" }}>회원가입 없음 · 이 감정서 전용 링크로 바로 열려요</p>
        </div>
      </a>
    </div>
  );
}
