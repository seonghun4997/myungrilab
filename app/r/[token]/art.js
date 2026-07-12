// ============================================================
// v15.4 — 감정서 일러스트 (전부 코드로 그린 SVG · 이미지 파일 불필요)
// HeroArt: 표지 산수화 / ChapterArt: 장별 주제 배너
// 팔레트는 globals.css :root 와 동일 계열
// ============================================================

const SKY0 = "#07071a", SKY1 = "#141138", SKY2 = "#241c5e";
const MT0 = "#100e33", MT1 = "#1a1547", MT2 = "#262059";
const MOON = "#f4e9c8", GOLD = "#ffd479", THREAD = "#ff5c6e", VIOLET = "#c4b0ff";

// 결정적 별밭 (매 렌더 동일)
function stars(n, w, h, seed = 7) {
  const out = [];
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h * 0.62, r = 0.5 + rnd() * 1.1, o = 0.35 + rnd() * 0.55;
    out.push(<circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={r.toFixed(2)} fill="#fff" opacity={o.toFixed(2)} />);
  }
  return out;
}

const Mountains = ({ w, h }) => (
  <g>
    <path d={`M0 ${h * 0.66} L${w * 0.16} ${h * 0.42} L${w * 0.3} ${h * 0.6} L${w * 0.46} ${h * 0.36} L${w * 0.62} ${h * 0.62} L${w * 0.78} ${h * 0.44} L${w} ${h * 0.64} V${h} H0 Z`} fill={MT2} />
    <path d={`M0 ${h * 0.78} L${w * 0.22} ${h * 0.56} L${w * 0.4} ${h * 0.74} L${w * 0.58} ${h * 0.52} L${w * 0.76} ${h * 0.76} L${w * 0.9} ${h * 0.6} L${w} ${h * 0.74} V${h} H0 Z`} fill={MT1} />
    <path d={`M0 ${h * 0.9} L${w * 0.18} ${h * 0.74} L${w * 0.38} ${h * 0.88} L${w * 0.6} ${h * 0.7} L${w * 0.82} ${h * 0.9} L${w} ${h * 0.8} V${h} H0 Z`} fill={MT0} />
  </g>
);

const Mist = ({ w, h }) => (
  <g opacity="0.5">
    <ellipse cx={w * 0.3} cy={h * 0.8} rx={w * 0.32} ry={h * 0.07} fill={SKY2} opacity="0.55" />
    <ellipse cx={w * 0.72} cy={h * 0.88} rx={w * 0.36} ry={h * 0.08} fill={SKY1} opacity="0.6" />
  </g>
);

function Frame({ h = 190, children, label }) {
  const w = 520;
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(196,176,255,.2)", margin: "2px 0 18px", position: "relative" }} aria-hidden="true">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: "block" }} role="img" aria-label={label || ""}>
        <defs>
          <linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={SKY0} /><stop offset="0.55" stopColor={SKY1} /><stop offset="1" stopColor={SKY2} />
          </linearGradient>
          <radialGradient id="moong" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={MOON} stopOpacity="0.9" /><stop offset="0.6" stopColor={MOON} stopOpacity="0.16" /><stop offset="1" stopColor={MOON} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={w} height={h} fill="url(#skyg)" />
        {stars(46, w, h)}
        {children({ w, h })}
      </svg>
    </div>
  );
}

const Moon = ({ x, y, r = 26 }) => (
  <g>
    <circle cx={x} cy={y} r={r * 2.6} fill="url(#moong)" />
    <circle cx={x} cy={y} r={r} fill={MOON} />
    <circle cx={x - r * 0.3} cy={y - r * 0.2} r={r * 0.16} fill="#e6d8b0" opacity="0.5" />
    <circle cx={x + r * 0.25} cy={y + r * 0.25} r={r * 0.11} fill="#e6d8b0" opacity="0.4" />
  </g>
);

