// ============================================================
// 자미두수(紫微斗數) 명반 계산 엔진 (결정론적)
// 입력: 음력 생년월일 + 시진 → 12궁 명반
// ============================================================

export const JI = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
export const JI_HANJA = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
export const GAN = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];

export const PALACES = ["명궁", "형제궁", "부처궁", "자녀궁", "재백궁", "질액궁", "천이궁", "노복궁", "관록궁", "전택궁", "복덕궁", "부모궁"];

export const MAJOR_STARS = ["자미", "천기", "태양", "무곡", "천동", "염정", "천부", "태음", "탐랑", "거문", "천상", "천량", "칠살", "파군"];
export const STAR_HANJA = {
  자미: "紫微", 천기: "天機", 태양: "太陽", 무곡: "武曲", 천동: "天同", 염정: "廉貞",
  천부: "天府", 태음: "太陰", 탐랑: "貪狼", 거문: "巨門", 천상: "天相", 천량: "天梁",
  칠살: "七殺", 파군: "破軍",
  문창: "文昌", 문곡: "文曲", 좌보: "左輔", 우필: "右弼", 록존: "祿存", 천마: "天馬",
};

// 60갑자 납음오행 (2간지씩 동일)
const NAPEUM = [
  "금", "화", "목", "토", "금", "화", "수", "토", "금", "목",
  "수", "토", "화", "목", "수", "금", "화", "목", "토", "금",
  "화", "수", "토", "금", "목", "수", "토", "화", "목", "수",
];
const BUREAU = { 수: 2, 목: 3, 금: 4, 토: 5, 화: 6 };
export const BUREAU_NAME = { 2: "수이국(水二局)", 3: "목삼국(木三局)", 4: "금사국(金四局)", 5: "토오국(土五局)", 6: "화육국(火六局)" };

// 사화 (년간 → [화록, 화권, 화과, 화기])
const SAHWA = {
  0: ["염정", "파군", "무곡", "태양"],  // 갑
  1: ["천기", "천량", "자미", "태음"],  // 을
  2: ["천동", "천기", "문창", "염정"],  // 병
  3: ["태음", "천동", "천기", "거문"],  // 정
  4: ["탐랑", "태음", "우필", "천기"],  // 무
  5: ["무곡", "탐랑", "천량", "문곡"],  // 기
  6: ["태양", "무곡", "태음", "천동"],  // 경
  7: ["거문", "태양", "문곡", "문창"],  // 신
  8: ["천량", "자미", "좌보", "무곡"],  // 임
  9: ["파군", "거문", "태음", "탐랑"],  // 계
};
export const SAHWA_NAME = ["화록(化祿)", "화권(化權)", "화과(化科)", "화기(化忌)"];

// 록존 (년간 → 지지)
const NOKJON = { 0: 2, 1: 3, 2: 5, 3: 6, 4: 5, 5: 6, 6: 8, 7: 9, 8: 11, 9: 0 };

/**
 * 자미두수 명반 계산
 * @param {Object} p { lunarYear, lunarMonth, lunarDay, hourBranch(0~11), gender('M'|'F') }
 */
