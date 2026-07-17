// ============================================================
// /api/match — 인연함 (토큰 인증: 본인 lead token) · v16
// GET ?token= : 내 매칭 카드 목록 (+궁합 점수 · 이달 성사 수)
// POST { token, matchId, action:"respond", accept } : 수락/거절
// POST { token, matchId, action:"kakao", kakaoId } : 카톡ID 등록
// POST { token, action:"profile", profile, intro } : 매칭 프로필 저장
// ============================================================
import { sb } from "../../../lib/supabase";
import { gonghap, gonghapDetail, displayScore, gradePct } from "../../../lib/gonghap";
import { computeZiwei } from "../../../lib/ziwei";
import { MATCH_CONFIG } from "../../../lib/content";
import { smsSafe, MSG } from "../../../lib/sms";

// 저품질 자기소개 필터 — 대충 쓴 프로필은 후보 풀·저장에서 제외
function isQualityIntro(text) {
  const t = String(text || "").trim();
  if (t.length < 10) return false;                                   // "d", "안녕" 수준
  const chars = [...t.replace(/\s/g, "")];
  if (new Set(chars).size < 5) return false;                         // "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ", "아아아아아아아아"
  const jamo = chars.filter((c) => /[ㄱ-ㅎㅏ-ㅣ]/.test(c)).length;   // 미완성 자모(ㅇ,ㅏ 등)
  if (jamo / chars.length > 0.3) return false;                       // "ㅇㅇㅇㅇ아ㅏ앙어앙ㅏ앙"
  if (!/[가-힣]{2}/.test(t) && !/[a-zA-Z]{4}/.test(t)) return false; // 온전한 단어가 하나도 없음
  return true;
}

// 만 19세 이상만 매칭 가능
function isAdult(b) {
  if (!b?.y) return false;
  const t = new Date();
  let age = t.getFullYear() - b.y;
  if (t.getMonth() + 1 < (b.m || 1) || (t.getMonth() + 1 === (b.m || 1) && t.getDate() < (b.d || 1))) age--;
  return age >= 19;
}
import KLCmod from "korean-lunar-calendar";

async function findLead(client, token) {
  if (!token || token.length < 10) return null;
  const { data } = await client.from("leads").select("id, name, birth, profile, intro, report").eq("token", token).single();
  return data;
}

function blind(lead) {
  const p = lead?.profile || {};
  const y = lead?.birth?.y;
  return {
    avatar: p.avatar || "🐶",
    age: y ? new Date().getFullYear() - y + 1 : null, // 세는나이
    job: p.job || "",
    region: p.region || "",
    interests: p.interests || [],
    intro: lead?.intro || "",
  };
}

const todayKST = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

function toLunar(b) {
  const KLC = KLCmod.default || KLCmod;
  const c = new KLC();
  if (!c.setSolarDate(b.y, b.m, b.d)) return null;
  return c.getLunarCalendar();
}

// UX2.0: "왜 이 사람인가" 3근거 — 별의 합 / 오행 보완 / 시기 (규칙 기반, 아씨 화법)
function buildReasons(bA, bB, lA, lB) {
  try {
    const mk = (b, l) => computeZiwei({
      lunarYear: l.year, lunarMonth: l.month, lunarDay: l.day,
      hourBranch: b.slotIdx ?? 6, gender: b.gender,
      solarYear: b.y, solarMonth: b.m, solarDay: b.d,
    });
    const zA = mk(bA, lA), zB = mk(bB, lB);
    const aSpouse = zA.effectiveMajors(zA.palaceAt("부처궁")).stars;
    const bMing = zB.effectiveMajors(zB.palaceAt("명궁")).stars;
    const shared = aSpouse.filter((st) => bMing.includes(st));
    const r1 = shared.length
      ? `별의 합 — 내 부처궁과 상대의 명궁에 ${shared[0]}이(가) 함께 떠요. 같은 정서 언어를 쓰는 배치예요.`
      : `별의 합 — 내 부처궁(${aSpouse[0] || "공궁"})이 그리는 결과 상대 명궁(${bMing[0] || "공궁"})의 결이 맞닿아요.`;
    const EL = { 2: "물(水)", 3: "나무(木)", 4: "쇠(金)", 5: "흙(土)", 6: "불(火)" };
    const eA = EL[zA.bureau], eB = EL[zB.bureau];
    const r2 = eA && eB
      ? (eA === eB
        ? `기질 — 두 분 다 ${eA}의 국(局). 삶의 속도가 같은 사람들이에요.`
        : `기질 — ${eA}의 나와 ${eB}의 상대. 서로에게 없는 온도를 채워주는 조합이에요.`)
      : null;
    const age = new Date().getFullYear() - bA.y + 1;
    const cur = (zA.daehan || []).find((d) => age >= d.startAge && age <= d.endAge);
    const r3 = cur
      ? `시기 — 지금은 ${cur.startAge}세부터 흐르는 대운 구간. 실이 움직이기 좋은 때예요.`
      : `시기 — 명반의 흐름상 인연을 미루지 않아도 좋은 때예요.`;
    return [r1, r2, r3].filter(Boolean);
  } catch (e) { return null; }
}

