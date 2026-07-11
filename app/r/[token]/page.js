// ============================================================
// /r/[token] — 결제 고객에게 카카오톡으로 전달하는 리포트 열람 페이지
// ============================================================
import { sb } from "../../../lib/supabase";
import { SECTIONS, EXTRA_SECTIONS } from "../../../lib/report";
const ALL_SECTIONS = [...SECTIONS, ...EXTRA_SECTIONS[3].filter((e) => !SECTIONS.find((s) => s.id === e.id))];
import { CONFIG } from "../../../lib/content";

export const dynamic = "force-dynamic";

function renderText(text) {
  return text.split(/\n{2,}/).map((para, i) => (
    <p key={i} style={{ fontSize: 15.5, marginBottom: 14, lineHeight: 1.9 }}>
      {para.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
        seg.startsWith("**") && seg.endsWith("**") ? <b key={j} style={{ color: "var(--amethyst-hi)" }}>{seg.slice(2, -2)}</b> : <span key={j}>{seg}</span>
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
        <h1 className="display" style={{ fontSize: 24, margin: "16px 0 10px", color: "var(--tx)" }}>리포트를 찾을 수 없습니다</h1>
        <p style={{ color: "var(--tx-dim)", fontSize: 14 }}>
          링크가 정확한지 확인해주세요. 문제가 계속되면 카카오톡 채널로 문의 바랍니다.
        </p>
      </main>
    );
  }

  const b = lead.birth || {};
  return (
    <main className="wrap" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div className="eyebrow">{CONFIG.BRAND_HANJA} · 자미두수 정밀 감정서</div>
        <h1 className="display display" style={{ fontSize: 27, margin: "14px 0 6px" }}>
          {lead.name} — 인연 감정서
        </h1>
        <p className="mono" style={{ fontSize: 12, color: "var(--tx-dim)" }}>
          {b.y}. {b.m}. {b.d}. {b.slot || ""} · {b.gender === "M" ? "남" : "여"}
        </p>
      </div>

      {ALL_SECTIONS.map((s) => {
        const text = lead.report[s.id];
        if (!text) return null;
        return (
          <div className="card" key={s.id} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <span className="display" style={{ fontSize: 26, color: "var(--amethyst-hi)" }}>{s.hanja}</span>
              <h2 className="display" style={{ fontSize: 18, color: "var(--tx)" }}>{s.title}</h2>
            </div>
            {renderText(text)}
          </div>
        );
      })}

      <div className="card" style={{ marginTop: 8, marginBottom: 8, border: "1px solid rgba(255,120,134,0.4)", background: "linear-gradient(160deg,rgba(255,77,94,0.12),rgba(255,77,94,0.04))" }}>
        <p style={{ fontSize: 15, color: "var(--tx)" }}>
          <b style={{ color: "#ff8b98" }}>紅線 매칭</b> — 이 감정서를 받은 분에게만, 월하노인이 자미두수 궁합으로 직접 연을 잇는 블라인드 소개가 열려 있습니다.
        </p>
        <a href={CONFIG.KAKAO_CHANNEL_URL} target="_blank" rel="noreferrer" className="btn btn-seal" style={{ marginTop: 12, fontSize: 15 }}>
          카카오톡으로 "매칭 신청" 보내기
        </a>
      </div>

      <footer style={{ paddingTop: 30 }}>
        <p>
          본 리포트는 명리학 이론에 기반한 참고용 콘텐츠이며,<br />
          인생의 결정에 대한 유일한 근거가 될 수 없습니다.<br /><br />
          © {new Date().getFullYear()} {CONFIG.BRAND}
        </p>
      </footer>
    </main>
  );
}
