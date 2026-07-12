// ============================================================
// 위젯 점수 엔진 (결정론적) — v15
// 원칙: 감정서에 표시되는 모든 숫자는 명반 배치에서 규칙으로 도출한다.
// LLM은 이 숫자를 '받아서 해설'만 하고, 절대 만들지 않는다.
// ============================================================
import { JI, JI_HANJA, GAN } from "./ziwei";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

// ── 14주성 + 6보조성 성격 벡터 (0~10) ──
// [주도, 추진, 통찰, 안정, 감수, 사교]
const T = {
  자미: [9, 6, 7, 7, 4, 6], 천기: [4, 5, 9, 4, 7, 6], 태양: [8, 7, 5, 5, 5, 8],
  무곡: [7, 8, 5, 6, 3, 4], 천동: [3, 3, 5, 7, 8, 7], 염정: [7, 7, 6, 4, 7, 6],
  천부: [6, 4, 6, 9, 5, 6], 태음: [4, 4, 7, 6, 9, 5], 탐랑: [6, 7, 6, 4, 7, 9],
  거문: [5, 5, 9, 4, 6, 5], 천상: [5, 4, 6, 8, 6, 7], 천량: [6, 4, 8, 8, 5, 6],
  칠살: [8, 9, 5, 3, 4, 4], 파군: [7, 9, 5, 2, 6, 5],
  문창: [3, 3, 8, 5, 6, 5], 문곡: [3, 3, 7, 4, 8, 6], 좌보: [4, 4, 5, 7, 5, 7],
  우필: [4, 4, 5, 7, 6, 7], 록존: [4, 3, 5, 9, 3, 4], 천마: [5, 8, 4, 2, 4, 7],
};
// 욕구 벡터 [인정, 안정, 성취, 자유, 관계] — 복덕궁용
const N = {
  자미: [9, 6, 8, 4, 5], 천기: [6, 4, 6, 8, 5], 태양: [9, 4, 8, 6, 7],
  무곡: [6, 7, 9, 4, 3], 천동: [4, 8, 3, 6, 8], 염정: [8, 4, 8, 6, 6],
  천부: [6, 9, 6, 3, 6], 태음: [5, 8, 5, 5, 7], 탐랑: [7, 3, 8, 8, 8],
  거문: [7, 4, 7, 6, 4], 천상: [7, 8, 5, 4, 7], 천량: [7, 7, 6, 5, 6],
  칠살: [6, 3, 9, 8, 3], 파군: [6, 2, 8, 9, 4],
  문창: [7, 5, 6, 5, 5], 문곡: [7, 4, 5, 6, 6], 좌보: [5, 6, 5, 4, 8],
  우필: [5, 6, 5, 4, 8], 록존: [4, 9, 6, 2, 4], 천마: [5, 2, 6, 9, 6],
};
// 부의 성질 [버는힘, 지키는힘] / 일의 성질 [조직, 독립]
const W = {
  자미: [8, 7], 천기: [6, 4], 태양: [8, 4], 무곡: [9, 8], 천동: [5, 6],
  염정: [7, 6], 천부: [6, 9], 태음: [6, 8], 탐랑: [8, 4], 거문: [7, 5],
  천상: [6, 7], 천량: [6, 8], 칠살: [8, 4], 파군: [8, 3],
  문창: [5, 6], 문곡: [5, 5], 좌보: [5, 7], 우필: [5, 7], 록존: [6, 10], 천마: [8, 3],
};
const J = {
  자미: [6, 8], 천기: [6, 6], 태양: [6, 7], 무곡: [5, 8], 천동: [8, 4],
  염정: [6, 7], 천부: [8, 5], 태음: [7, 5], 탐랑: [4, 8], 거문: [5, 7],
  천상: [8, 5], 천량: [8, 5], 칠살: [3, 9], 파군: [3, 9],
  문창: [8, 5], 문곡: [7, 5], 좌보: [8, 4], 우필: [8, 4], 록존: [6, 7], 천마: [3, 8],
};
// 질액궁 별 → 신체 계통 가중 [소화기, 신경·수면, 순환, 기력, 호흡·피부]
const H = {
  자미: [4, 5, 5, 4, 3], 천기: [5, 9, 4, 6, 3], 태양: [3, 6, 8, 5, 4],
  무곡: [4, 6, 5, 5, 7], 천동: [7, 4, 4, 6, 4], 염정: [4, 6, 7, 4, 6],
  천부: [6, 3, 4, 4, 4], 태음: [5, 7, 5, 6, 4], 탐랑: [6, 5, 5, 7, 5],
  거문: [8, 6, 4, 5, 5], 천상: [5, 4, 5, 5, 6], 천량: [5, 5, 6, 6, 4],
  칠살: [4, 6, 6, 8, 5], 파군: [5, 7, 5, 7, 5],
  문창: [3, 6, 3, 4, 5], 문곡: [3, 6, 3, 4, 4], 좌보: [3, 3, 3, 3, 3],
  우필: [3, 3, 3, 3, 3], 록존: [4, 3, 3, 3, 3], 천마: [3, 4, 4, 6, 3],
};

