// ============================================================
// POST /api/my/verify — 코드 확인 → 서고 토큰(90일) 발급
// body: { phone, code } → { ok, token }
// 토큰 = base64url(phone.exp.hmac) — 비밀키는 ADMIN_KEY
// ============================================================
import { NextResponse } from "next/server";
import { sb } from "../../../../lib/supabase";
import { issueLibToken } from "../../../../lib/libauth";


export async function POST(req) {
  try {
    const { phone, code } = await req.json();
    const p = String(phone || "").replace(/[^0-9]/g, "");
    const c = String(code || "").replace(/[^0-9]/g, "");
    if (p.length < 10 || c.length !== 6) {
      return NextResponse.json({ ok: false, error: "6자리 숫자를 입력해주세요." }, { status: 400 });
    }

    const supa = sb();
    if (!supa) return NextResponse.json({ ok: false, error: '서비스 준비 중' }, { status: 503 });
    const { data: leads } = await supa
      .from("leads").select("id, otp").eq("phone", p)
      .order("created_at", { ascending: false }).limit(1);
    const lead = leads && leads[0];
    const otp = lead?.otp;

    const fail = (msg) => NextResponse.json({ ok: false, error: msg }, { status: 400 });
    if (!lead || !otp || !otp.code) return fail("코드가 만료됐어요. 다시 받아주세요.");
    if (Date.now() > (otp.exp || 0)) return fail("코드가 만료됐어요. 다시 받아주세요.");
    if ((otp.tries || 0) >= 5) return fail("시도 횟수를 넘겼어요. 코드를 다시 받아주세요.");
    if (otp.code !== c) {
      await supa.from("leads").update({ otp: { ...otp, tries: (otp.tries || 0) + 1 } }).eq("id", lead.id);
      return fail("코드가 맞지 않아요. 다시 확인해주세요.");
    }

    // 성공 — 코드 소거 + 토큰 발급 (90일)
    await supa.from("leads").update({ otp: null }).eq("id", lead.id);
    return NextResponse.json({ ok: true, token: issueLibToken(p) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
