"use client";
// 편지 아래 만족도 별점 — leads.rating 저장 + rate_submit 이벤트
import { useState } from "react";
import { ev } from "../../../lib/track";

export default function RateWidget({ token }) {
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const submit = async (s) => {
    setScore(s);
    if (done) return;
    setDone(true);
    ev("rate_submit", { score: s });
    try {
      await fetch("/api/rate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, score: s }),
      });
    } catch (e) {}
  };

  return (
    <div className="card" style={{ textAlign: "center", marginBottom: 16 }}>
      <p className="display" style={{ fontSize: 16, marginBottom: 4 }}>풀이는 마음에 드셨나요?</p>
      <p style={{ fontSize: 12.5, color: "var(--tx-dim)", marginBottom: 12 }}>남겨주신 별은 월하노인이 다음 감정을 다듬는 데 씁니다.</p>
      <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => submit(s)}
            aria-label={`${s}점`}
            style={{
              background: "none", border: "none", cursor: "pointer", fontSize: 30, lineHeight: 1,
              color: s <= score ? "#ffd479" : "rgba(196,176,255,.35)",
              textShadow: s <= score ? "0 0 12px rgba(255,212,121,.6)" : "none",
              transition: "color .15s",
            }}
          >
            ★
          </button>
        ))}
      </div>
      {done && <p style={{ fontSize: 13, color: "var(--amethyst-hi)", marginTop: 10 }}>고맙습니다. 별 하나가 실 한 가닥이 됩니다.</p>}
      {done && score >= 4 && (
        <div style={{ marginTop: 14, textAlign: "left", background: "rgba(255,212,121,.07)", border: "1px solid rgba(255,212,121,.35)", borderRadius: 14, padding: "13px 15px" }}>
          <p className="mono" style={{ fontSize: 10.5, letterSpacing: ".2em", color: "var(--gold)", marginBottom: 6 }}>리포트 후기 이벤트</p>
          <p style={{ fontSize: 13.5, lineHeight: 1.75, color: "var(--tx)" }}>
            커뮤니티(네이버 카페 · 다음 카페 · 에브리타임 등)에 <b style={{ color: "var(--gold)" }}>이미지를 포함한 후기</b>를 남기고,
            그 링크를 안내 문자에 회신해주세요 — <b style={{ color: "var(--gold)" }}>전 제품 무료 쿠폰 1장</b>을 드립니다.
          </p>
        </div>
      )}
    </div>
  );
}
