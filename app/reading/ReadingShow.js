"use client";
// ============================================================
// 명반을 읽는 중 — 감정서 생성 대기 풀스크린 연출 (v16.2)
// 별이 반짝이고 12궁 명반이 돌며, 월하노인의 대사가 흐른다
// ============================================================
import { useEffect, useState } from "react";

const LINES = [
  "달빛 아래 명반을 폅니다",
  "태어난 순간의 하늘을 되감는 중",
  "12궁에 별들을 앉히는 중",
  "四化의 기운을 매기는 중",
  "대운의 물길을 긋는 중",
  "재백궁의 곳간을 여는 중",
  "부처궁에서 인연의 결을 읽는 중",
  "질액궁의 등불을 살피는 중",
  "월하노인이 붓을 들었습니다",
  "한 장 한 장, 감정서를 적어 내려가는 중",
  "붉은 실로 매듭을 짓는 중",
  "마지막 장, 편지를 봉하는 중",
];
const PALACES = ["命", "兄", "夫", "子", "財", "疾", "遷", "友", "官", "田", "福", "父"];

export default function ReadingShow() {
  const [i, setI] = useState(0);
  const [pct, setPct] = useState(4);

  useEffect(() => {
    const a = setInterval(() => setI((x) => (x + 1) % LINES.length), 4200);
    const start = Date.now();
    const b = setInterval(() => {
      const t = (Date.now() - start) / 1000;
      // 0→30% 빠르게, 이후 95%까지 서서히 (완료 시 페이지가 넘어가므로 100%는 없다)
      const v = t < 12 ? 4 + (t / 12) * 26 : 30 + 65 * (1 - Math.exp(-(t - 12) / 55));
      setPct(Math.min(95, v));
    }, 400);
    return () => { clearInterval(a); clearInterval(b); };
  }, []);

  const stars = Array.from({ length: 26 }, (_, k) => {
    const x = ((k * 137.5) % 100), y = ((k * 61.8) % 58), d = (k % 5) * 0.7, s = 1 + (k % 3) * 0.6;
    return <span key={k} className="rs-star" style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, animationDelay: `${d}s` }} />;
  });

  return (
    <div className="rs-wrap" role="status" aria-live="polite">
      <style>{`
        .rs-wrap{position:fixed;inset:0;z-index:200;background:radial-gradient(120% 90% at 50% 0%,#141138 0%,#07071a 62%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px;overflow:hidden}
        .rs-star{position:absolute;border-radius:50%;background:#fff;opacity:.25;animation:rsTwinkle 2.8s ease-in-out infinite}
        @keyframes rsTwinkle{0%,100%{opacity:.15;transform:scale(1)}50%{opacity:.9;transform:scale(1.5)}}
        .rs-scene{position:relative;width:230px;height:230px;margin-bottom:26px}
        .rs-moonglow{position:absolute;inset:22px;border-radius:50%;background:radial-gradient(circle,#f4e9c8 0%,rgba(244,233,200,.14) 46%,transparent 70%);animation:rsBreath 3.6s ease-in-out infinite}
        @keyframes rsBreath{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.07);opacity:1}}
        .rs-wheel{position:absolute;inset:0;animation:rsSpin 46s linear infinite}
        @keyframes rsSpin{to{transform:rotate(360deg)}}
        .rs-thread{position:absolute;inset:0}
        .rs-thread path{stroke-dasharray:340;stroke-dashoffset:340;animation:rsDraw 5.6s ease-in-out infinite}
        @keyframes rsDraw{0%{stroke-dashoffset:340;opacity:0}12%{opacity:1}55%{stroke-dashoffset:0;opacity:1}80%{opacity:1}100%{stroke-dashoffset:0;opacity:0}}
        .rs-line{min-height:56px;text-align:center}
        .rs-line b{display:block;font-family:var(--disp,serif);font-weight:400;font-size:19px;color:#eae6ff;letter-spacing:.02em;animation:rsFade 4.2s ease-in-out infinite}
        @keyframes rsFade{0%{opacity:0;transform:translateY(6px)}12%,82%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-6px)}}
        .rs-bar{width:min(300px,72vw);height:5px;border-radius:99px;background:rgba(196,176,255,.16);margin:20px 0 12px;overflow:hidden}
        .rs-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#8b6cff,#ffd479);transition:width .5s ease}
        .rs-cap{font-size:11.5px;color:rgba(234,230,255,.55);text-align:center;line-height:1.8}
      `}</style>
      {stars}
      <div className="rs-scene" aria-hidden="true">
        <div className="rs-moonglow" />
        <svg className="rs-wheel" viewBox="0 0 230 230">
          <circle cx="115" cy="115" r="108" fill="none" stroke="rgba(196,176,255,.35)" strokeWidth="1" />
          <circle cx="115" cy="115" r="82" fill="none" stroke="rgba(196,176,255,.22)" strokeWidth="1" strokeDasharray="3 5" />
          {PALACES.map((p, k) => {
            const a = (k / 12) * Math.PI * 2 - Math.PI / 2;
            const x = 115 + Math.cos(a) * 95, y = 115 + Math.sin(a) * 95;
            return (
              <g key={p} transform={`translate(${x} ${y}) rotate(${(k / 12) * 360})`}>
                <text textAnchor="middle" dominantBaseline="middle" fontSize="13" fill="#c4b0ff" opacity="0.9" fontFamily="serif">{p}</text>
              </g>
            );
          })}
          {[0, 1, 2, 3, 4].map((k) => {
            const a = (k * 74 * Math.PI) / 180;
            return <circle key={k} cx={115 + Math.cos(a) * 58} cy={115 + Math.sin(a) * 58} r="2.2" fill="#ffd479" />;
          })}
        </svg>
        <svg className="rs-thread" viewBox="0 0 230 230" aria-hidden="true">
          <path d="M38 168 C 84 118, 146 202, 192 142" stroke="#ff5c6e" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </svg>
      </div>
      <div className="rs-line"><b key={i}>{LINES[i]}</b></div>
      <div className="rs-bar"><i style={{ width: `${pct}%` }} /></div>
      <p className="rs-cap">월하노인이 그대만의 감정서를 쓰고 있어요 · 보통 1~2분<br />화면을 닫지 않으면 완성되는 대로 바로 보여드릴게요</p>
    </div>
  );
}
