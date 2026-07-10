// ============================================================
// 명식 → 사람이 읽는 인사이트 변환 (규칙 기반)
// ============================================================
import { GAN, JI, GAN_ELEM, JI_ELEM, ELEM_NAME, SIPSEONG, JI_MAIN_GAN } from "./engine";
import { ILGAN_SYMBOL, ILGAN_TEXT, ILJI_TEXT, SEASON, BLUNT_BY_DOMINANT, LACK_ELEM_TEXT, QUIZ_TEMPLATES, SAL_DESC } from "./content";

// ---------- 검출된 살 목록 (공포 컨셉의 심장) ----------
export function salList(saju) {
  const seen = new Set();
  const out = [];
  for (const s of saju.sinsal) {
    if (seen.has(s.name)) continue;
    seen.add(s.name);
    const d = SAL_DESC[s.name];
    if (!d) continue;
    out.push({ name: s.name, ...d, good: s.name === "천을귀인" });
  }
  // 흉살 먼저, 길신(천을귀인) 마지막
  out.sort((a, b) => (a.good ? 1 : 0) - (b.good ? 1 : 0));
  return out;
}

// ---------- 일주 캐릭터 ----------
export function iljuCharacter(saju) {
  const dg = saju.pillars.day.gan;
  const dj = saju.pillars.day.ji;
  const mj = saju.pillars.month.ji;
  const name = `${SEASON[mj]}, ${ILGAN_SYMBOL[dg]}`;
  const badges = [];
  for (const s of saju.sinsal) {
    if (s.name === "도화" && !badges.includes("도화 — 시선을 끄는 매력")) badges.push("도화 — 시선을 끄는 매력");
    if (s.name === "역마" && !badges.includes("역마 — 움직여야 사는 기운")) badges.push("역마 — 움직여야 사는 기운");
    if (s.name === "화개" && !badges.includes("화개 — 예술과 몰입의 별")) badges.push("화개 — 예술과 몰입의 별");
    if (s.name === "천을귀인" && !badges.includes("천을귀인 — 위기에 나타나는 귀인")) badges.push("천을귀인 — 위기에 나타나는 귀인");
    if (s.name === "괴강" && !badges.includes("괴강 — 극단의 카리스마")) badges.push("괴강 — 극단의 카리스마");
    if (s.name === "백호" && !badges.includes("백호 — 강한 운을 쓰는 별")) badges.push("백호 — 강한 운을 쓰는 별");
  }
  return {
    name,
    ganzi: `${GAN[dg]}${JI[dj]}일주`,
    text: `${ILGAN_TEXT[dg]} ${ILJI_TEXT[dj]}`,
    badges: badges.slice(0, 3),
  };
}

// ---------- 직언 (뼈 때리는 지적) ----------
export function bluntLine(saju) {
  // 십성 분포 집계 (일간 제외 7자)
  const counts = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  const catOf = (ss) => {
    if (ss === "비견" || ss === "겁재") return "비겁";
    if (ss === "식신" || ss === "상관") return "식상";
    if (ss === "편재" || ss === "정재") return "재성";
    if (ss === "편관" || ss === "정관") return "관성";
    return "인성";
  };
  for (const key of ["year", "month", "day", "hour"]) {
    const p = saju.pillars[key];
    if (!p) continue;
    if (!(key === "day")) counts[catOf(saju.sipseongOfGan(p.gan))]++;
    counts[catOf(saju.sipseongOfGan(JI_MAIN_GAN[p.ji]))]++;
  }
  let domKey = "비겁", domVal = -1;
  for (const [k, v] of Object.entries(counts)) if (v > domVal) { domVal = v; domKey = k; }

  const lines = [];
  lines.push(BLUNT_BY_DOMINANT[domKey]);
  const lack = saju.elemCount.findIndex((c) => c === 0);
  if (lack >= 0) lines.push(LACK_ELEM_TEXT[lack]);
  return lines;
}

