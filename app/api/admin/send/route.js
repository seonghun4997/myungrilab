// ============================================================
// POST /api/admin/send — 어드민 수동 문자 (Solapi 직접 발송) · x-admin-key
// PC에는 문자앱이 없으므로, 콕핏에서 서버로 바로 쏜다.
// 실패 사유를 그대로 돌려줘 어드민이 원인을 즉시 안다 (smsSafe 아님).
// ============================================================
import { sendSMS } from "../../../../lib/sms";

function authorized(req) {
  const key = req.headers.get("x-admin-key");
  return key && process.env.ADMIN_KEY && key === process.env.ADMIN_KEY;
}

export async function POST(req) {
  if (!authorized(req)) return Response.json({ error: "인증 실패" }, { status: 401 });
  const { to, text } = await req.json();
  const dst = String(to || "").replace(/[^0-9]/g, "");
  const body = String(text || "").trim().slice(0, 1000);
  if (dst.length < 10 || !body) return Response.json({ error: "번호/문구를 확인해주세요." }, { status: 400 });
  try {
    await sendSMS(dst, body);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e.message || e).slice(0, 200) }, { status: 500 });
  }
}
