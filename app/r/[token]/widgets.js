// ============================================================
// v15 감정서 위젯 (서버 렌더) — 모든 수치는 lib/scores.js 계산값
// ============================================================
import { JI, JI_HANJA } from "../../../lib/ziwei";

const DIM = "var(--tx-dim)";
const HI = "var(--amethyst-hi)";
const MONO = { fontFamily: "var(--mono)" };

export function Bars({ data, accent = "#b39dff", max = 100 }) {
  return (
    <div style={{ margin: "14px 0 4px" }}>
      {Object.entries(data).map(([k, v]) => (
        <div key={k} style={{ marginBottom: 9 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
            <span>{k}</span>
            <span className="mono" style={{ color: HI }}>{v}%</span>
          </div>
          <div style={{ height: 7, background: "rgba(139,108,255,.12)", borderRadius: 4, overflow: "hidden" }}>
            <i style={{ display: "block", height: "100%", width: `${(v / max) * 100}%`, background: accent, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Gauge({ value, label, low = "작음", mid = "보통", high = "큼" }) {
  const grade = value >= 70 ? high : value >= 55 ? mid : low;
  return (
    <div style={{ margin: "14px 0", textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: DIM, marginBottom: 4, ...MONO }}>
        <span>{low}</span><span>{mid}</span><span>{high}</span>
      </div>
      <div style={{ height: 10, background: "rgba(139,108,255,.12)", borderRadius: 6, overflow: "hidden" }}>
        <i style={{ display: "block", height: "100%", width: `${value}%`, background: "linear-gradient(90deg,#8b6cff,#c4b0ff)", borderRadius: 6 }} />
      </div>
      <div style={{ marginTop: 8, fontSize: 14 }}>
        <b className="mono" style={{ color: HI, fontSize: 20 }}>{value}</b>
        <span style={{ color: DIM, fontSize: 12 }}> / 100 · </span>
        <b style={{ color: HI }}>{grade}</b>
        {label && <span style={{ color: DIM, fontSize: 12 }}> — {label}</span>}
      </div>
    </div>
  );
}

export function VsBar({ a, b, aLabel, bLabel }) {
  return (
    <div style={{ margin: "14px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
        <span>{aLabel} <b className="mono" style={{ color: HI }}>{a}%</b></span>
        <span><b className="mono" style={{ color: "#ff8b98" }}>{b}%</b> {bLabel}</span>
      </div>
      <div style={{ display: "flex", height: 10, borderRadius: 6, overflow: "hidden" }}>
        <i style={{ width: `${a}%`, background: "linear-gradient(90deg,#8b6cff,#c4b0ff)" }} />
        <i style={{ width: `${b}%`, background: "linear-gradient(90deg,#ff8b98,#e63b52)" }} />
      </div>
    </div>
  );
}

export function FlowChart({ points, peak }) {
  const w = 300, h = 110, pad = 16;
  const xs = points.map((_, i) => pad + (i * (w - pad * 2)) / (points.length - 1));
  const ys = points.map((p) => h - pad - ((p.점수 - 30) / 65) * (h - pad * 2));
  const path = xs.map((x, i) => `${i ? "L" : "M"}${x},${ys[i]}`).join(" ");
  const avgY = h - pad - ((58 - 30) / 65) * (h - pad * 2);
  return (
    <div style={{ margin: "14px 0 6px" }}>
      <svg viewBox={`0 0 ${w} ${h + 18}`} style={{ width: "100%", display: "block" }} aria-hidden="true">
        <line x1={pad} y1={avgY} x2={w - pad} y2={avgY} stroke="rgba(234,230,255,.25)" strokeDasharray="3 4" strokeWidth="1" />
        <path d={path} fill="none" stroke="#c4b0ff" strokeWidth="2.2" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={p.연도}>
            <circle cx={xs[i]} cy={ys[i]} r={p.연도 === peak.연도 ? 5 : 3.2}
              fill={p.연도 === peak.연도 ? "#ffd479" : p.점수 < 52 ? "#ff8b98" : "#c4b0ff"} />
            <text x={xs[i]} y={h + 12} textAnchor="middle" fontSize="9.5" fill="rgba(234,230,255,.62)" fontFamily="var(--mono)">{p.연도}</text>
          </g>
        ))}
      </svg>
      <p className="mono" style={{ fontSize: 10.5, color: DIM, textAlign: "center" }}>
        점선 = 평균 흐름 · <span style={{ color: "#ffd479" }}>●</span> 가장 크게 트이는 해 · <span style={{ color: "#ff8b98" }}>●</span> 조심할 해
      </p>
    </div>
  );
}

export function PastTimeline({ daehanList, nowYear }) {
  const past = daehanList.filter((d) => parseInt(d.연도) <= nowYear).slice(-4);
  return (
    <div style={{ margin: "14px 0", borderLeft: "2px solid rgba(196,176,255,.3)", paddingLeft: 14 }}>
      {past.map((d, i) => (
        <div key={i} style={{ marginBottom: 10, position: "relative" }}>
          <i style={{ position: "absolute", left: -19, top: 7, width: 8, height: 8, borderRadius: "50%", background: i === past.length - 1 ? "#ffd479" : "#8b6cff", display: "block" }} />
          <div className="mono" style={{ fontSize: 11, color: HI }}>{d.구간} · {d.연도}</div>
          <div style={{ fontSize: 13, color: DIM }}>{d.해당본명궁} 큰 운이 작용하던 때</div>
        </div>
      ))}
    </div>
  );
}

export function RarityCard({ rarity }) {
  return (
    <div style={{ margin: "14px 0" }}>
      <div style={{ textAlign: "center", padding: "14px 0 10px", borderBottom: "1px solid rgba(196,176,255,.18)", marginBottom: 12 }}>
        <div className="eyebrow">종합 희소도</div>
        <div className="display" style={{ fontSize: 34, color: "#ffd479", marginTop: 4 }}>상위 {rarity.pct}%</div>
      </div>
      {rarity.combos.map((c, i) => (
        <div key={i} style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 12, background: "rgba(139,108,255,.08)", border: "1px solid rgba(196,176,255,.15)" }}>
          <b style={{ color: HI, fontSize: 14 }}>{c.title}</b>
          <p style={{ fontSize: 13, color: DIM, marginTop: 3 }}>{c.note}</p>
        </div>
      ))}
    </div>
  );
}

export function PersonCard({ title, keywords, tone = "violet", desc }) {
  const border = tone === "red" ? "rgba(255,120,134,.4)" : "rgba(196,176,255,.3)";
  const chip = tone === "red" ? "rgba(255,77,94,.14)" : "rgba(139,108,255,.14)";
  const chipTx = tone === "red" ? "#ff8b98" : HI;
  return (
    <div style={{ margin: "14px 0", padding: "14px 14px 12px", borderRadius: 14, border: `1px solid ${border}`, background: "rgba(13,12,46,.5)" }}>
      <div className="eyebrow" style={{ color: chipTx, marginBottom: 8 }}>{title}</div>
      {desc && <p style={{ fontSize: 13.5, color: "var(--tx)", marginBottom: 10 }}>{desc}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {keywords.map((k) => (
          <span key={k} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: chip, color: chipTx }}>{k}</span>
        ))}
      </div>
    </div>
  );
}

export function MonthsCard({ months }) {
  const label = ["이번 달", "다음 달", "다다음 달"];
  const DOMAIN = { 명궁: "나·방향", 형제궁: "형제·동료", 부처궁: "연애·배우자", 자녀궁: "자녀·창작", 재백궁: "재물·기회", 질액궁: "건강·휴식", 천이궁: "외부활동·이동", 노복궁: "대인관계", 관록궁: "일·성취", 전택궁: "집·자산", 복덕궁: "마음·취향", 부모궁: "어른·문서" };
  return (
    <div style={{ display: "flex", gap: 8, margin: "14px 0" }}>
      {months.map((m, i) => (
        <div key={i} style={{ flex: 1, textAlign: "center", padding: "12px 6px", borderRadius: 12, background: i === 0 ? "rgba(139,108,255,.16)" : "rgba(139,108,255,.06)", border: "1px solid rgba(196,176,255,.18)" }}>
          <div className="mono" style={{ fontSize: 10, color: DIM }}>{label[i]}</div>
          <div className="mono" style={{ fontSize: 11.5, color: HI, margin: "3px 0" }}>{m.월}</div>
          <div className="display" style={{ fontSize: 15 }}>{m.궁}</div>
          <div style={{ fontSize: 11, color: DIM }}>{DOMAIN[m.궁] || ""}</div>
        </div>
      ))}
    </div>
  );
}

export function CautionList({ years }) {
  if (!years.length)
    return <p style={{ fontSize: 13.5, color: DIM, margin: "12px 0" }}>다가올 10년 안에 인생의 핵심 자리(나·돈·일·배우자)를 흔드는 큰 화기(발목을 잡는 기운)가 없습니다 — 드물게 순한 흐름이에요.</p>;
  return (
    <div style={{ margin: "14px 0" }}>
      {years.map((y) => (
        <div key={y.연도} style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8, padding: "9px 12px", borderRadius: 10, background: "rgba(255,77,94,.08)", border: "1px solid rgba(255,120,134,.25)" }}>
          <b className="mono" style={{ color: "#ff8b98", fontSize: 15 }}>{y.연도}</b>
          <span style={{ fontSize: 13, color: "var(--tx)" }}>{y.사유}</span>
        </div>
      ))}
    </div>
  );
}

// ── 序 · 12궁 명반 그리드 ──
const GRID_ORDER = [5, 6, 7, 8, 4, -1, -1, 9, 3, -1, -1, 10, 2, 1, 0, 11]; // 지지 pos, -1 = 중앙
export function MyeongbanGrid({ palaces, name, bureau, sahwa, sinPos }) {
  const byPos = Object.fromEntries(palaces.map((p) => [p.pos, p]));
  return (
    <div style={{ margin: "16px 0 6px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>
        {GRID_ORDER.map((pos, i) => {
          if (pos === -1) {
            if (i !== 5) return null;
            return (
              <div key="center" style={{ gridColumn: "2 / span 2", gridRow: "2 / span 2", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 12, background: "radial-gradient(ellipse at center, rgba(139,108,255,.18), rgba(13,12,46,.6))", border: "1px solid rgba(196,176,255,.25)", padding: 8 }}>
                <div className="display" style={{ fontSize: 19, color: "#ffd479" }}>{bureau}</div>
                <div className="display" style={{ fontSize: 15, marginTop: 2 }}>{name}</div>
                <div className="mono" style={{ fontSize: 9.5, color: DIM, marginTop: 6, textAlign: "center", lineHeight: 1.7 }}>
                  {Object.entries(sahwa).map(([st, k]) => `화${k} ${st}`).join(" · ")}
                </div>
              </div>
            );
          }
          const p = byPos[pos];
          return (
            <div key={pos} style={{ minHeight: 82, borderRadius: 10, border: "1px solid rgba(196,176,255,.16)", background: "rgba(139,108,255,.05)", padding: "6px 7px", position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 10.5, color: p.name === "명궁" ? "#ffd479" : HI }}>{p.name.replace("궁", "")}{p.pos === sinPos && p.name !== "명궁" ? "·신" : ""}</span>
                <span className="mono" style={{ fontSize: 9, color: DIM }}>{JI_HANJA[p.pos]}</span>
              </div>
              <div className="display" style={{ fontSize: 13, lineHeight: 1.5, marginTop: 3 }}>
                {p.majors.length ? p.majors.join(" ") : <span style={{ color: DIM, fontSize: 11 }}>공궁</span>}
              </div>
              <div style={{ fontSize: 9.5, color: DIM, lineHeight: 1.5 }}>{p.minors.join(" ")}</div>
            </div>
          );
        })}
      </div>
      <p className="mono" style={{ fontSize: 10.5, color: DIM, textAlign: "center", marginTop: 8 }}>
        태어난 순간의 하늘을 한 장에 펼친 {name}님의 명반이에요
      </p>
    </div>
  );
}