function safeGonghap(bA, bB) {
  try {
    if (!bA || !bB) return null;
    const lA = toLunar(bA), lB = toLunar(bB);
    if (!lA || !lB) return null;
    const g = gonghap(bA, bB, lA, lB);
    const d = gonghapDetail(g);
    return { note: g.note, grade: g.grade, score: displayScore(g), pct: gradePct(g.grade), detail: d.paras, persona: d.persona, reasons: buildReasons(bA, bB, lA, lB) };
  } catch (e) { return null; }
}

export async function GET(req) {
  const client = sb();
  if (!client) return Response.json({ error: "설정 오류" }, { status: 500 });
  const token = new URL(req.url).searchParams.get("token");
  const me = await findLead(client, token);
  if (!me) return Response.json({ error: "인연함을 찾을 수 없습니다." }, { status: 404 });
  if (!isAdult(me.birth)) return Response.json({ name: me.name, notAdult: true, cards: [], hasProfile: false, hasReport: !!me.report, monthMatched: 0 });

  const { data: rows, error } = await client
    .from("matches")
    .select("*")
    .or(`lead_a.eq.${me.id},lead_b.eq.${me.id}`)
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // UX2.0: 차단 쌍 — 양방향 제외 (blocks 테이블이 아직 없으면 조용히 무시)
  const blockedIds = new Set();
  try {
    const { data: bl } = await client.from("blocks").select("blocker, blocked")
      .or(`blocker.eq.${me.id},blocked.eq.${me.id}`);
    for (const b of bl || []) blockedIds.add(b.blocker === me.id ? b.blocked : b.blocker);
  } catch (e) {}

  const cards = [];
  for (const m of rows || []) {
    const iAmA = m.lead_a === me.id;
    const cOtherId = iAmA ? m.lead_b : m.lead_a;
    if (blockedIds.has(cOtherId) || m.status === "blocked") continue;
    // 읽음 기록 — 받는 쪽(lead_b)이 처음 열람한 시각 (실패해도 무시: seen_at 컬럼 SQL 필요)
    if (!iAmA && !m.seen_at && m.b_accept == null) {
      try { await client.from("matches").update({ seen_at: new Date().toISOString() }).eq("id", m.id); m.seen_at = 1; } catch (e) {}
    }
    const otherId = iAmA ? m.lead_b : m.lead_a;
    const { data: other } = await client.from("leads").select("id, birth, profile, intro").eq("id", otherId).single();
    const myAccept = iAmA ? m.a_accept : m.b_accept;
    const otherAccept = iAmA ? m.b_accept : m.a_accept;
    const myPaid = iAmA ? m.a_paid : m.b_paid;
    const otherPaid = iAmA ? m.b_paid : m.a_paid;
    const matched = m.a_accept === true && m.b_accept === true;
    const g = safeGonghap(me.birth, other?.birth);
    cards.push({
      id: m.id,
      createdAt: m.created_at,
      note: g?.note || m.note,
      grade: g?.grade || null,
      score: g?.score || null,
      pct: g?.pct || null,
      other: blind(other),
      myAccept, otherAccept, matched,
      reasons: g?.reasons || null,
      otherSeen: iAmA ? !!m.seen_at : true,
      myPaid, otherPaid,
      myKakaoSet: !!(iAmA ? m.kakao_a : m.kakao_b),
      freeBeta: !!MATCH_CONFIG.FREE_BETA,
      otherKakao: matched && (MATCH_CONFIG.FREE_BETA || (myPaid && otherPaid)) ? (iAmA ? m.kakao_b : m.kakao_a) : null,
    });
  }

  // 이번 달 성사 수 (실제 상호 수락 건)
  let monthMatched = 0;
  try {
    const first = new Date(); first.setDate(1); first.setHours(0, 0, 0, 0);
    const { count } = await client
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("a_accept", true).eq("b_accept", true)
      .gte("created_at", first.toISOString());
    monthMatched = count || 0;
  } catch (e) {}

  // ── 자동 추천: 명반 궁합이 가장 좋은 후보 1명 (하루 1장) ──
  let candidate = null;
  let poolCount = 0;
  const dailyDone = me.profile?.lastCard === todayKST();
  const myG = me.birth?.gender;
  if (me.profile?.avatar && me.birth?.y && !dailyDone && (myG === "M" || myG === "F")) {
    const wantG = myG === "M" ? "F" : "M";
    try {
      const excluded = new Set([me.id, ...(rows || []).map((m) => (m.lead_a === me.id ? m.lead_b : m.lead_a))]);
      const skips = new Set(me.profile?.skips || []);
      const prefs = me.profile?.prefs || {};
      const stats = me.profile?.passStats || {};
      const myAge = me.birth?.y ? new Date().getFullYear() - me.birth.y + 1 : null;
      const myRegionKey = String(me.profile?.region || "").trim().split(/\s+/)[0] || null;
      const { data: pool } = await client
        .from("leads")
        .select("id, birth, profile, intro")
        .eq("match_optin", true)
        .neq("id", me.id)
        .order("created_at", { ascending: false })
        .limit(80);
      let best = null;
      for (const cnd of pool || []) {
        if (excluded.has(cnd.id) || skips.has(cnd.id)) continue;
        if (!cnd.birth?.y || !cnd.profile?.avatar) continue;
        if (!isQualityIntro(cnd.intro)) continue; // 대충 쓴 프로필 제외
        if (cnd.birth?.gender !== wantG) continue; // 이성만 — 성별 미기재도 제외
        if (!isAdult(cnd.birth)) continue;
        if (blockedIds.has(cnd.id)) continue;
        poolCount++;
        // 선호 설정 (명시) — 나이 범위·지역
        const cAge = cnd.birth?.y ? new Date().getFullYear() - cnd.birth.y + 1 : null;
        if (prefs.ageMin && cAge && cAge < prefs.ageMin) continue;
        if (prefs.ageMax && cAge && cAge > prefs.ageMax) continue;
        if (prefs.region) {
          const key = String(prefs.region).trim().split(/\s+/)[0];
          if (key && !String(cnd.profile?.region || "").includes(key)) continue;
        }
        // 넘김 이유 학습 (암묵) — 나이 사유 누적 시 ±6살 창, 거리 사유 누적 시 같은 지역 가점
        if (!prefs.ageMin && !prefs.ageMax && (stats.age || 0) >= 1 && myAge && cAge && Math.abs(cAge - myAge) > 6) continue;
        const g = safeGonghap(me.birth, cnd.birth);
        if (!g) continue;
        let eff = g.score;
        if ((stats.dist || 0) >= 1 && myRegionKey && String(cnd.profile?.region || "").includes(myRegionKey)) eff += 5;
        if (!best || eff > best.eff) best = { cnd, g, eff };
      }
      if (best) candidate = { candidateId: best.cnd.id, ...best.g, other: blind(best.cnd) };
    } catch (e) {}
  }

  return Response.json({
    name: me.name,
    cards,
    candidate,
    dailyDone,
    hasProfile: !!(me.profile && me.profile.avatar),
    hasReport: !!me.report,
    myAvatar: me.profile?.avatar || "🐶",
    myProfile: me.profile || null,
    myIntro: me.intro || "",
    myPrefs: me.profile?.prefs || null,
    poolCount,
    monthMatched,
  });
}