// 연간(年干) 사화표 — 유년 흐름 계산용 (록/권/과/기)
const SAHWA_STEM = {
  0: ["염정", "파군", "무곡", "태양"], 1: ["천기", "천량", "자미", "태음"],
  2: ["천동", "천기", "문창", "염정"], 3: ["태음", "천동", "천기", "거문"],
  4: ["탐랑", "태음", "우필", "천기"], 5: ["무곡", "탐랑", "천량", "문곡"],
  6: ["태양", "무곡", "태음", "천동"], 7: ["거문", "태양", "문곡", "문창"],
  8: ["천량", "자미", "좌보", "무곡"], 9: ["파군", "거문", "태음", "탐랑"],
};

function starsOf(z, palaceName) {
  const p = z.palaceAt(palaceName);
  const majors = p.majors.length ? p.majors : z.effectiveMajors(p).stars;
  return { majors, minors: p.minors, borrowed: !p.majors.length, pos: p.pos };
}
function vecAvg(stars, table, dims) {
  const rows = stars.map((s) => table[s]).filter(Boolean);
  if (!rows.length) return Array(dims).fill(5);
  return Array.from({ length: dims }, (_, i) => rows.reduce((a, r) => a + r[i], 0) / rows.length);
}
const pct = (v) => clamp(38 + v * 5.6, 40, 94); // 0~10 → 40~94%

// 별이 어느 궁에 있는지 찾기
function palaceOfStar(z, star) {
  for (const p of z.palaces) if (p.majors.includes(star) || p.minors.includes(star)) return p.name;
  return null;
}

