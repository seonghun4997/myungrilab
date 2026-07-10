// ============================================================
// 정식 풀이 리포트 — 섹션 정의 & 명식 사실(facts) 직렬화
// 원칙: LLM은 절대 간지를 계산하지 않는다. 여기서 만든 facts만 해석한다.
// ============================================================
import { GAN, JI, GAN_ELEM, JI_ELEM, ELEM_NAME, JI_MAIN_GAN } from "./engine";
import { iljuCharacter, bluntLine, buildTeaser } from "./insights";

export const SECTIONS = [
  { id: "overview", hanja: "總", title: "총론 — 타고난 그릇" },
  { id: "wealth", hanja: "財", title: "재물운 — 벌고, 새는 구조" },
  { id: "love", hanja: "緣", title: "애정운 — 인연의 자리" },
  { id: "career", hanja: "業", title: "직업운 — 쓰임의 방향" },
  { id: "years", hanja: "運", title: "향후 5년 — 해마다의 흐름" },
  { id: "daeun", hanja: "大", title: "다음 대운 — 10년의 문" },
];

// 명식 계산 결과 → LLM에 전달할 순수 데이터
export function buildFacts(saju) {
  const P = saju.pillars;
  const f = (p, label) =>
    p
      ? {
          기둥: label,
          간지: GAN[p.gan] + JI[p.ji],
          천간: { 글자: GAN[p.gan], 오행: ELEM_NAME[GAN_ELEM[p.gan]], 십성: label === "일주" ? "일간(나)" : saju.sipseongOfGan(p.gan) },
          지지: { 글자: JI[p.ji], 오행: ELEM_NAME[JI_ELEM[p.ji]], 십성: saju.sipseongOfGan(JI_MAIN_GAN[p.ji]) },
        }
      : { 기둥: label, 간지: "미상(출생 시간 모름)" };

  const ch = iljuCharacter(saju);
  const teaser = buildTeaser(saju);
  const nowYear = new Date().getFullYear();

  return {
    기본: {
      출생: saju.input.dateStr + (saju.input.hour != null ? ` ${String(saju.input.hour).padStart(2, "0")}:${String(saju.input.minute).padStart(2, "0")}` : " (시간 미상)"),
      성별: saju.input.gender === "M" ? "남성" : "여성",
      현재연도: nowYear,
      나이대략: nowYear - saju.input.y,
    },
    원국: [f(P.year, "년주"), f(P.month, "월주"), f(P.day, "일주"), f(P.hour, "시주")],
    일주캐릭터: { 이름: ch.name, 일주: ch.ganzi },
    오행분포: Object.fromEntries(ELEM_NAME.map((n, i) => [n, saju.elemCount[i]])),
    신강신약: saju.strong ? "신강" : "신약",
    신살: saju.sinsal.map((s) => `${s.name}(${s.pos === "year" ? "년" : s.pos === "month" ? "월" : s.pos === "day" ? "일" : "시"}지)`),
    원국내합충: saju.relations.map((r) => `${r.a}-${r.b} ${r.type}`),
    직언: bluntLine(saju),
    대운: {
      대운수: saju.daeunSu,
      방향: saju.forward ? "순행" : "역행",
      목록: saju.daeun.slice(0, 5).map((d) => ({
        시작연도: d.startYear,
        시작나이: d.startAge,
        간지: GAN[d.gan] + JI[d.ji],
        천간십성: d.sipseong,
      })),
    },
    향후5년세운: saju.seun
      .filter((s) => s.year >= nowYear && s.year <= nowYear + 5)
      .map((s) => ({
        연도: s.year,
        간지: GAN[s.gan] + JI[s.ji],
        천간십성: s.sipseong,
        일지와의관계:
          (s.ji + 6) % 12 === saju.pillars.day.ji
            ? "충"
            : { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 }[s.ji] === saju.pillars.day.ji
            ? "합"
            : "무",
      })),
    미래신호: {
      위험: teaser.risks,
      기회: teaser.opps,
      다음대운시작: teaser.nextDaeun ? teaser.nextDaeun.startYear : null,
    },
  };
}
