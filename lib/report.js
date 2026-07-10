// ============================================================
// 진로·학업 종합 리포트 — 섹션 정의 & 명식 사실(facts) 직렬화
// 원칙: LLM은 절대 간지를 계산하지 않는다. 여기서 만든 facts만 해석한다.
// ============================================================
import { GAN, JI, GAN_ELEM, JI_ELEM, ELEM_NAME, JI_MAIN_GAN } from "./engine";
import { talentProfile, schoolRoadmap, sipseongCounts } from "./insights";

export const SECTIONS = [
  { id: "vessel", hanja: "器", title: "타고난 그릇 — 기질과 성정" },
  { id: "talent", hanja: "才", title: "재능과 적성 — 진로의 방향" },
  { id: "study", hanja: "學", title: "공부운 — 이 아이가 성적 내는 방식" },
  { id: "sal", hanja: "煞", title: "학업을 막는 살 — 정체와 다루는 법" },
  { id: "roadmap", hanja: "曆", title: "시기별 로드맵 — 초·중·고와 수능 해" },
  { id: "parent", hanja: "親", title: "부모 가이드 — 이 아이를 키우는 법" },
];

export function buildFacts(saju) {
  const P = saju.pillars;
  const f = (p, label) =>
    p
      ? {
          기둥: label,
          간지: GAN[p.gan] + JI[p.ji],
          천간: { 글자: GAN[p.gan], 오행: ELEM_NAME[GAN_ELEM[p.gan]], 십성: label === "일주" ? "일간(아이 자신)" : saju.sipseongOfGan(p.gan) },
          지지: { 글자: JI[p.ji], 오행: ELEM_NAME[JI_ELEM[p.ji]], 십성: saju.sipseongOfGan(JI_MAIN_GAN[p.ji]) },
        }
      : { 기둥: label, 간지: "미상(출생 시간 모름)" };

  const tp = talentProfile(saju);
  const rm = schoolRoadmap(saju);
  const nowYear = new Date().getFullYear();

  return {
    기본: {
      출생: saju.input.dateStr + (saju.input.hour != null ? ` ${String(saju.input.hour).padStart(2, "0")}:${String(saju.input.minute).padStart(2, "0")}` : " (시간 미상)"),
      성별: saju.input.gender === "M" ? "남자아이" : "여자아이",
      현재연도: nowYear,
      현재나이_만: nowYear - saju.input.y,
    },
    원국: [f(P.year, "년주"), f(P.month, "월주"), f(P.day, "일주"), f(P.hour, "시주")],
    오행분포: Object.fromEntries(ELEM_NAME.map((n, i) => [n, saju.elemCount[i]])),
    신강신약: saju.strong ? "신강" : "신약",
    십성분포: tp.counts,
    재능진단: {
      유형: tp.type.name,
      지배십성: tp.typeKey,
      등급: tp.grade.name,
      등급풀이: tp.grade.line,
    },
    공부별: tp.stars.map((s) => s.name),
    학업을막는살: tp.blockers.map((b) => ({ 이름: b.name, 한자: b.hanja, 별칭: b.short })),
    신살전체: saju.sinsal.map((s) => `${s.name}(${s.pos === "year" ? "년" : s.pos === "month" ? "월" : s.pos === "day" ? "일" : "시"}지)`),
    삼재: saju.samjae?.next ? `${saju.samjae.next[0]}~${saju.samjae.next[2]}년` : null,
    학령로드맵: {
      초등: `${rm.stages[0].from}~${rm.stages[0].to}년`,
      중등: `${rm.stages[1].from}~${rm.stages[1].to}년`,
      고등: `${rm.stages[2].from}~${rm.stages[2].to}년`,
      수능해_고3: rm.suneung,
      학령기_대운전환: rm.turns,
    },
    대운: {
      대운수: saju.daeunSu,
      방향: saju.forward ? "순행" : "역행",
      목록: saju.daeun.slice(0, 4).map((d) => ({
        시작연도: d.startYear,
        시작나이: d.startAge,
        간지: GAN[d.gan] + JI[d.ji],
        천간십성: d.sipseong,
      })),
    },
    수능해세운: (() => {
      const s = saju.seun.find((x) => x.year === rm.suneung);
      return s ? { 연도: s.year, 간지: GAN[s.gan] + JI[s.ji], 천간십성: s.sipseong } : null;
    })(),
  };
}