export async function POST(req) {
  const client = sb();
  if (!client) return Response.json({ error: "설정 오류" }, { status: 500 });
  const { token, matchId, action, accept, kakaoId, profile, intro, candidateId } = await req.json();
  const me = await findLead(client, token);
  if (!me) return Response.json({ error: "인증 실패" }, { status: 401 });

  // ── 매칭 프로필 저장 (온보딩) ──
  if (action === "profile") {
    if (!isAdult(me.birth)) return Response.json({ error: "紅線 매칭은 만 19세 이상만 이용할 수 있어요." }, { status: 403 });
    const p = profile || {};
    const clean = {
      avatar: String(p.avatar || "").slice(0, 8),
      job: String(p.job || "").trim().slice(0, 20),
      region: String(p.region || "").trim().slice(0, 20),
      interests: Array.isArray(p.interests) ? p.interests.slice(0, 5).map((x) => String(x).slice(0, 12)) : [],
    };
    const introClean = String(intro || "").trim().slice(0, 500);
    if (!isQualityIntro(introClean)) {
      return Response.json({ error: "자기소개를 조금만 더 정성껏 적어주세요. 상대가 처음 보는 글이에요 (10자 이상, 온전한 문장으로)." }, { status: 400 });
    }
    const upd = { profile: clean, match_optin: true, intro: introClean };
    const { error } = await client.from("leads").update(upd).eq("id", me.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  // ── 추천 후보에게 실 걸기 / 넘기기 ──
  if (action === "propose" || action === "skip") {
    const cid = String(candidateId || "");
    if (!cid) return Response.json({ error: "후보가 없습니다." }, { status: 400 });

    if (action === "skip") {
      const prof = { ...(me.profile || {}) };
      prof.skips = [...new Set([...(prof.skips || []), cid])].slice(-100);
      prof.lastCard = todayKST(); // 하루 1장 — 넘겨도 오늘 카드는 소진
      // UX2.0: 넘김 이유 학습 — age(나이대)·dist(거리)·feel(느낌)
      if (reason === "age" || reason === "dist" || reason === "feel") {
        prof.passStats = { ...(prof.passStats || {}) };
        prof.passStats[reason] = (prof.passStats[reason] || 0) + 1;
      }
      const { error } = await client.from("leads").update({ profile: prof }).eq("id", me.id);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true });
    }

    // propose — 검증 후 매칭 생성 (내 쪽은 이미 수락 상태)
    const { data: cnd } = await client.from("leads").select("id, name, phone, token, birth, profile, match_optin").eq("id", cid).single();
    if (!cnd || !cnd.match_optin || !cnd.birth?.y) return Response.json({ error: "지금은 이을 수 없는 인연이에요." }, { status: 400 });
    const g1 = me.birth?.gender, g2 = cnd.birth?.gender;
    if (!((g1 === "M" && g2 === "F") || (g1 === "F" && g2 === "M"))) {
      return Response.json({ error: "지금은 이을 수 없는 인연이에요." }, { status: 400 });
    }
    const { data: dup } = await client
      .from("matches").select("id")
      .or(`and(lead_a.eq.${me.id},lead_b.eq.${cid}),and(lead_a.eq.${cid},lead_b.eq.${me.id})`)
      .limit(1);
    if (dup && dup.length) return Response.json({ error: "이미 실이 걸려 있는 인연이에요." }, { status: 400 });
    const g = safeGonghap(me.birth, cnd.birth);
    const { data: created, error } = await client
      .from("matches")
      .insert({ lead_a: me.id, lead_b: cid, a_accept: true, note: g?.note || null, status: "proposed" })
      .select("id").single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    try {
      const prof = { ...(me.profile || {}) };
      prof.lastCard = todayKST();
      await client.from("leads").update({ profile: prof }).eq("id", me.id);
    } catch (e) {}
    // 상대에게 카드 도착 문자 (자동)
    await smsSafe(cnd.phone, MSG.card(cnd.name, new URL(req.url).origin, cnd.token));
    return Response.json({ ok: true, id: created.id });
  }

  if (action === "prefs") {
    const prof = { ...(me.profile || {}) };
    const p2 = { ...(prof.prefs || {}) };
    const num = (v) => { const n = Number(v); return Number.isFinite(n) && n >= 19 && n <= 80 ? Math.round(n) : null; };
    p2.ageMin = num(ageMin); p2.ageMax = num(ageMax);
    if (p2.ageMin && p2.ageMax && p2.ageMin > p2.ageMax) { const t = p2.ageMin; p2.ageMin = p2.ageMax; p2.ageMax = t; }
    p2.region = String(region || "").trim().slice(0, 20) || null;
    prof.prefs = p2;
    const { error } = await client.from("leads").update({ profile: prof }).eq("id", me.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true, prefs: p2 });
  }

  const { data: m } = await client.from("matches").select("*").eq("id", matchId).single();
  if (!m || (m.lead_a !== me.id && m.lead_b !== me.id)) {
    return Response.json({ error: "카드를 찾을 수 없습니다." }, { status: 404 });
  }
  const iAmA = m.lead_a === me.id;

  if (action === "respond") {
    const otherAcceptBefore = iAmA ? m.b_accept : m.a_accept;
    const nowMatched = !!accept && otherAcceptBefore === true;
    const upd = iAmA ? { a_accept: !!accept } : { b_accept: !!accept };
    upd.status = nowMatched ? "matched" : accept ? m.status || "proposed" : "declined";
    const { error } = await client.from("matches").update(upd).eq("id", matchId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    const origin = new URL(req.url).origin;
    // 성사 완성 → 그 순간 양쪽에 즉시 문자
    if (nowMatched) {
      const ids = [m.lead_a, m.lead_b];
      const { data: both } = await client.from("leads").select("id, name, phone, token").in("id", ids);
      for (const l of both || []) await smsSafe(l.phone, MSG.matched(l.name, origin, l.token));
    }
    // UX2.0: 스침(거절)도 밤 11시를 기다리지 않고 즉시 — 완곡한 문구로 실 건 쪽에 알림
    if (!accept && otherAcceptBefore === true) {
      const proposerId = iAmA ? m.lead_b : m.lead_a;
      const { data: pr } = await client.from("leads").select("name, phone, token").eq("id", proposerId).single();
      if (pr) await smsSafe(pr.phone, MSG.settled(pr.name, origin, pr.token));
    }
    return Response.json({ ok: true });
  }
  if (action === "block") {
    const otherId2 = iAmA ? m.lead_b : m.lead_a;
    try {
      await client.from("blocks").insert({ blocker: me.id, blocked: otherId2, reason: String(reason || "").slice(0, 80) || null });
    } catch (e) {
      return Response.json({ error: "차단 기능 준비 중이에요. 운영자에게 문의해주세요. (DB)" }, { status: 500 });
    }
    await client.from("matches").update({ status: "blocked" }).eq("id", m.id);
    return Response.json({ ok: true });
  }
  if (action === "kakao") {
    const clean = String(kakaoId || "").trim().slice(0, 40);
    if (!clean) return Response.json({ error: "아이디를 입력해주세요." }, { status: 400 });
    const upd = iAmA ? { kakao_a: clean } : { kakao_b: clean };
    const { error } = await client.from("matches").update(upd).eq("id", matchId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    // UX2.0: 이 등록으로 "서로의 카톡"이 완성되는 순간 — 양쪽에 즉시 알림 (기다림 없는 교환)
    const otherKakaoAlready = iAmA ? m.kakao_b : m.kakao_a;
    const isMatched = m.a_accept === true && m.b_accept === true;
    if (isMatched && otherKakaoAlready) {
      const origin = new URL(req.url).origin;
      const { data: both } = await client.from("leads").select("id, name, phone, token").in("id", [m.lead_a, m.lead_b]);
      for (const l of both || []) await smsSafe(l.phone, MSG.kakaoOpen(l.name, origin, l.token));
    }
    return Response.json({ ok: true });
  }
  return Response.json({ error: "알 수 없는 동작" }, { status: 400 });
}