// ───────── 장별 모티프 ─────────
const MOTIFS = {
  // 1장 — 별자리로 그린 사람
  ch01: ({ w, h }) => {
    const pts = [[w*0.36,h*0.3],[w*0.45,h*0.24],[w*0.54,h*0.3],[w*0.5,h*0.44],[w*0.58,h*0.56],[w*0.42,h*0.56],[w*0.45,h*0.44]];
    const seq = [0,1,2,3,4,3,6,5];
    return (<g>
      <Moon x={w*0.82} y={h*0.28} r={20} />
      <polyline points={seq.map(i=>pts[i].join(",")).join(" ")} fill="none" stroke={VIOLET} strokeWidth="1.2" opacity="0.8" />
      {pts.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="3.4" fill={GOLD} />)}
      <Mountains w={w} h={h} /><Mist w={w} h={h} />
    </g>);
  },
  // 2장 — 산 사이로 흐르는 길
  ch02: ({ w, h }) => (<g>
    <Moon x={w*0.2} y={h*0.26} r={20} />
    <Mountains w={w} h={h} />
    <path d={`M${w*0.5} ${h*0.62} C ${w*0.42} ${h*0.74}, ${w*0.62} ${h*0.82}, ${w*0.46} ${h}`} stroke={MOON} strokeWidth="10" fill="none" opacity="0.5" strokeLinecap="round" />
    <path d={`M${w*0.5} ${h*0.62} C ${w*0.42} ${h*0.74}, ${w*0.62} ${h*0.82}, ${w*0.46} ${h}`} stroke="#fff" strokeWidth="3" fill="none" opacity="0.55" strokeLinecap="round" />
    <Mist w={w} h={h} />
  </g>),
  // 3장 — 어둠 속 등불
  ch03: ({ w, h }) => (<g>
    <Mountains w={w} h={h} />
    <circle cx={w*0.5} cy={h*0.5} r={54} fill="url(#moong)" />
    <rect x={w*0.5-11} y={h*0.36} width="22" height="34" rx="9" fill="#3a2b13" stroke={GOLD} strokeWidth="1.6" />
    <path d={`M${w*0.5} ${h*0.44} q4 6 0 12 q-4 -6 0 -12`} fill={GOLD} />
    <line x1={w*0.5} y1={h*0.36} x2={w*0.5} y2={h*0.3} stroke={GOLD} strokeWidth="1.4" />
    <Mist w={w} h={h} />
  </g>),
  // 4장 — 빛나는 별검
  ch04: ({ w, h }) => (<g>
    <Moon x={w*0.8} y={h*0.26} r={18} />
    <Mountains w={w} h={h} />
    <g transform={`translate(${w*0.5} ${h*0.46}) rotate(-38)`}>
      <rect x="-3" y="-64" width="6" height="88" rx="3" fill={MOON} />
      <rect x="-16" y="22" width="32" height="6" rx="3" fill={GOLD} />
      <rect x="-4" y="28" width="8" height="20" rx="4" fill="#3a2b13" stroke={GOLD} strokeWidth="1.2" />
      <circle cx="0" cy="-64" r="5" fill="#fff" />
    </g>
    <Mist w={w} h={h} />
  </g>),
  // 5장 — 무거운 바위와 새벽별
  ch05: ({ w, h }) => (<g>
    <Mountains w={w} h={h} />
    <ellipse cx={w*0.5} cy={h*0.72} rx="66" ry="40" fill={MT0} stroke={VIOLET} strokeOpacity="0.3" />
    <ellipse cx={w*0.5} cy={h*0.6} rx="44" ry="28" fill={MT1} stroke={VIOLET} strokeOpacity="0.3" />
    <circle cx={w*0.5} cy={h*0.26} r="4" fill={GOLD} />
    <line x1={w*0.5} y1={h*0.14} x2={w*0.5} y2={h*0.38} stroke={GOLD} strokeWidth="1" opacity="0.6" />
    <line x1={w*0.44} y1={h*0.26} x2={w*0.56} y2={h*0.26} stroke={GOLD} strokeWidth="1" opacity="0.6" />
    <Mist w={w} h={h} />
  </g>),
  // 6장 — 달빛 물결 (10년의 강)
  ch06: ({ w, h }) => (<g>
    <Moon x={w*0.5} y={h*0.28} r={24} />
    <Mountains w={w} h={h} />
    {[0,1,2].map(i=>(
      <path key={i} d={`M0 ${h*(0.72+i*0.09)} q ${w*0.12} -14 ${w*0.25} 0 t ${w*0.25} 0 t ${w*0.25} 0 t ${w*0.25} 0`} stroke={i?VIOLET:MOON} strokeWidth={i?1.4:2.2} fill="none" opacity={0.65-i*0.18} />
    ))}
  </g>),
  // 7장 — 엽전 세 닢
  ch07: ({ w, h }) => (<g>
    <Moon x={w*0.18} y={h*0.26} r={18} />
    <Mountains w={w} h={h} />
    {[[w*0.4,h*0.42,24],[w*0.56,h*0.52,20],[w*0.47,h*0.66,16]].map(([x,y,r],i)=>(
      <g key={i}>
        <circle cx={x} cy={y} r={r} fill="#2e2410" stroke={GOLD} strokeWidth="2.4" />
        <rect x={x-r*0.32} y={y-r*0.32} width={r*0.64} height={r*0.64} fill={SKY1} stroke={GOLD} strokeWidth="1.6" />
      </g>
    ))}
    <Mist w={w} h={h} />
  </g>),
  // 8장 — 달 아래 붉은 실
  ch08: ({ w, h }) => (<g>
    <Moon x={w*0.5} y={h*0.3} r={26} />
    <Mountains w={w} h={h} />
    <path d={`M${w*0.16} ${h*0.72} C ${w*0.32} ${h*0.4}, ${w*0.68} ${h*0.9}, ${w*0.84} ${h*0.56}`} stroke={THREAD} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    <circle cx={w*0.16} cy={h*0.72} r="4.5" fill={THREAD} />
    <circle cx={w*0.84} cy={h*0.56} r="4.5" fill={THREAD} />
    <path d={`M${w*0.5-7} ${h*0.62} q7 -9 14 0 q-7 9 -14 0`} fill="none" stroke={THREAD} strokeWidth="2" />
  </g>),
  // 9장 — 달빛 소나무
  ch09: ({ w, h }) => (<g>
    <Moon x={w*0.78} y={h*0.26} r={20} />
    <Mountains w={w} h={h} />
    <g stroke="#2f6b4f" strokeWidth="0" fill="#2f6b4f">
      <path d={`M${w*0.3} ${h*0.9} l6 -34 l6 34 z`} fill="#3a2b13" />
      <ellipse cx={w*0.3+6} cy={h*0.52} rx="34" ry="12" />
      <ellipse cx={w*0.3-8} cy={h*0.62} rx="26" ry="10" />
      <ellipse cx={w*0.3+20} cy={h*0.64} rx="24" ry="9" />
    </g>
    <Mist w={w} h={h} />
  </g>),
  // 10장 — 등불 든 두 사람
  ch10: ({ w, h }) => (<g>
    <Moon x={w*0.2} y={h*0.24} r={18} />
    <Mountains w={w} h={h} />
    {[[w*0.46,1],[w*0.58,0.86]].map(([x,s],i)=>(
      <g key={i} transform={`translate(${x} ${h*0.66}) scale(${s})`} fill={SKY0} stroke={VIOLET} strokeOpacity="0.35">
        <circle cx="0" cy="-26" r="7" />
        <path d="M-9 12 C -9 -8, 9 -8, 9 12 Z" />
      </g>
    ))}
    <circle cx={w*0.52} cy={h*0.6} r="16" fill="url(#moong)" />
    <circle cx={w*0.52} cy={h*0.6} r="3.4" fill={GOLD} />
    <Mist w={w} h={h} />
  </g>),
  // 11장 — 열리는 문과 여명
  ch11: ({ w, h }) => (<g>
    <Mountains w={w} h={h} />
    <rect x={w*0.5-34} y={h*0.3} width="68" height="66" rx="4" fill={SKY0} stroke={GOLD} strokeWidth="1.6" />
    <rect x={w*0.5-6} y={h*0.3+6} width="34" height="54" fill="url(#moong)" />
    <rect x={w*0.5-6} y={h*0.3+6} width="34" height="54" fill={MOON} opacity="0.35" />
    <line x1={w*0.5-6} y1={h*0.3+6} x2={w*0.5-6} y2={h*0.3+60} stroke={GOLD} strokeWidth="1.4" />
    <Mist w={w} h={h} />
  </g>),
  // 12장 — 구름에 가린 달
  ch12: ({ w, h }) => (<g>
    <Moon x={w*0.5} y={h*0.34} r={24} />
    <g fill={SKY1} stroke={VIOLET} strokeOpacity="0.25">
      <ellipse cx={w*0.44} cy={h*0.4} rx="52" ry="14" />
      <ellipse cx={w*0.6} cy={h*0.3} rx="40" ry="11" />
    </g>
    <Mountains w={w} h={h} /><Mist w={w} h={h} />
  </g>),
  // 13장 — 별똥별과 풍경(종)
  ch13: ({ w, h }) => (<g>
    <line x1={w*0.2} y1={h*0.16} x2={w*0.42} y2={h*0.34} stroke={MOON} strokeWidth="2" opacity="0.8" strokeLinecap="round" />
    <circle cx={w*0.42} cy={h*0.34} r="3.6" fill="#fff" />
    <Moon x={w*0.8} y={h*0.24} r={16} />
    <Mountains w={w} h={h} />
    <g transform={`translate(${w*0.62} ${h*0.44})`}>
      <path d="M-14 0 L14 0 L9 22 L-9 22 Z" fill="#3a2b13" stroke={GOLD} strokeWidth="1.4" />
      <line x1="0" y1="22" x2="0" y2="34" stroke={GOLD} strokeWidth="1.4" />
      <circle cx="0" cy="36" r="3" fill={GOLD} />
      <line x1="0" y1="-8" x2="0" y2="0" stroke={GOLD} strokeWidth="1.2" />
    </g>
    <Mist w={w} h={h} />
  </g>),
  // 맺음 — 편지와 낙관
  letter: ({ w, h }) => (<g>
    <Moon x={w*0.22} y={h*0.26} r={18} />
    <Mountains w={w} h={h} />
    <g transform={`translate(${w*0.5} ${h*0.52}) rotate(-4)`}>
      <rect x="-58" y="-34" width="116" height="68" rx="5" fill="#efe6cf" />
      {[-18,-6,6,18].map((y,i)=><line key={i} x1="-44" y1={y} x2={i===3?-4:44} y2={y} stroke="#8d7d5a" strokeWidth="1.6" opacity="0.7" />)}
      <rect x="30" y="10" width="18" height="18" rx="3" fill={THREAD} />
    </g>
  </g>),
  seo: ({ w, h }) => (<g>
    <Moon x={w*0.5} y={h*0.3} r={26} />
    <Mountains w={w} h={h} /><Mist w={w} h={h} />
  </g>),
};

