// ============================================================
// /api/admin/match — 운영자 매칭 (ADMIN_KEY 필요)
// GET: 매칭 목록 / POST {action:"preview"|"create", aId, bId} / PATCH {matchId, aPaid?, bPaid?}
// ============================================================
import { sb } from "../../../../lib/supabase";
import { gonghap } from "../../../../lib/gonghap";
import KLCmod from "korean-lunar-calendar";
import { smsSafe, MSG } from "../../../../lib/sms";

function authorized(req) {
  const key = req.headers.get("x-admin-key");
  return key && process.env.ADMIN_KEY && key === process.env.ADMIN_KEY;
}

function toLunar(b) {
  const KLC = KLCmod.default || KLCmod;
  const c = new KLC();
  if (!c.setSolarDate(b.y, b.m, b.d)) throw new Error("음력 변환 실패");
  return c.getLunarCalendar();
}

export async function GET(req) {
  if (!authorized(req)) return Response.json({ error: "인증 실패" }, { status: 401 });
  const client = sb();
  const { data, error } = await client.from("matches").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  // 리드 이름·전화·토큰 조인 (문자 발송용)
  const ids = [...new Set((data || []).flatMap((m) => [m.lead_a, m.lead_b]))];
  let map = {};
  if (ids.length) {
    const { data: ls } = await client.from("leads").select("id, name, phone, token").in("id", ids);
    for (const l of ls || []) map[l.id] = l;
  }
  const matches = (data || []).map((m) => ({
    ...m,
    aName: map[m.lead_a]?.name || "?", aPhone: map[m.lead_a]?.phone || "", aToken: map[m.lead_a]?.token || "",
    bName: map[m.lead_b]?.name || "?", bPhone: map[m.lead_b]?.phone || "", bToken: map[m.lead_b]?.token || "",
  }));
  return Response.json({ matches });
}

export async function POST(req) {
  if (!authorized(req)) return Response.json({ error: "인증 실패" }, { status: 401 });
  const client = sb();
  if (!client) return Response.json({ error: "Supabase 미설정" }, { status: 500 });
  try {
  const { action, aId, bId } = await req.json();
  if (!aId || !bId || aId === bId) return Response.json({ error: "두 사람을 선택하세요." }, { status: 400 });

  const { data: A } = await client.from("leads").select("id, name, phone, birth, token").eq("id", aId).single();
  const { data: B } = await client.from("leads").select("id, name, phone, birth, token").eq("id", bId).single();
  if (!A || !B) return Response.json({ error: "리드를 찾을 수 없습니다." }, { status: 404 });
  if (!A.birth?.y || !B.birth?.y) return Response.json({ error: `생년월일 데이터가 없습니다 (${!A.birth?.y ? A.name : B.name})` }, { status: 400 });

  const g = gonghap(A.birth, B.birth, toLunar(A.birth), toLunar(B.birth));

  if (action === "preview") {
    return Response.json({ ...g, aName: A.name, bName: B.name });
  }
  if (action === "create") {
    const gA = A.birth?.gender, gB = B.birth?.gender;
    if (!((gA === "M" && gB === "F") || (gA === "F" && gB === "M"))) {
      const t = (g) => (g === "M" ? "남" : g === "F" ? "여" : "미기재");
      return Response.json({ error: `이성끼리만 발송할 수 있습니다 — ${A.name}:${t(gA)} · ${B.name}:${t(gB)}` }, { status: 400 });
    }
    const { data, error } = await client
      .from("matches")
      .insert({ lead_a: aId, lead_b: bId, note: g.note, status: "proposed" })
      .select("id")
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    const origin = new URL(req.url).origin;
    await smsSafe(A.phone, MSG.card(A.name, origin, A.token)); // 양쪽 자동 문자
    await smsSafe(B.phone, MSG.card(B.name, origin, B.token));
    return Response.json({ id: data.id, aToken: A.token, bToken: B.token, ...g, smsSent: true });
  }
  return Response.json({ error: "알 수 없는 동작" }, { status: 400 });
  } catch (e) {
    return Response.json({ error: "궁합 계산 실패: " + e.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  if (!authorized(req)) return Response.json({ error: "인증 실패" }, { status: 401 });
  const client = sb();
  const { matchId, aPaid, bPaid } = await req.json();
  const upd = {};
  if (aPaid !== undefined) upd.a_paid = !!aPaid;
  if (bPaid !== undefined) upd.b_paid = !!bPaid;
  const { error } = await client.from("matches").update(upd).eq("id", matchId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
