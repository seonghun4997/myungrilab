// ============================================================
// 자미두수 총운 감정서 — 섹션 정의 & 명반 사실(facts) 직렬화
// 원칙: LLM은 절대 별의 위치를 계산하지 않는다. facts만 해석한다.
// ============================================================
import { JI, JI_HANJA, GAN, BUREAU_NAME } from "./ziwei";
import { buildScores } from "./scores";

// ═══════════ v15 — 13장 + 序 + 편지 구조 ═══════════
export const PARTS = {
  p1: "제1부 · 나의 별자리 지도",
  p2: "제2부 · 내가 살아갈 세상",
  p3: "제3부 · 인생의 6대 영역",
  p4: "제4부 · 운명을 바꾸는 법",
  fin: "맺음",
};

// wpos: 각 위젯이 몇 번째 소제목 뒤에 들어갈지 (1부터, v15.2 소제목 구조 전용)
export const CHAPTERS = [
  { id: "ch01", no: "제1장", part: "p1", title: "나는 어떤 사람일까", widget: ["traits"], wpos: [1] },
  { id: "ch02", no: "제2장", part: "p1", title: "나는 무엇으로 시작해 어디로 흐를까", widget: ["past"], wpos: [2] },
  { id: "ch03", no: "제3장", part: "p1", title: "내 안의 진짜 욕구와 결핍", widget: ["needs"], wpos: [1] },
  { id: "ch04", no: "제4장", part: "p2", title: "내 인생의 주 무기", widget: ["rarity"], wpos: [1] },
  { id: "ch05", no: "제5장", part: "p2", title: "내 인생에서 가장 무거운 과제", widget: [], wpos: [] },
  { id: "ch06", no: "제6장", part: "p2", title: "앞으로 10년, 어떻게 흘러갈까", widget: ["flow"], wpos: [1] },
  { id: "ch07", no: "제7장", part: "p3", title: "재물·직업운", widget: ["wealth", "worktype"], wpos: [1, 3] },
  { id: "ch08", no: "제8장", part: "p3", title: "연애·결혼운", widget: ["spouse"], wpos: [3] },
  { id: "ch09", no: "제9장", part: "p3", title: "건강운", widget: ["health"], wpos: [2] },
  { id: "ch10", no: "제10장", part: "p3", title: "관계운 — 귀인과 조심할 사람", widget: ["gwiin_good", "gwiin_bad"], wpos: [1, 3] },
  { id: "ch11", no: "제11장", part: "p4", title: "인생이 바뀌는 전환점", widget: ["turning"], wpos: [1] },
  { id: "ch12", no: "제12장", part: "p4", title: "반드시 조심해야 할 시기", widget: ["caution"], wpos: [1] },
  { id: "ch13", no: "제13장", part: "p4", title: "월하노인이 알려주는 개운법", widget: ["months"], wpos: [3] },
  { id: "letter", no: "맺음", part: "fin", title: "월하노인의 편지", widget: [], wpos: [] },
];

// 상품 티어별 장 구성 (序 명반 해설은 전 티어 공통·무료 계산 렌더)
export const TIER_CHAPTER_IDS = {
  1: ["ch01", "ch02", "ch06", "ch08", "ch13", "letter"],
  2: ["ch01", "ch02", "ch03", "ch04", "ch05", "ch06", "ch07", "ch08", "ch09", "ch13", "letter"],
  3: CHAPTERS.map((c) => c.id),
};
export const TIER_LABEL = { 1: "총운 감정 (序 포함 7장)", 2: "총운+평생 대운 정밀 (序 포함 12장)", 3: "인생 책임 패키지 (序 포함 15장 전권)" };

// ═══════════ 구버전(v13 이하) 리포트 렌더용 — 삭제 금지 ═══════════
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
  const 전체12궁 = z.palaces.map((p) => ({
    궁: p.name, 지지: JI[p.pos] + `(${JI_HANJA[p.pos]})`,
    주성: p.majors, 보조성: p.minors,
    사화: [...p.majors, ...p.minors].filter((s) => z.sahwa[s]).map((s) => `${s} 화${z.sahwa[s]}`),
  }));
  const 점수 = buildScores(z);
  return buildFactsCore(z, concern, 전체12궁, 점수);
}

function buildFactsCore(z, concern, 전체12궁, 점수) {
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
    노복궁: palFacts(z, "노복궁"),
    부모궁: palFacts(z, "부모궁"),
    전체12궁,
    점수,
    사화_년간: Object.entries(z.sahwa).map(([star, k]) => `${star} → 화${k}`),
    대운: {
      방향: z.forward ? "순행" : "역행",
      다음대운_시작연도: nextDaehan ? nextDaehan.startYear : null,
      목록: daehanList,
    },
  };
}
