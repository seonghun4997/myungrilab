// ============================================================
// 자미두수 총운 감정서 — 섹션 정의 & 명반 사실(facts) 직렬화
// 원칙: LLM은 절대 별의 위치를 계산하지 않는다. facts만 해석한다.
// ============================================================
import { JI, JI_HANJA, GAN, BUREAU_NAME } from "./ziwei";

export const SECTIONS = [
  { id: "self", hanja: "命", title: "명궁 — 타고난 그릇과 본질" },
  { id: "wealth", hanja: "財", title: "재물운 — 돈이 들어오는 길과 새는 길" },
  { id: "career", hanja: "業", title: "직업운 — 성공의 무대" },
  { id: "love", hanja: "愛", title: "애정운 — 인연의 모습" },
  { id: "health", hanja: "康", title: "건강·기운 — 몸과 복의 흐름" },
  { id: "fortune", hanja: "運", title: "대운 — 황금기와 시련기의 연대표" },
];

// 상품 티어별 추가 섹션 (2: 평생 대운 정밀 / 3: +재물 심층)
export const EXTRA_SECTIONS = {
  2: [{ id: "life_daehan", hanja: "壽", title: "평생 대운 정밀 — 8구간 연대기" }],
  3: [
    { id: "life_daehan", hanja: "壽", title: "평생 대운 정밀 — 8구간 연대기" },
    { id: "wealth_deep", hanja: "庫", title: "재물 심층 — 곳간(전택)과 지키는 법" },
  ],
};

function palFacts(z, name) {
  const pal = z.palaceAt(name);
  const eff = z.effectiveMajors(pal);
  return {
    지지: JI[pal.pos] + `(${JI_HANJA[pal.pos]})`,
    궁간: GAN[pal.stem],
    주성: pal.majors.length ? pal.majors : eff.stars,
    차성여부: !pal.majors.length,
    보조성: pal.minors,
    사화: [...pal.majors, ...pal.minors].filter((s) => z.sahwa[s]).map((s) => `${s} 화${z.sahwa[s]}`),
  };
}

export function buildFacts(z, concern) {
  const b = z.input;
  const nowYear = new Date().getFullYear();
  const birthYear = b.solarYear;

  const daehanList = z.daehan.map((d) => ({
    구간: `${d.startAge}~${d.endAge}세`,
    연도: `${birthYear + d.startAge - 1}~${birthYear + d.endAge - 1}년`,
    궁지지: JI[d.pos],
    해당본명궁: d.palaceName,
  }));
  const nextDaehan = z.daehan
    .map((d) => ({ ...d, startYear: birthYear + d.startAge - 1 }))
    .find((d) => d.startYear >= nowYear);

  return {
    기본: {
      성별: b.gender === "M" ? "남성" : "여성",
      출생_양력: `${b.solarYear}-${b.solarMonth}-${b.solarDay}`,
      출생_음력: `${b.lunarYear}년 ${b.lunarMonth}월 ${b.lunarDay}일`,
      시진: JI[b.hourBranch] + "시",
      현재나이_만: nowYear - birthYear,
      현재연도: nowYear,
    },
    고민: concern || null,
    명반: {
      명궁: palFacts(z, "명궁"),
      신궁지지: JI[z.sin],
      오행국: BUREAU_NAME[z.bureau],
    },
    재백궁: palFacts(z, "재백궁"),
    전택궁: palFacts(z, "전택궁"),
    관록궁: palFacts(z, "관록궁"),
    부처궁: palFacts(z, "부처궁"),
    질액궁: palFacts(z, "질액궁"),
    복덕궁: palFacts(z, "복덕궁"),
    천이궁: palFacts(z, "천이궁"),
    사화_년간: Object.entries(z.sahwa).map(([star, k]) => `${star} → 화${k}`),
    대운: {
      방향: z.forward ? "순행" : "역행",
      다음대운_시작연도: nextDaehan ? nextDaehan.startYear : null,
      목록: daehanList,
    },
  };
}