// ---------- 과거 검증 문항 5개 ----------
export function buildQuiz(saju) {
  const nowYear = new Date().getFullYear();
  const birthYear = saju.input.y;
  const span = nowYear - birthYear;
  const minYear = birthYear + (span >= 25 ? 15 : span >= 18 ? 12 : 8);
  const maxYear = nowYear - 1;
  const items = [];
  const usedYears = new Set();
  const dayJi = saju.pillars.day.ji;

  const pushItem = (key, year, weight) => {
    if (year != null && (year < minYear || year > maxYear || usedYears.has(year))) return;
    if (year != null) usedYears.add(year);
    items.push({
      key,
      year,
      weight,
      text: QUIZ_TEMPLATES[key].replace("{y}", year != null ? String(year) : ""),
    });
  };

  // 1) 가장 최근의 대운 교체 (과거)
  const pastDaeun = saju.daeun.filter((d) => d.startYear <= maxYear && d.startYear >= minYear);
  if (pastDaeun.length) pushItem("daeunChange", pastDaeun[pastDaeun.length - 1].startYear, 5);

  // 2) 세운-일지 충 연도 (가장 최근 2개)
  const chungYears = saju.seun.filter((s) => (s.ji + 6) % 12 === dayJi && s.year >= minYear && s.year <= maxYear);
  for (const cy of chungYears.slice(-2)) pushItem("chung", cy.year, 4);

  // 3) 재성 세운
  const jaeYears = saju.seun.filter((s) => (s.sipseong === "편재" || s.sipseong === "정재") && s.year >= minYear && s.year <= maxYear);
  if (jaeYears.length) pushItem("jae", jaeYears[jaeYears.length - 1].year, 3);

  // 4) 관성 세운
  const gwanYears = saju.seun.filter((s) => (s.sipseong === "편관" || s.sipseong === "정관") && s.year >= minYear && s.year <= maxYear);
  if (gwanYears.length) pushItem("gwan", gwanYears[gwanYears.length - 1].year, 3);

  // 5) 식상 세운
  const sikYears = saju.seun.filter((s) => (s.sipseong === "식신" || s.sipseong === "상관") && s.year >= minYear && s.year <= maxYear);
  if (sikYears.length) pushItem("siksang", sikYears[sikYears.length - 1].year, 2);

  // 6) 인성 세운 (부족 시 보충)
  if (items.length < 5) {
    const inYears = saju.seun.filter((s) => (s.sipseong === "편인" || s.sipseong === "정인") && s.year >= minYear && s.year <= maxYear);
    if (inYears.length) pushItem("inseong", inYears[inYears.length - 1].year, 2);
  }

  // 6-2) 삼재 과거 문항 (과거 삼재 세트가 성인 시기에 걸쳐 있으면)
  if (items.length < 5 && saju.samjae?.past) {
    const mid = saju.samjae.past[1];
    if (mid >= minYear && mid <= maxYear && !usedYears.has(mid)) {
      usedYears.add(mid);
      items.push({ key: "samjae", year: mid, weight: 3, text: QUIZ_TEMPLATES.samjae.replace("{y}", String(mid)) });
    }
  }

  // 7) 상시형 문항 풀 (연도 무관) — 5개가 될 때까지 보충
  const fillers = [];
  if (saju.sinsal.find((s) => s.name === "원진")) fillers.push("wonjin");
  if (saju.sinsal.find((s) => s.name === "귀문")) fillers.push("gwimun");
  if (saju.sinsal.find((s) => s.name === "도화")) fillers.push("dohwa");
  if (saju.sinsal.find((s) => s.name === "역마")) fillers.push("yeokma");
  fillers.push(saju.strong ? "strongType" : "weakType");
  if (!fillers.includes("yeokma") && saju.relations.find((r) => r.type === "충")) fillers.push("yeokma");
  for (const key of fillers) {
    if (items.length >= 5) break;
    if (items.find((it) => it.key === key)) continue;
    pushItem(key, null, 1);
  }

  return items.slice(0, 5);
}

// ---------- 미래 티저 (향후 5년) ----------
export function buildTeaser(saju) {
  const nowYear = new Date().getFullYear();
  const dayJi = saju.pillars.day.ji;
  const YUKHAP = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
  const risks = [];
  const opps = [];
  for (const s of saju.seun) {
    if (s.year < nowYear || s.year > nowYear + 5) continue;
    if ((s.ji + 6) % 12 === dayJi) risks.push({ year: s.year, kind: "일지 충" });
    if (s.sipseong === "편관") risks.push({ year: s.year, kind: "칠살운" });
    if (YUKHAP[s.ji] === dayJi) opps.push({ year: s.year, kind: "일지 합" });
    if (s.sipseong === "정재" || s.sipseong === "편재") opps.push({ year: s.year, kind: "재성운" });
    if (s.sipseong === "정관") opps.push({ year: s.year, kind: "정관운" });
  }
  // 다음 대운 교체 (미래)
  const nextDaeun = saju.daeun.find((d) => d.startYear > nowYear);
  return { risks: risks.slice(0, 3), opps: opps.slice(0, 3), nextDaeun, samjae: saju.samjae };
}
