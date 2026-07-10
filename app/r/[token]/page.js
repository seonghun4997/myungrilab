// ============================================================
// /r/[token] — 결제 고객에게 카카오톡으로 전달하는 리포트 열람 페이지
// ============================================================
import { sb } from "../../../lib/supabase";
import { SECTIONS } from "../../../lib/report";
import { CONFIG } from "../../../lib/content";

export const dynamic = "force-dynamic";

function renderText(text) {
  return text.split(/\n{2,}/).map((para, i) => (
    <p key={i} style={{ fontSize: 15.5, marginBottom: 14, lineHeight: 1.9 }}>
      {para.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
        seg.startsWith("**") && seg.endsWith("**") ? <b key={j} style={{ color: "var(--talisman)" }}>{seg.slice(2, -2)}</b> : <span key={j}>{seg}</span>
      )}
    </p>
  ));
}

export default async function ReportPage({ params }) {
  const client = sb();
  let lead = null;
  if (client) {
    const { data } = await client.from("leads").select("name, birth, report, created_at").eq("token", params.token).single();
    lead = data;
  }

  if (!lead || !lead.report) {
    return (
      <main className="wrap" style={{ paddingTop: 80, textAlign: "center" }}>
        <div className="eyebrow">凶煞檢査所</div>
        <h1 className="display" style={{ fontSize: 24, margin: "16px 0 10px", color: "var(--ash)" }}>리포트를 찾을 수 없습니다</h1>
        <p style={{ color: "var(--ash-dim)", fontSize: 14 }}>
          링크가 정확한지 확인해주세요. 문제가 계속되면 카카오톡 채널로 문의 바랍니다.
        </p>
      </main>
    );
  }

  const b = lead.birth || {};
  return (
    <main className="wrap" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div className="eyebrow">{CONFIG.BRAND_HANJA} · 정식 살풀이</div>
        <h1 className="display candle" style={{ fontSize: 27, margin: "14px 0 6px" }}>
          {lead.name} 님의 살풀이
        </h1>
        <p className="mono" style={{ fontSize: 12, color: "var(--ash-dim)" }}>
          {b.y}. {b.m}. {b.d}. {b.hour != null ? `${String(b.hour).padStart(2, "0")}:${String(b.minute || 0).padStart(2, "0")}` : "(시간 미상)"} · {b.gender === "M" ? "남" : "여"}
        </p>
      </div>

      {SECTIONS.map((s) => {
        const text = lead.report[s.id];
        if (!text) return null;
        return (
          <div className="card" key={s.id} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <span className="display" style={{ fontSize: 26, color: "var(--blood-bright)" }}>{s.hanja}</span>
              <h2 className="display" style={{ fontSize: 18, color: "var(--ash)" }}>{s.title}</h2>
            </div>
            {renderText(text)}
          </div>
        );
      })}

      <footer style={{ paddingTop: 30 }}>
        <p>
          본 리포트는 명리학 이론에 기반한 참고용 콘텐츠이며,<br />
          의학적·법률적·투자 판단의 근거가 될 수 없습니다.<br /><br />
          © {new Date().getFullYear()} {CONFIG.BRAND}
        </p>
      </footer>
    </main>
  );
}
