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
    </div>
  );
}
