// ============================================================
// 궁합 계산 (규칙 기반) — A의 부처궁 vs B의 명궁 상호 대조
// v16.3: 상세 풀이(gonghapDetail) + 상대 인물평(persona)
// ============================================================
import { computeZiwei, JI } from "./ziwei";

const ZIWEI_GROUP = ["자미", "천기", "태양", "무곡", "천동", "염정"];
const SAMHAP = [[8, 0, 4], [5, 9, 1], [2, 6, 10], [11, 3, 7]]; // 신자진 사유축 인오술 해묘미

function samhapGroup(pos) { return SAMHAP.findIndex((g) => g.includes(pos)); }

// 주성 → 성정 한 줄 (그 사람이 어떤 사람인지)
const STAR_LOOK = {
  자미: "중심이 단단하고 기품이 있는", 천기: "머리 회전이 빠르고 섬세한", 태양: "밝고 베풀 줄 아는",
  무곡: "결단력 있고 실속을 챙기는", 천동: "순하고 정이 많은", 염정: "매력 있고 자기 색이 뚜렷한",
  천부: "포용력 있고 안정감을 주는", 태음: "차분하고 속정이 깊은", 탐랑: "다재다능하고 사교적인",
  거문: "관찰력이 깊고 말에 무게가 있는", 천상: "공정하고 배려가 몸에 밴", 천량: "어른스럽고 지켜줄 줄 아는",
  칠살: "추진력 있고 화끈한", 파군: "새로움을 두려워하지 않는",
};
// 부처궁 주성 → 그 사람의 연애 결
const STAR_LOVE = {
  자미: "존중받는다고 느낄 때 마음을 다 여는", 천기: "대화가 통해야 깊어지는", 태양: "표현이 크고 아낌없이 주는",
  무곡: "말보다 행동으로 애정을 증명하는", 천동: "편안함 속에서 오래 가는", 염정: "밀도 높은 애정을 주고받고 싶어하는",
  천부: "든든한 울타리가 되어주는", 태음: "잔잔하지만 한결같은", 탐랑: "설렘과 재미를 함께 원하는",
  거문: "속 깊은 대화로 신뢰를 쌓는", 천상: "서로의 예의를 지키며 아끼는", 천량: "보호자처럼 챙겨주는",
  칠살: "확신이 서면 직진하는", 파군: "형식보다 진심을 보는",
};
const look = (stars) => STAR_LOOK[stars?.[0]] || "자기만의 결이 뚜렷한";
const love = (stars) => STAR_LOVE[stars?.[0]] || "진심을 천천히 보여주는";

function oneWay(zA, zB) {
  // A의 부처궁(이상형) 별이 B의 명궁(실제 그 사람)에 떠 있는가
  const spouseA = zA.effectiveMajors(zA.palaceAt("부처궁")).stars;
  const selfB = zB.effectiveMajors(zB.palaceAt("명궁")).stars;
  const hits = spouseA.filter((s) => selfB.includes(s));
  let score = hits.length * 4;
  const grpMatch = spouseA.some((s) => ZIWEI_GROUP.includes(s)) === selfB.some((s) => ZIWEI_GROUP.includes(s));
  if (grpMatch && !hits.length) score += 1;
  return { score, hits, grpMatch, spouse: spouseA, self: selfB };
}

export function gonghap(birthA, birthB, lunA, lunB) {
  const zA = computeZiwei({ lunarYear: lunA.year, lunarMonth: lunA.month, lunarDay: lunA.day, hourBranch: birthA.slotIdx ?? 6, gender: birthA.gender, solarYear: birthA.y, solarMonth: birthA.m, solarDay: birthA.d });
  const zB = computeZiwei({ lunarYear: lunB.year, lunarMonth: lunB.month, lunarDay: lunB.day, hourBranch: birthB.slotIdx ?? 6, gender: birthB.gender, solarYear: birthB.y, solarMonth: birthB.m, solarDay: birthB.d });

  const ab = oneWay(zA, zB); // 내(A) 이상형 ↔ 상대(B) 본모습
  const ba = oneWay(zB, zA);
  let score = ab.score + ba.score;

  const posA = zA.palaceAt("명궁").pos, posB = zB.palaceAt("명궁").pos;
  const samhap = samhapGroup(posA) === samhapGroup(posB);
  if (samhap) score += 2;

  const grade = score >= 8 ? "天緣" : score >= 5 ? "良緣" : score >= 2 ? "可緣" : "淡緣";
  const gradeLine = {
    "天緣": "하늘이 묶어둔 연 — 놓치면 두고두고 아쉬울 짝일세",
    "良緣": "명반이 서로를 향해 기울어 있는 좋은 연일세",
    "可緣": "노력으로 깊어질 수 있는 연일세",
    "淡緣": "담담한 연 — 서두를 것 없네",
  }[grade];

  const notes = [];
  if (ab.hits.length) notes.push(`그대의 배우자 자리(부처궁)에 뜬 ${ab.hits.join("·")}성이, 이 사람의 타고난 자리(명궁)에 그대로 떠 있네`);
  if (ba.hits.length) notes.push(`상대의 배우자 자리에 뜬 ${ba.hits.join("·")}성이 그대의 타고난 자리에 그대로 떠 있네`);
  if (samhap) notes.push(`두 사람의 명궁 자리(${JI[posA]}·${JI[posB]})가 서로 끌어당기는 세 자리, 삼합(三合)으로 묶여 있네`);
  const note = notes.length ? `${notes.join(". ")}. ${gradeLine}.` : `${gradeLine}.`;

  return {
    score, grade, note, gradeLine, ab, ba, samhap,
    jiA: JI[posA], jiB: JI[posB],
    aSpouse: ab.spouse, bSpouse: ba.spouse, aSelf: ba.self, bSelf: ab.self,
  };
}

