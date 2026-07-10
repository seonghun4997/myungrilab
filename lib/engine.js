// ============================================================
// 사주 계산 엔진 (결정론적)
// 정책: 절기 분 단위 판정 / 평균태양시 경도 보정 / 서머타임 반영
//       일진 = JDN 기반(검증 200/200) / 자시법(23시 일 변경)
// ============================================================
import JEOLGI from "./jeolgi";

export const GAN = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
export const GAN_HANJA = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
export const JI = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
export const JI_HANJA = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
export const JI_ANIMAL = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];

// 오행: 0목 1화 2토 3금 4수
export const GAN_ELEM = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
export const JI_ELEM = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
export const ELEM_NAME = ["목", "화", "토", "금", "수"];
export const ELEM_HANJA = ["木", "火", "土", "金", "水"];

// 지장간 (표시용, 첫 항목이 여기/중기.. 마지막이 본기 아님 — 본기는 JI_MAIN_GAN 사용)
export const JIJANGGAN = [
  ["임", "계"], ["계", "신", "기"], ["무", "병", "갑"], ["갑", "을"],
  ["을", "계", "무"], ["무", "경", "병"], ["병", "기", "정"], ["정", "을", "기"],
  ["무", "임", "경"], ["경", "신"], ["신", "정", "무"], ["무", "갑", "임"],
];
// 지지 본기 천간 인덱스
export const JI_MAIN_GAN = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];

export const SIPSEONG = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"];

