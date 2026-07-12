// ============================================================
// /api/match — 인연함 (토큰 인증: 본인 lead token) · v16
// GET ?token= : 내 매칭 카드 목록 (+궁합 점수 · 이달 성사 수)
// POST { token, matchId, action:"respond", accept } : 수락/거절
// POST { token, matchId, action:"kakao", kakaoId } : 카톡ID 등록
// POST { token, action:"profile", profile, intro } : 매칭 프로필 저장
// ============================================================
import { sb } from "../../../lib/supabase";
import { gonghap, gonghapDetail, displayScore, gradePct } from "../../../lib/gonghap";
import { MATCH_CONFIG } from "../../../lib/content";

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

function safeGonghap(bA, bB) {
  try {
    if (!bA || !bB) return null;
    const lA = toLunar(bA), lB = toLunar(bB);
    if (!lA || !lB) return null;
    const g = gonghap(bA, bB, lA, lB);
    const d = gonghapDetail(g);
    return { note: g.note, grade: g.grade, score: displayScore(g), pct: gradePct(g.grade), detail: d.paras, persona: d.persona };
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

  const cards = [];
  for (const m of rows || []) {
    const iAmA = m.lead_a === me.id;
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
  const dailyDone = me.profile?.lastCard === todayKST();
  if (me.profile?.avatar && me.birth?.y && !dailyDone) {
    try {
      const excluded = new Set([me.id, ...(rows || []).map((m) => (m.lead_a === me.id ? m.lead_b : m.lead_a))]);
      const skips = new Set(me.profile?.skips || []);
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
        if (me.birth?.gender && cnd.birth?.gender && me.birth.gender === cnd.birth.gender) continue;
        if (!isAdult(cnd.birth)) continue;
        const g = safeGonghap(me.birth, cnd.birth);
        if (!g) continue;
        if (!best || g.score > best.g.score) best = { cnd, g };
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
      const { error } = await client.from("leads").update({ profile: prof }).eq("id", me.id);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true });
    }

    // propose — 검증 후 매칭 생성 (내 쪽은 이미 수락 상태)
    const { data: cnd } = await client.from("leads").select("id, birth, profile, match_optin").eq("id", cid).single();
    if (!cnd || !cnd.match_optin || !cnd.birth?.y) return Response.json({ error: "지금은 이을 수 없는 인연이에요." }, { status: 400 });
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
    return Response.json({ ok: true, id: created.id });
  }

  const { data: m } = await client.from("matches").select("*").eq("id", matchId).single();
  if (!m || (m.lead_a !== me.id && m.lead_b !== me.id)) {
    return Response.json({ error: "카드를 찾을 수 없습니다." }, { status: 404 });
  }
  const iAmA = m.lead_a === me.id;

  if (action === "respond") {
    const upd = iAmA ? { a_accept: !!accept } : { b_accept: !!accept };
    const { error } = await client.from("matches").update(upd).eq("id", matchId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }
  if (action === "kakao") {
    const clean = String(kakaoId || "").trim().slice(0, 40);
    if (!clean) return Response.json({ error: "아이디를 입력해주세요." }, { status: 400 });
    const upd = iAmA ? { kakao_a: clean } : { kakao_b: clean };
    const { error } = await client.from("matches").update(upd).eq("id", matchId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }
  return Response.json({ error: "알 수 없는 동작" }, { status: 400 });
}
