// /api/rate — 감정서 만족도 별점 저장 (토큰 기반, 인증 불필요)
import { sb } from "../../../lib/supabase";

export async function POST(req) {
  try {
    const { token, score } = await req.json();
    if (!token || !Number.isInteger(score) || score < 1 || score > 5) {
      return Response.json({ error: "잘못된 요청" }, { status: 400 });
    }
    const client = sb();
    if (!client) return Response.json({ ok: false }, { status: 200 });
    const { error } = await client.from("leads").update({ rating: score }).eq("token", token);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "서버 오류" }, { status: 500 });
  }
}
