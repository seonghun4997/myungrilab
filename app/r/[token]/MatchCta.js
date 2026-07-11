"use client";
// ============================================================
// 리포트 하단 紅線 매칭 CTA + 여정 이벤트
//  report_view       — 리포트 열림 (전달→열람 전환 측정)
//  report_match_view — 紅線 섹션까지 읽음 (리포트 완독 근사치)
//  report_match_click— "매칭 신청" 클릭 (소개팅 관심 전환)
// ============================================================
import { useEffect, useRef } from "react";
import { ev } from "../../../lib/track";

export default function MatchCta({ kakaoUrl }) {
  const ref = useRef(null);

  useEffect(() => {
    ev("report_view");
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
    <div
      ref={ref}
      className="card"
      style={{
        marginTop: 8,
        marginBottom: 8,
        border: "1px solid rgba(255,120,134,0.4)",
        background: "linear-gradient(160deg,rgba(255,77,94,0.12),rgba(255,77,94,0.04))",
      }}
    >
      <p style={{ fontSize: 15, color: "var(--tx)" }}>
        <b style={{ color: "#ff8b98" }}>紅線 매칭</b> — 이 감정서를 받은 분에게만, 월하노인이 자미두수 궁합으로 직접 연을
        잇는 블라인드 소개가 열려 있습니다.
      </p>
      <a
        href={kakaoUrl}
        target="_blank"
        rel="noreferrer"
        className="btn btn-seal"
        style={{ marginTop: 12, fontSize: 15 }}
        onClick={() => ev("report_match_click")}
      >
        카카오톡으로 &quot;매칭 신청&quot; 보내기
      </a>
    </div>
  );
}
