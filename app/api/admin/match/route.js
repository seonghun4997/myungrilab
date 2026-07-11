// ============================================================
// /api/admin/match — 운영자 매칭 (ADMIN_KEY 필요)
// GET: 매칭 목록 / POST {action:"preview"|"create", aId, bId} / PATCH {matchId, aPaid?, bPaid?}
// ============================================================
import { sb } from "../../../../lib/supabase";
import { gonghap } from "../../../../lib/gonghap";
import KLCmod from "korean-lunar-calendar";

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
  return Response.json({ matches: data });
}

export async function POST(req) {
  if (!authorized(req)) return Response.json({ error: "인증 실패" }, { status: 401 });
  const client = sb();
  if (!client) return Response.json({ error: "Supabase 미설정" }, { status: 500 });
  const { action, aId, bId } = await req.json();
  if (!aId || !bId || aId === bId) return Response.json({ error: "두 사람을 선택하세요." }, { status: 400 });

  const { data: A } = await client.from("leads").select("id, name, birth, token").eq("id", aId).single();
  const { data: B } = await client.from("leads").select("id, name, birth, token").eq("id", bId).single();
  if (!A || !B) return Response.json({ error: "리드를 찾을 수 없습니다." }, { status: 404 });

  const g = gonghap(A.birth, B.birth, toLunar(A.birth), toLunar(B.birth));

  if (action === "preview") {
    return Response.json({ ...g, aName: A.name, bName: B.name });
  }
  if (action === "create") {
    const { data, error } = await client
      .from("matches")
      .insert({ lead_a: aId, lead_b: bId, note: g.note, status: "proposed" })
      .select("id")
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ id: data.id, aToken: A.token, bToken: B.token, ...g });
  }
  return Response.json({ error: "알 수 없는 동작" }, { status: 400 });
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
