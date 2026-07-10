// ============================================================
// 명식 → 자녀 재능 진단 변환 (규칙 기반)
// ============================================================
import { GAN, JI, GAN_ELEM, JI_ELEM, ELEM_NAME, JI_MAIN_GAN } from "./engine";
import { TALENT_TYPES, GRADES, STUDY_STARS, STUDY_SAL } from "./content";

// 십성 카테고리 집계 (일간 제외 7자)
export function sipseongCounts(saju) {
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
    if (key !== "day") counts[catOf(saju.sipseongOfGan(p.gan))]++;
    counts[catOf(saju.sipseongOfGan(JI_MAIN_GAN[p.ji]))]++;
  }
  return counts;
}

// ---------- 재능 프로필 (무료 미끼의 심장) ----------
export function talentProfile(saju) {
  const counts = sipseongCounts(saju);
  let domKey = "인성", domVal = -1;
  for (const [k, v] of Object.entries(counts)) if (v > domVal) { domVal = v; domKey = k; }
  const type = TALENT_TYPES[domKey];

  // 공부 별 (길신)
  const stars = [];
  for (const s of saju.sinsal) {
    if (STUDY_STARS[s.name] && !stars.find((x) => x.name === s.name)) {
      stars.push({ name: s.name, desc: STUDY_STARS[s.name] });
    }
  }

  // 학업을 막는 살
  const blockers = [];
  const seen = new Set();
  for (const s of saju.sinsal) {
    if (STUDY_SAL[s.name] && !seen.has(s.name)) {
      seen.add(s.name);
      blockers.push({ name: s.name, ...STUDY_SAL[s.name] });
    }
  }

  // 등급 산정 (규칙 기반)
  let score = 0;
  if (saju.sinsal.find((s) => s.name === "문창귀인")) score += 2;
  if (saju.sinsal.find((s) => s.name === "화개")) score += 1;
  if (saju.sinsal.find((s) => s.name === "천을귀인")) score += 1;
  if (domKey === "인성") score += 2;
  if (domKey === "식상") score += 1;
  if (saju.strong) score += 1;
  if (saju.elemCount.every((c) => c > 0)) score += 1; // 오행 구전
  const grade = score >= 6 ? GRADES[0] : score >= 4 ? GRADES[1] : score >= 2 ? GRADES[2] : GRADES[3];

  return { type, typeKey: domKey, grade, stars, blockers, counts };
}

// ---------- 학령 로드맵 (대운 → 초·중·고 매핑) ----------
export function schoolRoadmap(saju) {
  const by = saju.input.y;
  const stages = [
    { name: "초등", from: by + 7, to: by + 12 },
    { name: "중등", from: by + 13, to: by + 15 },
    { name: "고등", from: by + 16, to: by + 18 },
  ];
  const suneung = by + 18; // 고3 해 (만 18세가 되는 해)
  // 학령기와 겹치는 대운 전환점
  const turns = saju.daeun
    .filter((d) => d.startYear >= by + 6 && d.startYear <= by + 20)
    .map((d) => ({ year: d.startYear, ganzi: GAN[d.gan] + JI[d.ji], sipseong: d.sipseong }));
  return { stages, suneung, turns };
}
