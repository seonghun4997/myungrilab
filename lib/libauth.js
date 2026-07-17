// ============================================================
// 내 서고 인증 헬퍼 — 서명 토큰 (90일)
// 토큰 = base64url("phone.exp.hmac32") · 비밀키 ADMIN_KEY
// ============================================================
import crypto from "crypto";

export function signLib(phone, exp) {
  const secret = process.env.ADMIN_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "hs";
  return crypto.createHmac("sha256", secret).update(`${phone}.${exp}`).digest("hex").slice(0, 32);
}

export function issueLibToken(phone) {
  const exp = Date.now() + 90 * 24 * 60 * 60 * 1000;
  return Buffer.from(`${phone}.${exp}.${signLib(phone, exp)}`).toString("base64url");
}

export function verifyLibToken(token) {
  try {
    const raw = Buffer.from(String(token || ""), "base64url").toString();
    const [phone, expStr, sig] = raw.split(".");
    const exp = Number(expStr);
    if (!phone || !exp || !sig) return null;
    if (Date.now() > exp) return null;
    if (signLib(phone, exp) !== sig) return null;
    return phone;
  } catch (e) { return null; }
}
