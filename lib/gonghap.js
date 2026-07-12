// ============================================================
// 궁합 계산 (규칙 기반) — A의 부처궁 vs B의 명궁 상호 대조
// ============================================================
import { computeZiwei, JI } from "./ziwei";

const ZIWEI_GROUP = ["자미", "천기", "태양", "무곡", "천동", "염정"];
const CHEONBU_GROUP = ["천부", "태음", "탐랑", "거문", "천상", "천량", "칠살", "파군"];
const SAMHAP = [[8, 0, 4], [5, 9, 1], [2, 6, 10], [11, 3, 7]]; // 신자진 사유축 인오술 해묘미

function samhapGroup(pos) { return SAMHAP.findIndex((g) => g.includes(pos)); }

function oneWay(zA, zB) {
  // A의 부처궁(이상형) 별이 B의 명궁(실제 그 사람)에 떠 있는가
  const spouseA = zA.effectiveMajors(zA.palaceAt("부처궁")).stars;
  const selfB = zB.effectiveMajors(zB.palaceAt("명궁")).stars;
  const hits = spouseA.filter((s) => selfB.includes(s));
  let score = hits.length * 4;
  const notes = [];
  if (hits.length) notes.push(`그대 부처궁의 ${hits.join("·")}성이 이 사람의 명궁에 그대로 떠 있네`);
  // 같은 계열 (자미계/천부계)
  const grpMatch = spouseA.some((s) => ZIWEI_GROUP.includes(s)) === selfB.some((s) => ZIWEI_GROUP.includes(s));
  if (grpMatch && !hits.length) { score += 1; }
  return { score, notes };
}

export function gonghap(birthA, birthB, lunA, lunB) {
  const zA = computeZiwei({ lunarYear: lunA.year, lunarMonth: lunA.month, lunarDay: lunA.day, hourBranch: birthA.slotIdx ?? 6, gender: birthA.gender, solarYear: birthA.y, solarMonth: birthA.m, solarDay: birthA.d });
  const zB = computeZiwei({ lunarYear: lunB.year, lunarMonth: lunB.month, lunarDay: lunB.day, hourBranch: birthB.slotIdx ?? 6, gender: birthB.gender, solarYear: birthB.y, solarMonth: birthB.m, solarDay: birthB.d });

  const ab = oneWay(zA, zB);
  const ba = oneWay(zB, zA);
  let score = ab.score + ba.score;
  const notes = [...ab.notes, ...ba.notes.map((n) => n.replace("그대", "상대"))];

  // 궁 자리 삼합
  const posA = zA.palaceAt("명궁").pos, posB = zB.palaceAt("명궁").pos;
  if (samhapGroup(posA) === samhapGroup(posB)) { score += 2; notes.push(`두 사람의 명궁 자리(${JI[posA]}·${JI[posB]})가 삼합으로 묶여 있네`); }

  const grade = score >= 8 ? "天緣" : score >= 5 ? "良緣" : score >= 2 ? "可緣" : "淡緣";
  const gradeLine = {
    "天緣": "하늘이 묶어둔 연 — 놓치면 두고두고 아쉬울 짝일세",
    "良緣": "명반이 서로를 향해 기울어 있는 좋은 연일세",
    "可緣": "노력으로 깊어질 수 있는 연일세",
    "淡緣": "담담한 연 — 서두를 것 없네",
  }[grade];

  const note = notes.length
    ? `${notes.join(". ")}. ${gradeLine}.`
    : `${gradeLine}.`;

  return {
    score, grade, note,
    aSpouse: zA.effectiveMajors(zA.palaceAt("부처궁")).stars,
    bSpouse: zB.effectiveMajors(zB.palaceAt("부처궁")).stars,
    aSelf: zA.effectiveMajors(zA.palaceAt("명궁")).stars,
    bSelf: zB.effectiveMajors(zB.palaceAt("명궁")).stars,
  };
}

// ───────── v16 · 표시용 점수/희소도 ─────────
// 내부 점수(0~12+)를 고객이 보는 100점 척도와 "상위 N%"로 변환
export function displayScore(g) {
  const base = { "天緣": 91, "良緣": 83, "可緣": 73, "淡緣": 64 }[g.grade] ?? 70;
  return Math.min(98, base + Math.min(7, g.score));
}
export function gradePct(grade) {
  return { "天緣": 4, "良緣": 9, "可緣": 18, "淡緣": 33 }[grade] ?? 20;
}
