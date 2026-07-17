// ============================================================
// GET /api/admin/sms — 문자 발송 실장부 (Solapi 미러) · x-admin-key 인증
// 어드민 콕핏에서 "문자가 진짜 나갔는지"를 원장 그대로 확인
// ============================================================
import crypto from "crypto";

function authorized(req) {
  const key = req.headers.get("x-admin-key");
  return key && process.env.ADMIN_KEY && key === process.env.ADMIN_KEY;
}

export async function GET(req) {
  if (!authorized(req)) return Response.json({ error: "인증 실패" }, { status: 401 });
  const apiKey = process.env.SOLAPI_API_KEY;
  const secret = process.env.SOLAPI_API_SECRET;
  if (!apiKey || !secret) return Response.json({ error: "Solapi 환경변수 없음" }, { status: 500 });

  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString("hex");
  const signature = crypto.createHmac("sha256", secret).update(date + salt).digest("hex");

  try {
    const res = await fetch("https://api.solapi.com/messages/v4/list?limit=30", {
      headers: { Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}` },
      cache: "no-store",
    });
    const j = await res.json();
    const list = Object.values(j.messageList || {}).map((m) => ({
      at: (m.dateCreated || "").replace("T", " ").slice(5, 16),
      to: m.to || "",
      status: m.statusCode === "4000" ? "성공" : (m.statusMessage || m.statusCode || "?"),
      fail: !!(m.statusCode && m.statusCode !== "4000"),
      text: String(m.text || "").slice(0, 46),
    }));
    const senderIssue = list.some((m) => String(m.status).includes("발신번호") || String(m.status).includes("1062"));
    return Response.json({ ok: true, list, senderIssue, sender: process.env.SOLAPI_SENDER || "(미설정)" });
  } catch (e) {
    return Response.json({ error: String(e.message || e).slice(0, 200) }, { status: 500 });
  }
}