export function computeZiwei(p) {
  const { lunarYear, lunarMonth, lunarDay, hourBranch, gender } = p;
  const m = lunarMonth, h = hourBranch, d = lunarDay;

  const yearStem = ((lunarYear - 4) % 10 + 10) % 10;
  const yearBranch = ((lunarYear - 4) % 12 + 12) % 12;

  // 명궁·신궁 (인궁에서 월 순행 → 시 역행/순행)
  const myeong = ((2 + (m - 1) - h) % 12 + 12) % 12;
  const sin = ((2 + (m - 1) + h) % 12 + 12) % 12;

  // 궁 천간 (오호둔: 년간 → 인월 천간)
  const inStem = ((yearStem % 5) * 2 + 2) % 10;
  const stemOf = (pos) => (inStem + ((pos - 2 + 12) % 12)) % 10;

  // 오행국 (명궁 간지의 납음오행)
  const mStem = stemOf(myeong);
  const idx60 = (() => {
    for (let k = 0; k < 60; k++) if (k % 10 === mStem && k % 12 === myeong) return k;
    return 0;
  })();
  const napeum = NAPEUM[Math.floor(idx60 / 2)];
  const bureau = BUREAU[napeum];

  // 자미성 위치
  const x = Math.ceil(d / bureau);
  const r = x * bureau - d;
  let ziweiPos = (2 + (x - 1)) % 12;
  if (r > 0) ziweiPos = r % 2 === 1 ? ((ziweiPos - r) % 12 + 12) % 12 : (ziweiPos + r) % 12;

  // 14주성 배치
  const starPos = {};
  const Z = ziweiPos;
  starPos["자미"] = Z;
  starPos["천기"] = ((Z - 1) % 12 + 12) % 12;
  starPos["태양"] = ((Z - 3) % 12 + 12) % 12;
  starPos["무곡"] = ((Z - 4) % 12 + 12) % 12;
  starPos["천동"] = ((Z - 5) % 12 + 12) % 12;
  starPos["염정"] = ((Z - 8) % 12 + 12) % 12;
  const F = (16 - Z) % 12; // 천부 (인신 축 대칭)
  starPos["천부"] = F;
  starPos["태음"] = (F + 1) % 12;
  starPos["탐랑"] = (F + 2) % 12;
  starPos["거문"] = (F + 3) % 12;
  starPos["천상"] = (F + 4) % 12;
  starPos["천량"] = (F + 5) % 12;
  starPos["칠살"] = (F + 6) % 12;
  starPos["파군"] = (F + 10) % 12;

  // 보조성
  starPos["문창"] = ((10 - h) % 12 + 12) % 12;
  starPos["문곡"] = (4 + h) % 12;
  starPos["좌보"] = (4 + (m - 1)) % 12;
  starPos["우필"] = ((10 - (m - 1)) % 12 + 12) % 12;
  starPos["록존"] = NOKJON[yearStem];
  const MA = { 0: 2, 4: 2, 8: 2, 2: 8, 6: 8, 10: 8, 5: 11, 9: 11, 1: 11, 11: 5, 3: 5, 7: 5 };
  starPos["천마"] = MA[yearBranch];

  // 사화 부여
  const sahwa = {}; // star → 록/권/과/기
  const sh = SAHWA[yearStem];
  ["록", "권", "과", "기"].forEach((k, i) => { sahwa[sh[i]] = k; });

  // 12궁 구성 (명궁에서 역행)
  const palaces = PALACES.map((name, i) => {
    const pos = ((myeong - i) % 12 + 12) % 12;
    const majors = MAJOR_STARS.filter((s) => starPos[s] === pos);
    const minors = ["문창", "문곡", "좌보", "우필", "록존", "천마"].filter((s) => starPos[s] === pos);
    return { name, pos, stem: stemOf(pos), majors, minors };
  });
  const palaceAt = (name) => palaces.find((pp) => pp.name === name);

  // 공궁 차성 (대궁 주성 빌림)
  function effectiveMajors(pal) {
    if (pal.majors.length) return { stars: pal.majors, borrowed: false };
    const opp = ((pal.pos + 6) % 12);
    const stars = MAJOR_STARS.filter((s) => starPos[s] === opp);
    return { stars, borrowed: true };
  }

  // 대한 (오행국수 나이부터 10년씩 / 양남음녀 순행)
  const yangYear = yearStem % 2 === 0;
  const forward = (yangYear && gender === "M") || (!yangYear && gender === "F");
  const daehan = [];
  for (let i = 0; i < 8; i++) {
    const pos = ((myeong + (forward ? i : -i)) % 12 + 12) % 12;
    daehan.push({
      startAge: bureau + i * 10,
      endAge: bureau + i * 10 + 9,
      pos,
      palaceName: PALACES[((myeong - pos) % 12 + 12) % 12] || "",
    });
  }
  // 인연 창: 대한 궁의 지지가 본명 부처궁 지지와 같은 10년
  const buche = palaceAt("부처궁");
  const marriageDaehan = daehan.find((dh) => dh.pos === buche.pos);

  return {
    input: p,
    yearStem, yearBranch,
    myeong, sin, bureau, napeum,
    starPos, sahwa,
    palaces, palaceAt, effectiveMajors,
    daehan, forward, marriageDaehan,
  };
}

// 인연의 해: 유년 지지가 부처궁 지지와 같은 해 (향후)
export function fateYears(z, birthYear, count = 3) {
  const target = z.palaceAt("부처궁").pos;
  const now = new Date().getFullYear();
  const out = [];
  for (let y = now; y <= now + 14 && out.length < count; y++) {
    if ((((y - 4) % 12) + 12) % 12 === target) out.push(y);
  }
  return out;
}
