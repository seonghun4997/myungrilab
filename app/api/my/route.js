// ============================================================
// GET /api/my?t=서고토큰 — 내 서고 데이터
// 반환: { ok, name, phone4, birthLabel, tag, reports[], matchToken }
// reports: 이 번호의 리드들 (감정서 유무·이어읽기 위치 포함)
// 필요 SQL: alter table leads add column if not exists read_pos int;
// ============================================================
import { NextResponse } from "next/server";
import { sb } from "../../../lib/supabase";
import { verifyLibToken } from "../../../lib/libauth";
import { PRODUCTS } from "../../../lib/content";

const TIER_NAME = (t) => (PRODUCTS.find((p) => p.id === t) || {}).name || "감정서";

export async function GET(req) {
  try {
    const t = new URL(req.url).searchParams.get("t");
    const phone = verifyLibToken(t);
    if (!phone) return NextResponse.json({ ok: false, error: "auth" }, { status: 401 });

    const supa = sb();
    const { data: leads } = await supa
      .from("leads")
      .select("id, token, name, birth, sal_names, quiz_hits, report, read_pos, match_optin, profile, created_at")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!leads || !leads.length) return NextResponse.json({ ok: true, empty: true });

    const main = leads.find((l) => l.report) || leads[0];
    const b = main.birth || {};
    const birthLabel = b.y ? `${b.y}.${String(b.m).padStart(2, "0")}.${String(b.d).padStart(2, "0")} · ${b.slot || "시 미상"}` : "";
    // 명궁 태그 — sal_names[0] = "명궁:탐랑·자미" 형태 재사용
    let tag = "";
    const sal0 = (main.sal_names || []).find((s) => String(s).startsWith("명궁:"));
    if (sal0) {
      const stars = String(sal0).replace("명궁:", "").split("·")[0];
      if (stars && stars !== "공궁") tag = `#${stars} 명궁`;
    }

    const reports = leads
      .filter((l) => l.report)
      .map((l) => ({
        token: l.token,
        product: TIER_NAME(l.quiz_hits),
        readPos: l.read_pos || 0,
        date: String(l.created_at || "").slice(0, 10),
      }));

    // 인연함 — 프로필을 만든 리드 우선, 없으면 감정서 리드
    const matchLead = leads.find((l) => l.profile) || leads.find((l) => l.match_optin) || (reports[0] ? leads.find((l) => l.token === reports[0].token) : null);

    return NextResponse.json({
      ok: true,
      name: main.name || "",
      phone4: phone.slice(-4),
      phoneMasked: phone.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-****-$3"),
      birthLabel, tag,
      reports,
      matchToken: matchLead ? matchLead.token : null,
      hasProfile: !!(matchLead && matchLead.profile),
      pendingLead: reports.length ? null : (leads[0] ? { token: leads[0].token } : null),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