// ───────── 표시용 점수/희소도 ─────────
export function displayScore(g) {
  const base = { "天緣": 91, "良緣": 83, "可緣": 73, "淡緣": 64 }[g.grade] ?? 70;
  return Math.min(98, base + Math.min(7, g.score));
}
export function gradePct(grade) {
  return { "天緣": 4, "良緣": 9, "可緣": 18, "淡緣": 33 }[grade] ?? 20;
}

// ───────── v16.3 · 고객용 상세 풀이 (A 시점, B = 상대) ─────────
export function gonghapDetail(g) {
  const pct = gradePct(g.grade);
  const sc = displayScore(g);
  const paras = [];

  // ① 점수의 의미
  paras.push(`궁합 ${sc}점 — 자미두수 배치로 보면 100쌍이 만났을 때 위에서 ${pct}쌍 안에 드는 조합이에요. ${g.gradeLine}.`);

  // ② 내 이상형 ↔ 상대 본모습
  const mySp = g.aSpouse[0], bMain = g.bSelf[0];
  if (g.ab.hits.length) {
    paras.push(`그대의 배우자 자리(부처궁)에는 ${g.aSpouse.join("·")}이 앉아 "${love(g.aSpouse)} 사랑"을 그려왔는데, 이 사람이 타고난 별자리(명궁)에 바로 그 ${g.ab.hits.join("·")}이 떠 있어요. 그대가 마음 깊이 그려온 모습을 원래부터 타고난 사람이라는 뜻이에요.`);
  } else if (mySp && bMain) {
    paras.push(`그대의 배우자 자리(부처궁)에 뜬 ${mySp}은 ${love(g.aSpouse)} 사랑을 원해요. 이 사람이 타고난 별(명궁의 ${bMain})은 ${look(g.bSelf)} 성정이라, ${g.ab.grpMatch ? "결이 같은 계열로 흐르니 처음부터 낯설지 않을 거예요" : "결은 다르지만 그만큼 그대에게 없는 것을 채워주는 배치예요"}.`);
  }

  // ③ 상대의 이상형 ↔ 나
  const bSp = g.bSpouse[0];
  if (g.ba.hits.length) {
    paras.push(`반대로 이 사람의 배우자 자리에 뜬 ${g.bSpouse.join("·")}이 그대가 타고난 별과 겹칩니다 — 이 사람이 그려온 짝의 모습에 그대가 닿아 있어요. 서로가 서로의 그림 안에 있는 셈이지요.`);
  } else if (bSp) {
    paras.push(`이 사람의 배우자 자리에는 ${bSp}이 있어 ${love(g.bSpouse)} 관계를 바라는 사람이에요. 그대의 결을 천천히 보여주면 마음이 기우는 구조예요.`);
  }

  // ④ 삼합 — 생활 리듬
  if (g.samhap) {
    paras.push(`두 사람의 명궁 자리(${g.jiA}·${g.jiB})는 서로 끌어당기는 세 자리 — 삼합(三合)으로 묶여 있어요. 만나는 시간대, 쉬는 방식, 결정의 속도 같은 생활의 박자가 잘 맞는 편이라, 오래 볼수록 편해지는 연이에요.`);
  }

  // ⑤ 등급별 조언
  paras.push({
    "天緣": "이런 배치는 자주 오지 않아요. 재고 따지기보다, 먼저 실을 잡으세요.",
    "良緣": "좋은 연은 타이밍이 반이에요. 마음이 조금이라도 움직였다면 이번에 잇는 것을 권해요.",
    "可緣": "첫인상보다 두 번째 대화가 좋은 조합이에요. 가볍게 시작해보고 판단해도 늦지 않아요.",
    "淡緣": "불꽃보다는 온기의 연이에요. 급하지 않게, 궁금하면 이어보세요.",
  }[g.grade]);

  return {
    paras,
    persona: {
      look: `${look(g.bSelf)} 사람`,
      love: `연애에서는 ${love(g.bSpouse)} 스타일`,
    },
  };
}