export function ChapterArt({ theme }) {
  const M = MOTIFS[theme] || MOTIFS.seo;
  return <Frame label="장 삽화">{(d) => M(d)}</Frame>;
}

// ───────── 표지 산수화 (세로) ─────────
export function HeroArt({ title = "자미두수", subtitle = "紫微斗數 · 정밀 감정서" }) {
  const w = 520, h = 620;
  return (
    <div style={{ borderRadius: 18, overflow: "hidden", border: "1px solid rgba(196,176,255,.22)", position: "relative", marginBottom: 22 }} aria-hidden="true">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: "block" }}>
        <defs>
          <linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={SKY0} /><stop offset="0.5" stopColor={SKY1} /><stop offset="1" stopColor={SKY2} />
          </linearGradient>
          <radialGradient id="hmoon" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={MOON} stopOpacity="0.85" /><stop offset="0.6" stopColor={MOON} stopOpacity="0.14" /><stop offset="1" stopColor={MOON} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hriver" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={MOON} stopOpacity="0.85" /><stop offset="1" stopColor={VIOLET} stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <rect width={w} height={h} fill="url(#hsky)" />
        {stars(90, w, h, 13)}
        <circle cx={w*0.5} cy={h*0.2} r="120" fill="url(#hmoon)" />
        <circle cx={w*0.5} cy={h*0.2} r="46" fill={MOON} />
        <circle cx={w*0.5-14} cy={h*0.2-8} r="7" fill="#e6d8b0" opacity="0.5" />
        <circle cx={w*0.5+12} cy={h*0.2+12} r="5" fill="#e6d8b0" opacity="0.4" />
        {/* 먼 산 */}
        <path d={`M0 ${h*0.5} L${w*0.14} ${h*0.34} L${w*0.28} ${h*0.48} L${w*0.42} ${h*0.3} L${w*0.56} ${h*0.48} L${w*0.72} ${h*0.32} L${w*0.86} ${h*0.46} L${w} ${h*0.38} V${h} H0 Z`} fill={MT2} />
        <path d={`M0 ${h*0.62} L${w*0.2} ${h*0.44} L${w*0.36} ${h*0.6} L${w*0.52} ${h*0.42} L${w*0.7} ${h*0.6} L${w*0.86} ${h*0.48} L${w} ${h*0.58} V${h} H0 Z`} fill={MT1} />
        {/* 달빛 강 */}
        <path d={`M${w*0.5} ${h*0.44} C ${w*0.4} ${h*0.56}, ${w*0.64} ${h*0.66}, ${w*0.5} ${h*0.78} C ${w*0.4} ${h*0.86}, ${w*0.56} ${h*0.94}, ${w*0.48} ${h}`} stroke="url(#hriver)" strokeWidth="26" fill="none" strokeLinecap="round" opacity="0.75" />
        {/* 앞 산 */}
        <path d={`M0 ${h*0.8} L${w*0.16} ${h*0.62} L${w*0.34} ${h*0.78} L${w*0.4} ${h*0.72} L${w*0.44} ${h*0.8} V${h} H0 Z`} fill={MT0} />
        <path d={`M${w*0.56} ${h*0.82} L${w*0.66} ${h*0.68} L${w*0.84} ${h*0.84} L${w} ${h*0.72} V${h} H${w*0.5} Z`} fill={MT0} />
        {/* 소나무 실루엣 */}
        <g fill="#0b0a24">
          <rect x={w*0.14} y={h*0.78} width="5" height="30" />
          <ellipse cx={w*0.14+2} cy={h*0.75} rx="26" ry="9" />
          <ellipse cx={w*0.14-8} cy={h*0.8} rx="20" ry="7" />
          <rect x={w*0.84} y={h*0.82} width="5" height="26" />
          <ellipse cx={w*0.84+2} cy={h*0.79} rx="24" ry="8" />
        </g>
        {/* 달을 보는 사람 */}
        <g transform={`translate(${w*0.5} ${h*0.86})`} fill="#0b0a24">
          <circle cx="0" cy="-30" r="7" />
          <path d="M-10 6 C -10 -18, 10 -18, 10 6 Z" />
        </g>
        <ellipse cx={w*0.5} cy={h*0.9} rx={w*0.3} ry="10" fill={SKY2} opacity="0.5" />
      </svg>
      {/* 타이틀 오버레이 */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 26, textAlign: "center", textShadow: "0 2px 18px rgba(0,0,0,.7)" }}>
        <div className="eyebrow" style={{ marginBottom: 8, color: "var(--moon)" }}>{subtitle}</div>
        <div className="display" style={{ fontSize: 52, color: "#fff", letterSpacing: "0.06em", lineHeight: 1 }}>{title}</div>
      </div>
    </div>
  );
}
