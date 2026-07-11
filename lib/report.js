// ============================================================
// 인연 감정서 — 섹션 정의 & 명반 사실(facts) 직렬화
// 원칙: LLM은 절대 별의 위치를 계산하지 않는다. 여기서 만든 facts만 해석한다.
// ============================================================
import { JI, JI_HANJA, GAN, STAR_HANJA, BUREAU_NAME, SAHWA_NAME, fateYears } from "./ziwei";

export const SECTIONS = [
  { id: "self", hanja: "命", title: "명궁 — 나라는 사람, 내가 사랑하는 방식" },
  { id: "spouse", hanja: "緣", title: "부처궁 — 정해진 짝의 모습" },
  { id: "timing", hanja: "時", title: "인연의 시기 — 붉은 실이 당겨지는 해" },
  { id: "choose", hanja: "選", title: "끌리는 상대 vs 피해야 할 상대" },
  { id: "together", hanja: "合", title: "함께 살 때의 모양" },
  { id: "guide", hanja: "導", title: "연을 부르는 법 — 월하노인의 처방" },
];

function palFacts(z, name) {
  const pal = z.palaceAt(name);
  const eff = z.effectiveMajors(pal);
  return {
    지지: JI[pal.pos] + `(${JI_HANJA[pal.pos]})`,
    궁간: GAN[pal.stem],
    주성: pal.majors.length ? pal.majors : eff.stars,
    차성여부: pal.majors.length ? false : true,
    보조성: pal.minors,
    사화: [...pal.majors, ...pal.minors].filter((s) => z.sahwa[s]).map((s) => `${s} ${z.sahwa[s] === "록" ? "화록" : z.sahwa[s] === "권" ? "화권" : z.sahwa[s] === "과" ? "화과" : "화기"}`),
  };
}

export function buildFacts(z) {
  const b = z.input;
  const nowYear = new Date().getFullYear();
  const birthYear = b.solarYear;
  const age = nowYear - birthYear;
  const fy = fateYears(z, birthYear, 3);

  // 대한 나이 → 연도 환산 (허세 나이 ≈ 출생년 + 나이 - 1)
  const daehanList = z.daehan.map((d) => ({
    구간: `${d.startAge}~${d.endAge}세`,
    연도: `${birthYear + d.startAge - 1}~${birthYear + d.endAge - 1}년`,
    궁지지: JI[d.pos],
    해당본명궁: d.palaceName,
  }));
  const md = z.marriageDaehan;

  return {
    기본: {
      성별: b.gender === "M" ? "남성" : "여성",
      출생_양력: `${b.solarYear}-${b.solarMonth}-${b.solarDay}`,
      출생_음력: `${z.input.lunarYear}년 ${z.input.lunarMonth}월 ${z.input.lunarDay}일`,
      시진: JI[b.hourBranch] + "시",
      현재나이_만: age,
      현재연도: nowYear,
    },
    명반: {
      명궁: palFacts(z, "명궁"),
      신궁지지: JI[z.sin],
      오행국: BUREAU_NAME[z.bureau],
    },
    부처궁: palFacts(z, "부처궁"),
    복덕궁: palFacts(z, "복덕궁"),
    관록궁: palFacts(z, "관록궁"),
    사화_년간: Object.entries(z.sahwa).map(([star, k]) => `${star} → 화${k}`),
    대한: {
      방향: z.forward ? "순행" : "역행",
      목록: daehanList.slice(0, 6),
      인연대한: md ? `${md.startAge}~${md.endAge}세 (${birthYear + md.startAge - 1}~${birthYear + md.endAge - 1}년) — 대한이 본명 부처궁 자리에 드는 10년` : null,
    },
    인연의해: fy.map((y) => `${y}년 (유년 지지가 부처궁과 만나는 해)`),
  };
}
