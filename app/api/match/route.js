// ============================================================
// /api/match — 인연함 (토큰 인증: 본인 lead token)
// GET ?token= : 내 매칭 카드 목록 (상대는 블라인드 프로필만)
// POST { token, matchId, action:"respond", accept } : 수락/거절
// POST { token, matchId, action:"kakao", kakaoId } : 카톡ID 등록
// ============================================================
import { sb } from "../../../lib/supabase";

async function findLead(client, token) {
  if (!token || token.length < 10) return null;
  const { data } = await client.from("leads").select("id, name, birth, profile, intro").eq("token", token).single();
  return data;
}

function blind(lead) {
  const p = lead?.profile || {};
  const y = lead?.birth?.y;
  return {
    avatar: p.avatar || "🌙",
    age: y ? new Date().getFullYear() - y + 1 : null, // 세는나이
    job: p.job || "",
    region: p.region || "",
    interests: p.interests || [],
    intro: lead?.intro || "",
  };
}

export async function GET(req) {
  const client = sb();
  if (!client) return Response.json({ error: "설정 오류" }, { status: 500 });
  const token = new URL(req.url).searchParams.get("token");
  const me = await findLead(client, token);
  if (!me) return Response.json({ error: "인연함을 찾을 수 없습니다." }, { status: 404 });

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
    cards.push({
      id: m.id,
      createdAt: m.created_at,
      note: m.note,
      other: blind(other),
      myAccept, otherAccept, matched,
      myPaid, otherPaid,
      myKakaoSet: !!(iAmA ? m.kakao_a : m.kakao_b),
      otherKakao: matched && myPaid && otherPaid ? (iAmA ? m.kakao_b : m.kakao_a) : null,
    });
  }
  return Response.json({ name: me.name, cards, hasProfile: !!me.profile });
}

export async function POST(req) {
  const client = sb();
  if (!client) return Response.json({ error: "설정 오류" }, { status: 500 });
  const { token, matchId, action, accept, kakaoId } = await req.json();
  const me = await findLead(client, token);
  if (!me) return Response.json({ error: "인증 실패" }, { status: 401 });

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