export function buildScores(z) {
  const my = starsOf(z, "명궁");
  const cheon = starsOf(z, "천이궁");
  const gwan = starsOf(z, "관록궁");
  const bok = starsOf(z, "복덕궁");
  const jae = starsOf(z, "재백궁");
  const jeon = starsOf(z, "전택궁");
  const jil = starsOf(z, "질액궁");
  const buche = starsOf(z, "부처궁");
  const nobok = starsOf(z, "노복궁");

  // ── 1. 성향 6종 (명궁 가중 2배 + 천이·관록) ──
  const pool = [...my.majors, ...my.minors, ...my.majors, ...cheon.majors, ...gwan.majors];
  let traits = vecAvg(pool, T, 6);
  // 사화 보정: 명·관·재에 걸린 사화
  const hwaAt = (star) => z.sahwa[star];
  [...my.majors, ...gwan.majors, ...jae.majors].forEach((s) => {
    const h = hwaAt(s);
    if (h === "록") { traits[5] += 0.7; traits[3] += 0.5; }
    if (h === "권") { traits[0] += 0.9; traits[1] += 0.7; }
    if (h === "과") { traits[2] += 0.8; }
    if (h === "기") { traits[3] -= 0.9; traits[4] += 0.7; }
  });
  const 성향 = {
    주도성: pct(traits[0]), 추진력: pct(traits[1]), 통찰력: pct(traits[2]),
    안정감: pct(traits[3]), 감수성: pct(traits[4]), 사교성: pct(traits[5]),
  };

  // ── 2. 욕구 5종 (복덕궁 가중 2배 + 명궁) ──
  const npool = [...bok.majors, ...bok.minors, ...bok.majors, ...my.majors];
  const nv = vecAvg(npool, N, 5);
  const 욕구 = { 인정: pct(nv[0]), 안정: pct(nv[1]), 성취: pct(nv[2]), 자유: pct(nv[3]), 관계: pct(nv[4]) };

  // ── 3. 부의 그릇 (재백 버는힘 + 전택 지키는힘 + 길성/사화 보정) ──
  const earn = vecAvg([...jae.majors, ...jae.minors], W, 2)[0];
  const keep = vecAvg([...jeon.majors, ...jeon.minors], W, 2)[1];
  let wealth = (earn * 0.55 + keep * 0.45) * 10;
  [...jae.majors, ...jeon.majors].forEach((s) => {
    if (hwaAt(s) === "록") wealth += 8;
    if (hwaAt(s) === "기") wealth -= 10;
  });
  if (jae.minors.includes("록존") || my.minors.includes("록존")) wealth += 6;
  if (jae.minors.includes("천마")) wealth += 4;
  const 부의그릇 = clamp(wealth, 42, 93);

  // ── 4. 직장인 vs 사업가 (관록궁) ──
  const jv = vecAvg([...gwan.majors, ...gwan.minors], J, 2);
  let org = jv[0], indep = jv[1];
  gwan.majors.forEach((s) => { if (hwaAt(s) === "권") indep += 1; if (hwaAt(s) === "기") org += 0.5; });
  const sum = org + indep;
  const 직장인 = clamp((org / sum) * 100, 25, 75);
  const 일유형 = { 직장인, 사업가: 100 - 직장인 };

  // ── 5. 건강 주의 5계통 (질액궁, 40~72) ──
  const hv = vecAvg([...jil.majors, ...jil.minors], H, 5);
  const kiHit = jil.majors.some((s) => hwaAt(s) === "기") ? 6 : 0;
  const 건강 = {
    "소화기": clamp(34 + hv[0] * 4 + kiHit, 38, 72),
    "신경·수면": clamp(34 + hv[1] * 4 + kiHit, 38, 72),
    "순환": clamp(34 + hv[2] * 4, 38, 72),
    "기력": clamp(34 + hv[3] * 4 + kiHit, 38, 72),
    "호흡·피부": clamp(34 + hv[4] * 4, 38, 72),
  };

  // ── 6. 희소도 (배치 특징 개수 → 상위 %) ──
  const combos = [];
  if (my.minors.some((s) => ["록존", "좌보", "우필", "문창", "문곡"].includes(s)))
    combos.push({ title: `명궁 ${[...my.majors, ...my.minors].join("·")} 동궁`, note: "본바탕 자리에 길성이 함께 앉아, 타고난 기질이 실질적 결실로 이어지는 구조예요." });
  const 록권궁 = ["명궁", "재백궁", "관록궁", "부처궁", "전택궁"];
  Object.entries(z.sahwa).forEach(([star, kind]) => {
    const where = palaceOfStar(z, star);
    if (where && 록권궁.includes(where) && (kind === "록" || kind === "권"))
      combos.push({ title: `${where} ${star} 화${kind}격`, note: `${where} 자리에 화${kind}이 걸려, 그 영역에 하늘이 힘을 실어주는 배치예요.` });
  });
  if (my.majors.length >= 2) combos.push({ title: `명궁 ${my.majors.join("·")} 쌍성격`, note: "두 주성이 명궁에 함께 앉아 입체적인 기질을 만드는 드문 구조예요." });
  const rarityPct = clamp(21 - combos.length * 4 - (my.minors.includes("록존") ? 3 : 0), 4, 21);
  const 희소도 = { pct: rarityPct, combos: combos.slice(0, 3) };

  // ── 7. 앞으로 10년 운 흐름 (2년 단위 6포인트) ──
  const nowYear = new Date().getFullYear();
  const birthYear = z.input.solarYear || z.input.lunarYear;
  const nextDH = z.daehan.map((d) => ({ ...d, sy: birthYear + d.startAge - 1 })).find((d) => d.sy >= nowYear)
    || z.daehan.map((d) => ({ ...d, sy: birthYear + d.startAge - 1 })).findLast((d) => d.sy <= nowYear);
  const core = ["명궁", "재백궁", "관록궁", "부처궁"];
  const yearScore = (yr) => {
    let s = 58;
    const stem = ((yr - 4) % 10 + 10) % 10;
    const [rok, gwon, , gi] = SAHWA_STEM[stem];
    const rokAt = palaceOfStar(z, rok), giAt = palaceOfStar(z, gi), gwonAt = palaceOfStar(z, gwon);
    if (core.includes(rokAt)) s += 11;
    if (core.includes(gwonAt)) s += 7;
    if (core.includes(giAt)) s -= 12;
    if (nextDH && yr >= nextDH.sy && yr < nextDH.sy + 3) s += 8; // 새 대운 초입
    const yb = ((yr - 4) % 12 + 12) % 12;
    if (yb % 4 === my.pos % 4) s += 5; // 명궁과 삼합
    return clamp(s, 35, 92);
  };
  const 운흐름 = Array.from({ length: 6 }, (_, i) => {
    const yr = nowYear + i * 2;
    return { 연도: yr, 점수: yearScore(yr) };
  });
  const peak = [...운흐름].sort((a, b) => b.점수 - a.점수)[0];
  const 주의연도 = [];
  for (let yr = nowYear; yr < nowYear + 10; yr++) {
    const stem = ((yr - 4) % 10 + 10) % 10;
    const gi = SAHWA_STEM[stem][3];
    const giAt = palaceOfStar(z, gi);
    if (core.includes(giAt)) 주의연도.push({ 연도: yr, 사유: `${gi} 화기가 ${giAt}에 드는 해` });
  }

  // ── 8. 인물 카드 키워드 (부처궁 → 운명의 상대 / 천이궁 → 귀인 / 노복궁 → 조심할 사람) ──
  const KW = {
    자미: ["기품", "주관", "리더십", "자존심"], 천기: ["재치", "대화", "아이디어", "섬세함"],
    태양: ["밝음", "베풂", "활동적", "정직"], 무곡: ["결단", "실속", "성실", "과묵"],
    천동: ["다정", "순수", "편안함", "낙천"], 염정: ["매력", "열정", "치밀함", "카리스마"],
    천부: ["포용", "안정", "신뢰", "현실감"], 태음: ["온화", "배려", "감성", "차분함"],
    탐랑: ["사교", "다재다능", "욕심", "화려함"], 거문: ["논리", "직언", "탐구", "설득력"],
    천상: ["공정", "단정", "조율", "책임감"], 천량: ["어른스러움", "보호", "원칙", "지혜"],
    칠살: ["추진", "독립", "승부욕", "직진"], 파군: ["개혁", "모험", "화끈함", "변화"],
    문창: ["교양", "학식", "문서", "단정"], 문곡: ["감성", "예술", "언변", "세련"],
    좌보: ["조력", "성실", "믿음직", "온건"], 우필: ["배려", "협력", "따뜻함", "융통"],
    록존: ["실속", "재산", "신중", "안정"], 천마: ["역마", "활동", "확장", "자유"],
  };
  const kwOf = (st) => st.flatMap((s) => KW[s] || []).slice(0, 8);
  const 상대카드 = { 키워드: kwOf([...buche.majors, ...buche.minors]), 별: [...buche.majors, ...buche.minors], 차성: buche.borrowed };
  const 귀인카드 = { 키워드: kwOf([...cheon.majors, ...cheon.minors]), 별: [...cheon.majors, ...cheon.minors], 차성: cheon.borrowed };
  const 악인단서 = { 별: [...nobok.majors, ...nobok.minors], 차성: nobok.borrowed };

  // ── 9. 유월 3개월 (유년명궁 = 그 해 지지궁, 월마다 순행) ──
  const now = new Date();
  const yb = ((nowYear - 4) % 12 + 12) % 12;
  const 유월 = Array.from({ length: 3 }, (_, i) => {
    const m = now.getMonth() + 1 + i;
    const yr = nowYear + Math.floor((m - 1) / 12);
    const mm = ((m - 1) % 12) + 1;
    const pos = (yb + (mm - 1)) % 12;
    const pal = z.palaces.find((p) => p.pos === pos);
    return { 월: `${yr}년 ${mm}월`, 궁: pal.name, 궁지지: JI[pos] };
  });

  return { 성향, 욕구, 부의그릇, 일유형, 건강, 희소도, 운흐름, 최고시점: peak, 주의연도: 주의연도.slice(0, 3), 상대카드, 귀인카드, 악인단서, 유월, 다음대운시작: nextDH ? nextDH.sy : null };
}
