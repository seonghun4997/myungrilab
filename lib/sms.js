// ============================================================
// 문자 발송 (Solapi) — 서버 전용 · v18
// 필요 환경변수: SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER
// 90바이트 초과 시 Solapi가 LMS로 자동 전환 · 실패해도 본 흐름은 계속
// ============================================================
import crypto from "crypto";

export async function sendSMS(to, text) {
  const key = process.env.SOLAPI_API_KEY;
  const secret = process.env.SOLAPI_API_SECRET;
  const from = process.env.SOLAPI_SENDER;
  const dst = String(to || "").replace(/[^0-9]/g, "");
  if (!key || !secret || !from) return { skipped: "env" };
  if (dst.length < 10) return { skipped: "phone" };

  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString("hex");
  const signature = crypto.createHmac("sha256", secret).update(date + salt).digest("hex");

  const res = await fetch("https://api.solapi.com/messages/v4/send", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${signature}`,
    },
    body: JSON.stringify({ message: { to: dst, from, text } }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Solapi ${res.status}: ${body.slice(0, 200)}`);
  return { ok: true };
}

// 본 흐름을 절대 막지 않는 발송 (실패는 로그만)
export async function smsSafe(to, text) {
  try { return await sendSMS(to, text); }
  catch (e) { console.error("[sms]", e.message); return { error: e.message }; }
}

// ── 공용 문구 ──
export const MSG = {
  settled: (name, origin, token) =>
    `[홍서당] ${name}님, 오늘의 실이 정리됐어요. 인연함을 확인해보세요: ${origin}/m/${token}`,
  otp: (code) =>
    `[홍서당] 내 서고 입장 번호는 [${code}] 입니다. 5분 안에 입력해주세요.`,
  report: (name, origin, token) =>
    `[홍서당] ${name}님, 감정서가 완성됐어요.\n본인 전용 링크: ${origin}/r/${token}\n(링크를 잃어버리면 이 문자에 회신해주세요)`,
  card: (name, origin, token) =>
    `[홍서당] ${name}님, 홍서 아씨가 인연 카드를 보냈어요.\n오늘 밤 11시 전에 확인해주세요: ${origin}/m/${token}`,
  matched: (name, origin, token) =>
    `[홍서당] ${name}님, 붉은 실이 이어졌어요! 서로의 연락처가 열렸습니다.\n인연함에서 확인하고 먼저 인사를 건네보세요: ${origin}/m/${token}`,
  remind: (name, origin, token) =>
    `[홍서당] ${name}님, 답을 기다리는 인연 카드가 있어요.\n오늘 밤 11시에 결과가 정리돼요: ${origin}/m/${token}`,
};