// ---------- 유틸 ----------
export function jdn(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

function pad(n) { return String(n).padStart(2, "0"); }

// ---------- 시간 보정 ----------
// 지역 경도 (평균태양시 보정용)
export const REGIONS = [
  { name: "서울", lon: 126.98 }, { name: "부산", lon: 129.08 }, { name: "대구", lon: 128.6 },
  { name: "인천", lon: 126.71 }, { name: "광주", lon: 126.85 }, { name: "대전", lon: 127.38 },
  { name: "울산", lon: 129.31 }, { name: "세종", lon: 127.29 }, { name: "경기", lon: 127.0 },
  { name: "강원", lon: 128.2 }, { name: "충북", lon: 127.7 }, { name: "충남", lon: 126.8 },
  { name: "전북", lon: 127.1 }, { name: "전남", lon: 126.9 }, { name: "경북", lon: 128.7 },
  { name: "경남", lon: 128.3 }, { name: "제주", lon: 126.53 }, { name: "모름/해외", lon: null },
];

// 한국 서머타임 시행 기간 (해당 기간 출생 시 -60분)
const DST = [
  ["1948-06-01", "1948-09-13"], ["1949-04-03", "1949-09-11"], ["1950-04-01", "1950-09-10"],
  ["1951-05-06", "1951-09-09"], ["1955-05-05", "1955-09-09"], ["1956-05-20", "1956-09-30"],
  ["1957-05-05", "1957-09-22"], ["1958-05-04", "1958-09-21"], ["1959-05-03", "1959-09-20"],
  ["1960-05-01", "1960-09-18"], ["1987-05-10", "1987-10-11"], ["1988-05-08", "1988-10-09"],
];

// 표준자오선 이력: 1908.4.1~1911 127.5° / 1954.3.21~1961.8.9 127.5° / 그 외 135°
function standardMeridian(dateStr) {
  if (dateStr >= "1908-04-01" && dateStr <= "1911-12-31") return 127.5;
  if (dateStr >= "1954-03-21" && dateStr <= "1961-08-09") return 127.5;
  return 135;
}

export function timeCorrection(dateStr, lon) {
  let mins = 0;
  const notes = [];
  if (lon != null) {
    const std = standardMeridian(dateStr);
    const c = Math.round((lon - std) * 4);
    mins += c;
    notes.push(`경도 보정 ${c >= 0 ? "+" : ""}${c}분`);
  } else {
    notes.push("경도 보정 미적용(출생지 모름)");
  }
  for (const [s, e] of DST) {
    if (dateStr >= s && dateStr <= e) {
      mins -= 60;
      notes.push("서머타임 -60분");
      break;
    }
  }
  return { mins, notes };
}

// ---------- 절기 ----------
// 해당 연도 12절 [입춘..소한]. 소한은 그 해 1월. 시간순 정렬을 위해 소한을 앞으로 배치한 시퀀스 생성
function jeolgiSeq(year) {
  const cur = JEOLGI[year];
  if (!cur) return null;
  // [소한(1월), 입춘, 경칩, ..., 대설] 순 (그 해 안의 시간순)
  return [
    { name: "소한", t: cur[11], monthJi: 1 },   // 축월
    { name: "입춘", t: cur[0], monthJi: 2 },    // 인월
    { name: "경칩", t: cur[1], monthJi: 3 },
    { name: "청명", t: cur[2], monthJi: 4 },
    { name: "입하", t: cur[3], monthJi: 5 },
    { name: "망종", t: cur[4], monthJi: 6 },
    { name: "소서", t: cur[5], monthJi: 7 },
    { name: "입추", t: cur[6], monthJi: 8 },
    { name: "백로", t: cur[7], monthJi: 9 },
    { name: "한로", t: cur[8], monthJi: 10 },
    { name: "입동", t: cur[9], monthJi: 11 },
    { name: "대설", t: cur[10], monthJi: 0 },   // 자월
  ];
}

// 출생시각(KST 표준시, "YYYY-MM-DDTHH:MM") 기준 — 직전 절기와 다음 절기
function findJeolgi(birthISO, year) {
  const all = [];
  for (const y of [year - 1, year, year + 1]) {
    const seq = jeolgiSeq(y);
    if (seq) all.push(...seq);
  }
  all.sort((a, b) => (a.t < b.t ? -1 : 1));
  let prev = null, next = null;
  for (const j of all) {
    if (j.t <= birthISO) prev = j;
    else { next = j; break; }
  }
  return { prev, next };
}

// ---------- 명식 계산 ----------
// input: { y, m, d, hour(0-23|null), minute, gender('M'|'F'), lon(경도|null) }
export function computeSaju(input) {
  const { y, m, d, gender } = input;
  const hour = input.hour;
  const minute = input.minute || 0;
  const dateStr = `${y}-${pad(m)}-${pad(d)}`;

  // --- 시간 보정 (시주/일 경계용) ---
  const corr = timeCorrection(dateStr, input.lon);
  let effY = y, effM = m, effD = d, effHour = hour, effMin = minute;
  if (hour != null) {
    const base = new Date(Date.UTC(y, m - 1, d, hour, minute));
    base.setUTCMinutes(base.getUTCMinutes() + corr.mins);
    effY = base.getUTCFullYear(); effM = base.getUTCMonth() + 1; effD = base.getUTCDate();
    effHour = base.getUTCHours(); effMin = base.getUTCMinutes();
  }

  // --- 년주/월주 (절기 기준, 표준시 그대로 비교) ---
  const hh = hour == null ? 12 : hour; // 시간 모름 → 정오로 절기 비교 (절입 당일 아니면 영향 없음)
  const birthISO = `${dateStr}T${pad(hh)}:${pad(minute)}`;
  const { prev, next } = findJeolgi(birthISO, y);

  // 사주년도: 입춘 기준
  let sajuYear = y;
  const ipchun = JEOLGI[y] ? JEOLGI[y][0] : null;
  if (ipchun && birthISO < ipchun) sajuYear = y - 1;
  const yearGan = ((sajuYear - 4) % 10 + 10) % 10;
  const yearJi = ((sajuYear - 4) % 12 + 12) % 12;

  // 월지: 직전 절기 기준
  const monthJi = prev ? prev.monthJi : 2;
  // 월간 (오호둔): 갑기년→병인월 시작
  const monthOrder = (monthJi - 2 + 12) % 12; // 인월=0
  const monthGan = ((yearGan % 5) * 2 + 2 + monthOrder) % 10;

  // --- 일주 (JDN + 49, 자시법: 보정시 23시 이후 → 다음날) ---
  let dY = effY, dM = effM, dD = effD;
  if (hour != null && effHour >= 23) {
    const nd = new Date(Date.UTC(effY, effM - 1, effD));
    nd.setUTCDate(nd.getUTCDate() + 1);
    dY = nd.getUTCFullYear(); dM = nd.getUTCMonth() + 1; dD = nd.getUTCDate();
  }
  const dayIdx = ((jdn(dY, dM, dD) + 49) % 60 + 60) % 60;
  const dayGan = dayIdx % 10;
  const dayJi = dayIdx % 12;

  // --- 시주 (오서둔) ---
  let hourGan = null, hourJi = null;
  if (hour != null) {
    hourJi = Math.floor(((effHour + 1) % 24) / 2); // 23~1시=자(0)
    hourGan = ((dayGan % 5) * 2 + hourJi) % 10;
  }

  const pillars = {
    year: { gan: yearGan, ji: yearJi },
    month: { gan: monthGan, ji: monthJi },
    day: { gan: dayGan, ji: dayJi },
    hour: hour != null ? { gan: hourGan, ji: hourJi } : null,
  };

  // --- 십성 ---
  function tenGod(me, other, otherYang) {
    const rel = (GAN_ELEM[other] - GAN_ELEM[me] + 5) % 5;
    const sameYang = (me % 2) === (otherYang ? 0 : 1) ? false : true; // 아래에서 재계산
    return rel;
  }
  function sipseongOfGan(other) {
    const rel = (GAN_ELEM[other] - GAN_ELEM[dayGan] + 5) % 5;
    const same = (other % 2) === (dayGan % 2);
    return SIPSEONG[rel * 2 + (same ? 0 : 1)];
  }
  function sipseongOfJi(jiIdx) {
    return sipseongOfGan(JI_MAIN_GAN[jiIdx]);
  }

  // --- 오행 분포 (8자, 시주 없으면 6자) ---
  const elemCount = [0, 0, 0, 0, 0];
  const glyphs = [];
  for (const key of ["year", "month", "day", "hour"]) {
    const p = pillars[key];
    if (!p) continue;
    elemCount[GAN_ELEM[p.gan]]++;
    elemCount[JI_ELEM[p.ji]]++;
    glyphs.push({ pos: key, type: "gan", idx: p.gan }, { pos: key, type: "ji", idx: p.ji });
  }

  // --- 신강/신약 (간이: 일간+인성 오행 세력, 월지 가중 2) ---
  const myElem = GAN_ELEM[dayGan];
  const inElem = (myElem + 4) % 5; // 나를 생하는 오행
  let power = 0, total = 0;
  for (const key of ["year", "month", "day", "hour"]) {
    const p = pillars[key];
    if (!p) continue;
    for (const [e, w] of [[GAN_ELEM[p.gan], 1], [JI_ELEM[p.ji], key === "month" ? 2.5 : 1]]) {
      total += w;
      if (e === myElem || e === inElem) power += w;
    }
  }
  const strong = power / total >= 0.45;

  // --- 신살 ---
  const sinsal = [];
  const groupOf = (ji) => {
    if ([2, 6, 10].includes(ji)) return 0;  // 인오술 화국
    if ([8, 0, 4].includes(ji)) return 1;   // 신자진 수국
    if ([5, 9, 1].includes(ji)) return 2;   // 사유축 금국
    return 3;                                // 해묘미 목국
  };
  const DOHWA = [3, 9, 6, 0];   // 화국→묘, 수국→유, 금국→오, 목국→자
  const YEONMA = [8, 2, 11, 5]; // 화국→신, 수국→인, 금국→해, 목국→사
  const HWAGAE = [10, 4, 1, 7];
  const allJi = ["year", "month", "day", "hour"].filter(k => pillars[k]).map(k => ({ k, ji: pillars[k].ji }));
  for (const base of [pillars.year.ji, pillars.day.ji]) {
    const g = groupOf(base);
    for (const { k, ji } of allJi) {
      if (ji === DOHWA[g] && !sinsal.find(s => s.name === "도화" && s.pos === k)) sinsal.push({ name: "도화", pos: k });
      if (ji === YEONMA[g] && !sinsal.find(s => s.name === "역마" && s.pos === k)) sinsal.push({ name: "역마", pos: k });
      if (ji === HWAGAE[g] && !sinsal.find(s => s.name === "화개" && s.pos === k)) sinsal.push({ name: "화개", pos: k });
    }
  }
  // 천을귀인 (일간 기준)
  const CHEONEUL = { 0: [1, 7], 4: [1, 7], 6: [1, 7], 1: [0, 8], 5: [0, 8], 2: [11, 9], 3: [11, 9], 7: [2, 6], 8: [5, 3], 9: [5, 3] };
  for (const { k, ji } of allJi) {
    if ((CHEONEUL[dayGan] || []).includes(ji)) sinsal.push({ name: "천을귀인", pos: k });
  }
  // 괴강/백호 (일주)
  const dayGanzi = GAN[dayGan] + JI[dayJi];
  if (["경진", "경술", "임진", "무술"].includes(dayGanzi)) sinsal.push({ name: "괴강", pos: "day" });
  if (["갑진", "을미", "병술", "정축", "무진", "임술", "계축"].includes(dayGanzi)) sinsal.push({ name: "백호", pos: "day" });

  // --- 합충 (지지) ---
  const relations = [];
  const posName = { year: "년지", month: "월지", day: "일지", hour: "시지" };
  for (let i = 0; i < allJi.length; i++) {
    for (let j = i + 1; j < allJi.length; j++) {
      const a = allJi[i], b = allJi[j];
      if ((a.ji + 6) % 12 === b.ji) relations.push({ type: "충", a: posName[a.k], b: posName[b.k], ji: [a.ji, b.ji] });
      const YUKHAP = { 0: 1, 2: 11, 3: 10, 4: 9, 5: 8, 6: 7 };
      const lo = Math.min(a.ji, b.ji), hi = Math.max(a.ji, b.ji);
      if (YUKHAP[lo] === hi) relations.push({ type: "합", a: posName[a.k], b: posName[b.k], ji: [a.ji, b.ji] });
    }
  }

  // --- 대운 ---
  const yangYear = yearGan % 2 === 0;
  const forward = (yangYear && gender === "M") || (!yangYear && gender === "F");
  const birthMs = Date.parse(birthISO + ":00+09:00");
  let daeunSu = 5;
  if (forward && next) daeunSu = Math.round((Date.parse(next.t + ":00+09:00") - birthMs) / 86400000 / 3);
  if (!forward && prev) daeunSu = Math.round((birthMs - Date.parse(prev.t + ":00+09:00")) / 86400000 / 3);
  daeunSu = Math.max(1, Math.min(10, daeunSu));

  const monthIdx60 = (() => {
    for (let k = 0; k < 60; k++) if (k % 10 === monthGan && k % 12 === monthJi) return k;
    return 0;
  })();
  const daeun = [];
  for (let i = 1; i <= 9; i++) {
    const idx = ((monthIdx60 + (forward ? i : -i)) % 60 + 60) % 60;
    daeun.push({
      startAge: daeunSu + (i - 1) * 10,
      startYear: sajuYear + daeunSu + (i - 1) * 10,
      gan: idx % 10, ji: idx % 12,
      sipseong: sipseongOfGan(idx % 10),
    });
  }

  // --- 세운 (출생~+6년 후까지) ---
  const nowYear = new Date().getFullYear();
  const seun = [];
  for (let yy = sajuYear; yy <= nowYear + 6; yy++) {
    const g = ((yy - 4) % 10 + 10) % 10;
    const j = ((yy - 4) % 12 + 12) % 12;
    seun.push({ year: yy, gan: g, ji: j, sipseong: sipseongOfGan(g) });
  }

  return {
    input: { ...input, dateStr },
    corr,
    pillars,
    sajuYear,
    elemCount,
    strong,
    myElem,
    sinsal,
    relations,
    daeun,
    daeunSu,
    forward,
    seun,
    sipseongOfGan,
    sipseongOfJi,
    dayGanzi,
    jeolgi: { prev, next },
  };
}
