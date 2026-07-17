"use client";
// ============================================================
// /m/[token] — 내 인연함 (紅線 매칭) · v16 트렌디 리뉴얼
// 프로필 3단계 온보딩 → 인연 카드 연출 → 궁합 카드 → 성사
// ============================================================
import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { CONFIG, MATCH_CONFIG, BANK, LEGAL, tossLink, AVATARS, AVATAR_META, INTERESTS } from "../../../lib/content";
import { ev } from "../../../lib/track";

// 3D 아바타 (이미지 실패 시 이모지 폴백이 뒤에 깔려 있음)
function Face({ emoji, size = 44 }) {
  const meta = AVATAR_META[emoji];
  const [ok, setOk] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, fontSize: size * 0.58, lineHeight: 1 }}>
      {!ok && <span aria-hidden="true">{emoji}</span>}
      {meta && (
        <img src={meta.img} alt="" onLoad={() => setOk(true)} onError={() => setOk(false)}
          style={{ position: "absolute", inset: "10%", width: "80%", height: "80%", objectFit: "contain", opacity: ok ? 1 : 0 }} />
      )}
    </span>
  );
}

function AvatarCircle({ emoji, size = 52 }) {
  const bg = AVATAR_META[emoji]?.bg || "#f0eaff";
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", background: bg, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
      <Face emoji={emoji} size={size * 0.62} />
    </span>
  );
}

// 궁합 점수 링 + 상대 아바타
function ScoreRing({ emoji, score }) {
  const r = 43, c = 2 * Math.PI * r;
  const on = Math.round((Math.max(0, Math.min(100, score || 0)) / 100) * c);
  const bg = AVATAR_META[emoji]?.bg || "#f0eaff";
  return (
    <span style={{ position: "relative", display: "inline-block", width: 96, height: 96 }}>
      <svg viewBox="0 0 96 96" width="96" height="96" aria-hidden="true">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(196,176,255,.18)" strokeWidth="6" />
        <circle cx="48" cy="48" r={r} fill="none" stroke="#ff8ba3" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${on} ${c}`} transform="rotate(-90 48 48)" />
        <circle cx="48" cy="48" r="33" fill={bg} />
      </svg>
      <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}>
        <Face emoji={emoji} size={46} />
      </span>
    </span>
  );
}

// 카드 뒷면 (밤하늘 + 붉은 실)
function CardBack({ w = 120, h = 164 }) {
  return (
    <svg viewBox="0 0 120 164" width={w} height={h} style={{ borderRadius: 14, display: "block" }} aria-hidden="true">
      <rect width="120" height="164" rx="14" fill="#171233" />
      <circle cx="60" cy="52" r="30" fill="#f4e9c8" opacity="0.12" />
      <circle cx="60" cy="52" r="20" fill="#f4e9c8" />
      <circle cx="22" cy="24" r="1.4" fill="#fff" opacity="0.7" /><circle cx="97" cy="18" r="1.1" fill="#fff" opacity="0.6" />
      <circle cx="104" cy="70" r="1.3" fill="#fff" opacity="0.7" /><circle cx="16" cy="86" r="1" fill="#fff" opacity="0.5" />
      <circle cx="88" cy="108" r="1.2" fill="#fff" opacity="0.6" /><circle cx="30" cy="128" r="1.3" fill="#fff" opacity="0.6" />
      <path d="M14 118 C 44 92, 76 142, 106 108" stroke="#ff5c7a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="14" cy="118" r="3" fill="#ff5c7a" /><circle cx="106" cy="108" r="3" fill="#ff5c7a" />
      <text x="60" y="150" textAnchor="middle" fontSize="9" fill="#b7a8ff" letterSpacing="3">紅 線</text>
    </svg>
  );
}

// 자정까지 카운트다운
function useMidnightTimer() {
  const [txt, setTxt] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const mid = new Date(now); mid.setHours(24, 0, 0, 0);
      const s = Math.max(0, Math.floor((mid - now) / 1000));
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
      setTxt(h > 0 ? `${h}시간 ${m}분` : `${m}분`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
  return txt;
}

export default function MatchBox() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [rbHide, setRbHide] = useState(false);
  useEffect(() => { try { if (localStorage.getItem("hs_hide_rb")) setRbHide(true); } catch (e) {} }, []);
  // 재방문용 — 홈에 다시 오면 "내 인연함 열기"로 바로 올 수 있게 기억해둔다
  useEffect(() => { try { if (token) localStorage.setItem("hs_my_match", token); } catch (e) {} }, [token]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [kakao, setKakao] = useState("");
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefAgeMin, setPrefAgeMin] = useState("");
  const [prefAgeMax, setPrefAgeMax] = useState("");
  const [prefRegion, setPrefRegion] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [copied, setCopied] = useState("");
  const copy = async (t, label) => { try { await navigator.clipboard.writeText(t); setCopied(label); setTimeout(() => setCopied(""), 1600); } catch (e) {} };
  const [opened, setOpened] = useState({});
  // 온보딩
  const [step, setStep] = useState(0);
  const [avatar, setAvatar] = useState(null);
  const [job, setJob] = useState("");
  const [region, setRegion] = useState("");
  const [ints, setInts] = useState([]);
  const [intro, setIntro] = useState("");
  const timer = useMidnightTimer();

  const load = async (first) => {
    try {
      const res = await fetch(`/api/match?token=${token}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "불러오기 실패");
      if (first) ev("matchbox_view", { cards: (d.cards || []).length });
      setData(d);
      try {
        const pp = d.myPrefs || {};
        setPrefAgeMin(pp.ageMin || ""); setPrefAgeMax(pp.ageMax || ""); setPrefRegion(pp.region || "");
      } catch (e) {}
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(true); }, []); // eslint-disable-line
  useEffect(() => {
    const p = data?.myProfile;
    if (p && !avatar) {
      setAvatar(p.avatar || null); setJob(p.job || ""); setRegion(p.region || "");
      setInts(Array.isArray(p.interests) ? p.interests : []);
      if (data.myIntro) setIntro(data.myIntro);
    }
  }, [data]); // eslint-disable-line

  const [formErr, setFormErr] = useState("");
  const post = async (body) => {
    setBusy(true); setFormErr("");
    let ok = true;
    try {
      const res = await fetch("/api/match", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, ...body }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setFormErr(d.error || "잠시 후 다시 시도해주세요."); ok = false; }
      else await load();
    } catch (e) { setFormErr("네트워크 오류 — 다시 시도해주세요."); ok = false; }
    setBusy(false);
    return ok;
  };

  const respond = (matchId, accept, reason) => { ev(accept ? "match_accept" : "match_decline"); post({ matchId, action: "respond", accept, reason: reason || undefined }); };
  const propose = (cid) => { ev("match_propose"); post({ action: "propose", candidateId: cid }); };
  const skip = (cid, reason) => { ev("match_skip"); setOpened((o) => ({ ...o, cand: false })); post({ action: "skip", candidateId: cid, reason: reason || undefined }); };
  const savePrefs = () => { ev("match_prefs_save"); post({ action: "prefs", ageMin: prefAgeMin || null, ageMax: prefAgeMax || null, region: prefRegion }); setPrefsOpen(false); };
  const blockMatch = (matchId) => {
    if (!window.confirm("이 상대를 차단할까요? 서로의 후보에서 영구히 제외되고 되돌릴 수 없어요.")) return;
    ev("match_block"); post({ matchId, action: "block", reason: "user" });
  };
  const saveKakao = (matchId) => { if (!kakao.trim()) return; ev("match_kakao_set"); post({ matchId, action: "kakao", kakaoId: kakao }); setKakao(""); };
  const saveProfile = async () => {
    ev("match_profile_done");
    const ok = await post({ action: "profile", profile: { avatar, job, region, interests: ints }, intro });
    if (ok) setStep(0);
  };
  const toggleInt = (t) => setInts((xs) => (xs.includes(t) ? xs.filter((x) => x !== t) : xs.length < 5 ? [...xs, t] : xs));

  const cards = data?.cards || [];
  const hero = cards.find((c) => c.myAccept == null && !c.matched);
  const rest = cards.filter((c) => c !== hero);
  const cand = !hero && data?.candidate ? data.candidate : null;

  const css = `
    .hx{min-height:100vh;background:radial-gradient(1200px 600px at 50% -100px, #1a1145 0%, #0B0A22 55%, #080618 100%);color:var(--tx,#EFEAFF);font-family:inherit;letter-spacing:0;position:relative}
    .hx::before{content:"";position:fixed;inset:0;pointer-events:none;background:
      radial-gradient(1.6px 1.6px at 12% 18%, rgba(220,210,255,.8) 50%, transparent 51%),
      radial-gradient(1.4px 1.4px at 78% 9%, rgba(220,210,255,.65) 50%, transparent 51%),
      radial-gradient(1.2px 1.2px at 88% 34%, rgba(220,210,255,.5) 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 30% 44%, rgba(220,210,255,.5) 50%, transparent 51%),
      radial-gradient(1.2px 1.2px at 62% 66%, rgba(220,210,255,.4) 50%, transparent 51%)}
    .hx *{box-sizing:border-box;margin:0}
    .hx-in{max-width:560px;margin:0 auto;padding:18px 22px 56px;position:relative;z-index:1}
    .hx-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
    .hx-logo{display:flex;align-items:center;gap:8px;font-weight:700;font-size:15px;font-family:var(--disp,inherit);letter-spacing:.14em;color:var(--tx)}
    .hx-logo .moon{width:26px;height:26px;border-radius:50%;background:radial-gradient(circle at 35% 35%, #ffe9ad, #f4c465);color:#0B0A22;display:inline-flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 0 18px rgba(255,212,121,.45)}
    .hx-chip{font-size:11.5px;color:var(--gold,#ffd479);background:rgba(255,212,121,.08);border:1px solid rgba(255,212,121,.45);border-radius:999px;padding:6px 12px;text-decoration:none;font-weight:600;font-family:var(--mono,inherit)}
    .hx-card{background:rgba(139,108,255,.07);border:1px solid rgba(196,176,255,.3);border-radius:20px;padding:20px 16px;backdrop-filter:blur(2px)}
    .hx-timer{display:inline-flex;align-items:center;gap:6px;background:rgba(255,90,122,.14);border:1px solid rgba(255,90,122,.5);color:#ff9db1;border-radius:999px;padding:5px 12px;font-size:12px;font-weight:600}
    .hx-h1{font-size:18px;font-weight:700;line-height:1.5;font-family:var(--disp,inherit);color:var(--tx)}
    .hx-dim{font-size:12.5px;color:var(--tx-dim,#9A93C4);line-height:1.65}
    .hx-btn{display:block;width:100%;border:1px solid rgba(196,176,255,.55);cursor:pointer;background:rgba(139,108,255,.16);color:var(--tx);border-radius:14px;padding:14px;font-size:14.5px;font-weight:700;text-align:center;text-decoration:none;font-family:inherit}
    .hx-btn:hover:not(:disabled){border-color:var(--amethyst-hi,#c4b0ff)}
    .hx-btn:disabled{opacity:.4;cursor:default}
    .hx-btn.pink{background:rgba(255,90,122,.14);border-color:rgba(255,90,122,.6);color:#ff8ba3}
    .hx-btn.ghost{background:transparent;color:var(--tx-dim);border:1px solid rgba(196,176,255,.3);font-weight:600}
    .hx-tag{background:rgba(139,108,255,.1);border:1px solid rgba(196,176,255,.28);border-radius:999px;padding:5px 12px;font-size:12px;color:var(--tx-dim);font-weight:500;cursor:pointer}
    .hx-tag.on{background:rgba(255,90,122,.16);border-color:rgba(255,90,122,.65);color:#ff9db1}
    .hx-note{background:rgba(11,10,34,.75);border:1px solid rgba(196,176,255,.25);border-radius:16px;padding:14px 15px;color:#d9d2f5;margin-top:12px}
    .hx-note b{color:#c4b0ff;font-weight:600}
    .hx-note .t{font-size:11.5px;color:var(--gold,#ffd479);letter-spacing:.1em;margin-bottom:6px;font-weight:600;font-family:var(--mono,inherit)}
    .hx-note p{font-size:13px;line-height:1.8}
    .hx-badge{display:inline-block;background:rgba(255,212,121,.1);border:1px solid rgba(255,212,121,.5);color:var(--gold,#ffd479);border-radius:999px;padding:5px 13px;font-size:12.5px;font-weight:700}
    .hx-banner{display:flex;align-items:center;justify-content:center;gap:6px;background:rgba(139,108,255,.1);border:1px solid rgba(196,176,255,.3);border-radius:14px;padding:12px;font-size:13px;color:#c4b0ff;font-weight:600;margin-top:12px}
    .hx-av{border:none;cursor:pointer;border-radius:50%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;padding:0;position:relative}
    .hx-av.on{outline:3px solid #ff8ba3;outline-offset:-1px}
    .hx-av .ck{position:absolute;right:-2px;top:-2px;width:20px;height:20px;border-radius:50%;background:#ff5c7a;color:#fff;font-size:12px;display:flex;align-items:center;justify-content:center}
    .hx-input{width:100%;border:1px solid rgba(196,176,255,.35);background:rgba(139,108,255,.08);border-radius:12px;padding:12px 14px;font-size:14.5px;color:var(--tx);font-family:inherit;outline:none}
    .hx-input::placeholder{color:rgba(234,230,255,.3)}
    .hx-input:focus{border-color:var(--amethyst-hi,#c4b0ff)}
    .hx-label{font-size:12px;color:var(--gold,#ffd479);font-weight:700;margin:16px 0 8px;letter-spacing:.06em;font-family:var(--mono,inherit)}
    .hx-step{display:flex;gap:5px;justify-content:center;margin-bottom:14px}
    .hx-step span{width:6px;height:6px;border-radius:50%;background:rgba(196,176,255,.25)}
    .hx-step span.on{background:var(--gold,#ffd479);width:18px;border-radius:999px}
    .hx-tl{border-left:2px solid rgba(196,176,255,.25);padding-left:14px;margin:6px 0 0 6px;display:flex;flex-direction:column;gap:14px}
    .hx-state{font-size:11.5px;font-weight:700;border-radius:999px;padding:4px 10px;display:inline-block}
    .hx-quote{font-size:13px;color:var(--tx-dim);line-height:1.75;border-top:1px solid rgba(196,176,255,.2);padding-top:12px;margin-top:12px}
    .hx-pay{display:flex;justify-content:space-between;font-size:13px;padding:6px 0}
    .hx-pay span:first-child{color:var(--tx-dim)}
    .hx-pay b{font-weight:700;color:var(--tx)}
  `;

  // ───────── 로딩/에러 ─────────
  if (!data) {
    return (
      <main className="hx"><style>{css}</style>
        <div className="hx-in" style={{ paddingTop: 90, textAlign: "center" }}>
          <div className="hx-h1">{err ? "인연함을 찾을 수 없어요" : "인연함을 여는 중이에요"}</div>
          <p className="hx-dim" style={{ marginTop: 8 }}>{err || "잠시만 기다려주세요"}</p>
        </div>
      </main>
    );
  }

  // ───────── 만 19세 미만 ─────────
  if (data.notAdult) {
    return (
      <main className="hx"><style>{css}</style>
        <div className="hx-in" style={{ paddingTop: 90, textAlign: "center" }}>
          <div className="hx-h1">紅線 매칭은 만 19세부터예요</div>
          <p className="hx-dim" style={{ marginTop: 8 }}>감정서는 그대로 보실 수 있어요.<br />성인이 되는 해에 홍서 아씨가 기다리고 있을게요.</p>
          {data.hasReport && <a className="hx-btn" style={{ marginTop: 20, maxWidth: 240, marginLeft: "auto", marginRight: "auto" }} href={`/r/${token}`}>내 감정서 보기</a>}
        </div>
      </main>
    );
  }

  // ───────── 프로필 온보딩 (3단계) ─────────
  if (!data.hasProfile || step > 0) {
    const s = step || 1;
    return (
      <main className="hx"><style>{css}</style>
        <div className="hx-in">
          <div className="hx-top">
            <span className="hx-logo"><span className="moon">月</span>紅緖堂 · 인연함</span>
          </div>
          <div className="hx-card">
            <div className="hx-step">{[1, 2, 3].map((n) => <span key={n} className={s === n ? "on" : ""} />)}</div>

            {s === 1 && (
              <>
                <div className="hx-h1" style={{ textAlign: "center" }}>나를 대신할 얼굴을 골라주세요</div>
                <p className="hx-dim" style={{ textAlign: "center", marginTop: 4 }}>매칭 성사 전까지 얼굴 대신 보여져요</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, margin: "18px 0 6px" }}>
                  {AVATARS.map((a) => (
                    <button key={a} className={"hx-av" + (avatar === a ? " on" : "")} style={{ background: AVATAR_META[a]?.bg || "#f0eaff" }} onClick={() => setAvatar(a)} aria-label={AVATAR_META[a]?.name || a}>
                      <Face emoji={a} size={40} />
                      {avatar === a && <span className="ck">✓</span>}
                    </button>
                  ))}
                </div>
                <button className="hx-btn" style={{ marginTop: 14 }} disabled={!avatar} onClick={() => setStep(2)}>다음</button>
              </>
            )}

            {s === 2 && (
              <>
                <div className="hx-h1" style={{ textAlign: "center" }}>어떤 사람인지 알려주세요</div>
                <div className="hx-label">하는 일</div>
                <input className="hx-input" placeholder="대학생, 간호사, 개발자…" value={job} onChange={(e) => setJob(e.target.value)} maxLength={20} />
                <div className="hx-label">사는 지역</div>
                <input className="hx-input" placeholder="서울 마포, 경기 의정부…" value={region} onChange={(e) => setRegion(e.target.value)} maxLength={20} />
                <div className="hx-label">관심사 <span style={{ color: "var(--tx-dim)", fontWeight: 500 }}>(최대 5개)</span></div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {INTERESTS.map((t) => (
                    <button key={t} className={"hx-tag" + (ints.includes(t) ? " on" : "")} style={{ border: "none", cursor: "pointer", fontFamily: "inherit" }} onClick={() => toggleInt(t)}>{t}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                  <button className="hx-btn ghost" style={{ flex: 1 }} onClick={() => setStep(1)}>이전</button>
                  <button className="hx-btn" style={{ flex: 2 }} onClick={() => setStep(3)}>다음</button>
                </div>
              </>
            )}

            {s === 3 && (
              <>
                <div className="hx-h1" style={{ textAlign: "center" }}>자기소개를 적어주세요</div>
                <p className="hx-dim" style={{ textAlign: "center", marginTop: 4 }}>상대의 인연 카드에 함께 보여져요</p>
                <textarea className="hx-input" rows={6} style={{ marginTop: 14, resize: "none", lineHeight: 1.7 }}
                  placeholder="성격, 취미, 어떤 사람을 만나고 싶은지 편하게 적어주세요 (최소 10자)"
                  value={intro} onChange={(e) => setIntro(e.target.value)} maxLength={500} />
                <p className="hx-dim" style={{ textAlign: "right", marginTop: 6 }}>{intro.trim().length}/500</p>
                {formErr && <p style={{ fontSize: 12.5, color: "#e0446a", marginTop: 4, lineHeight: 1.6 }}>{formErr}</p>}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="hx-btn ghost" style={{ flex: 1 }} onClick={() => setStep(2)}>이전</button>
                  <button className="hx-btn" style={{ flex: 2 }} disabled={busy || !avatar || intro.trim().length < 10} onClick={saveProfile}>인연함 열기</button>
                </div>
              </>
            )}
          </div>
          <p className="hx-dim" style={{ textAlign: "center", marginTop: 14 }}>이름·연락처·명반은 상대에게 공개되지 않아요</p>
        </div>
      </main>
    );
  }

  // ───────── 궁합 카드 (열린 상태) ─────────
  const OpenCard = ({ c, onAccept, onDecline }) => {
    const [askReason, setAskReason] = useState(false);
    return (
    <div className="hx-card">
      {onAccept && (
        <div style={{ textAlign: "center", marginBottom: 10 }}><span className="hx-timer">오늘 자정 마감 · {timer}</span></div>
      )}
      <div style={{ textAlign: "center" }}>
        <ScoreRing emoji={c.other.avatar} score={c.score || 76} />
        <div style={{ marginTop: -6 }}>
          <span className="hx-badge">궁합 {c.score || 76}점{c.pct ? ` · 상위 ${c.pct}%` : ""}</span>
        </div>
        {c.pct && (
          <p className="hx-dim" style={{ marginTop: 8 }}>홍서 아씨가 100쌍의 명반을 이으면, 위에서 {c.pct}번째 안에 드는 배치예요<br /><span style={{ fontSize: 10.5 }}>(자미두수 배치 기준 자체 산정)</span></p>
        )}
        <div className="hx-h1" style={{ marginTop: 12 }}>
          {c.other.age ? `${c.other.age}살` : "나이 비공개"}{c.other.job ? ` · ${c.other.job}` : ""}
        </div>
        {c.other.region && <p className="hx-dim" style={{ marginTop: 3 }}>{c.other.region}</p>}
        {c.other.interests.length > 0 && (() => {
          const mine = new Set(data.myProfile?.interests || []);
          const common = c.other.interests.filter((t) => mine.has(t));
          const others = c.other.interests.filter((t) => !mine.has(t));
          return (
            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {common.slice(0, 5).map((t) => <span className="hx-tag on" key={t}>{t} · 겹침</span>)}
              {others.slice(0, Math.max(0, 5 - common.length)).map((t) => <span className="hx-tag" key={t}>{t}</span>)}
            </div>
          );
        })()}
      </div>
      {c.reasons && c.reasons.length > 0 && (
        <div style={{ border: "1px solid rgba(255,212,121,.45)", background: "rgba(255,212,121,.06)", borderRadius: 14, padding: "11px 13px", marginTop: 12 }}>
          <p style={{ fontSize: 11.5, color: "var(--gold)", fontWeight: 700, marginBottom: 6, letterSpacing: ".06em" }}>왜 이 사람인가 — 아씨의 세 가지 근거</p>
          {c.reasons.map((r, i) => (
            <p key={i} style={{ fontSize: 12.5, color: "var(--tx-dim)", lineHeight: 1.7, marginTop: i ? 6 : 0 }}>{r}</p>
          ))}
        </div>
      )}
      {c.persona && (
        <div style={{ background: "rgba(139,108,255,.1)", border: "1px solid rgba(196,176,255,.28)", borderRadius: 14, padding: "11px 13px", marginTop: 12 }}>
          <p style={{ fontSize: 11.5, color: "#ff9db1", fontWeight: 700, marginBottom: 4 }}>홍서 아씨가 본 이 사람</p>
          <p style={{ fontSize: 13, color: "var(--tx-dim)", lineHeight: 1.7 }}>{c.persona.look}이에요. {c.persona.love}이고요.</p>
        </div>
      )}
      {c.other.intro && <p className="hx-quote">“{c.other.intro}”</p>}
      {(c.detail?.length || c.note) && (
        <div className="hx-note">
          <div className="t">月下老人의 궁합 풀이</div>
          {(c.detail?.length ? c.detail : [c.note]).map((t, i) => (
            <p key={i} style={{ marginTop: i ? 9 : 0 }}>{t}</p>
          ))}
        </div>
      )}
      {onAccept && !askReason && (
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="hx-btn pink" style={{ flex: 1.5 }} disabled={busy} onClick={onAccept}>인연 잇기</button>
          <button className="hx-btn ghost" style={{ flex: 1 }} disabled={busy} onClick={() => setAskReason(true)}>넘기기</button>
        </div>
      )}
      {onAccept && askReason && (
        <div style={{ marginTop: 14 }}>
          <p className="hx-dim" style={{ textAlign: "center", marginBottom: 8 }}>넘기는 이유를 알려주시면 다음 추천이 좋아져요 (선택)</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center" }}>
            {[["dist", "거리가 멀어요"], ["age", "나이대가 달라요"], ["feel", "끌리진 않았어요"], [null, "그냥 넘길게요"]].map(([r, t]) => (
              <button key={t} className="hx-tag" style={{ border: "1px solid rgba(196,176,255,.28)", cursor: "pointer", fontFamily: "inherit" }}
                disabled={busy} onClick={() => onDecline(r)}>{t}</button>
            ))}
          </div>
          <button className="hx-btn ghost" style={{ marginTop: 10, padding: "9px", fontSize: 12.5 }} onClick={() => setAskReason(false)}>돌아가기</button>
        </div>
      )}
      {onAccept && (
        <p className="hx-dim" style={{ textAlign: "center", marginTop: 10 }}>수락해도 상대에게 바로 알려지지 않아요{MATCH_CONFIG.FREE_BETA ? " · 오픈 기념 성사비 0원" : ` · 성사 시에만 성사비 ${MATCH_CONFIG.PRICE.toLocaleString("ko-KR")}원`}</p>
      )}
    </div>
  ); };

  // ───────── 성사 카드 ─────────
  const MatchedCard = ({ c }) => (
    <div className="hx-card">
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <AvatarCircle emoji={data.myAvatar || "🐶"} size={52} />
          <svg width="54" height="24" viewBox="0 0 54 24" aria-hidden="true">
            <path d="M3 15 C 17 4, 37 22, 51 10" stroke="#ff5c7a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            <circle cx="3" cy="15" r="2.6" fill="#ff5c7a" /><circle cx="51" cy="10" r="2.6" fill="#ff5c7a" />
          </svg>
          <AvatarCircle emoji={c.other.avatar} size={52} />
        </div>
        <div className="hx-h1" style={{ color: "#e0446a", marginTop: 10 }}>붉은 실이 이어졌어요</div>
        <p className="hx-dim" style={{ marginTop: 3 }}>두 분 모두 인연을 수락했습니다</p>
      </div>

      {c.freeBeta && !c.otherKakao && (
        <div style={{ background: "#e9f6ec", borderRadius: 14, padding: "10px 13px", marginTop: 12, textAlign: "center" }}>
          <p style={{ fontSize: 12.5, color: "#1d6e4d", fontWeight: 700 }}>오픈 기념 — 성사비 0원</p>
          <p className="hx-dim" style={{ marginTop: 3 }}>아래에 내 카카오톡 아이디만 등록하면, 서로 등록되는 즉시 교환돼요</p>
        </div>
      )}
      {c.otherKakao ? (
        <>
          <div style={{ background: "rgba(139,108,255,.1)", border: "1px solid rgba(196,176,255,.28)", borderRadius: 16, padding: 16, marginTop: 14, textAlign: "center" }}>
            <p className="hx-dim">상대의 카카오톡 아이디</p>
            <div style={{ fontSize: 20, fontWeight: 700, margin: "6px 0" }}>{c.otherKakao}</div>
            <button className="hx-btn" style={{ marginTop: 6, padding: "11px", fontSize: 13.5 }} onClick={() => copy(c.otherKakao, "kko" + c.id)}>
              {copied === "kko" + c.id ? "복사됐어요 — 카톡에서 친구 추가!" : "아이디 원탭 복사"}
            </button>
          </div>
          {(() => {
            const mine = new Set(data.myProfile?.interests || []);
            const common = (c.other.interests || []).filter((t) => mine.has(t));
            const lines = [];
            if (common[0]) lines.push(`안녕하세요 :) 홍서당이 이어준 인연이에요. 저희 둘 다 ${common[0]} 좋아한다던데, 최근에 제일 좋았던 ${common[0]} 하나만 알려주세요!`);
            lines.push(`안녕하세요! 궁합 ${c.score || 90}점이라길래 용기 내서 먼저 인사드려요. 아씨 말로는 우리가 꽤 잘 맞는 배치라던데 — 한번 믿어보실래요? :)`);
            lines.push(`반가워요 :) 명반으로 만난 사이라니 신기하네요. 요즘 하루 중에 제일 기다려지는 시간이 언제예요?`);
            return (
              <div style={{ border: "1px solid rgba(255,90,122,.45)", background: "rgba(255,90,122,.06)", borderRadius: 14, padding: "12px 13px", marginTop: 12 }}>
                <p style={{ fontSize: 11.5, color: "#ff9db1", fontWeight: 700, marginBottom: 8, letterSpacing: ".06em" }}>첫 마디가 어려우면 — 아씨의 첫인사 (탭하면 복사)</p>
                {lines.slice(0, 3).map((t, i) => (
                  <button key={i} onClick={() => copy(t, "gr" + i + c.id)} style={{ display: "block", width: "100%", textAlign: "left", background: "rgba(139,108,255,.07)", border: "1px solid rgba(196,176,255,.25)", borderRadius: 10, padding: "9px 11px", marginTop: i ? 7 : 0, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, color: "var(--tx-dim)", lineHeight: 1.6 }}>
                    {copied === "gr" + i + c.id ? "복사됐어요 ✓" : `“${t}”`}
                  </button>
                ))}
              </div>
            );
          })()}
          <p className="hx-dim" style={{ textAlign: "center", marginTop: 12 }}>좋은 연 되시길 — 홍서 아씨는 여기까지예요</p>
          <p style={{ textAlign: "center", marginTop: 8 }}>
            <button onClick={() => blockMatch(c.id)} style={{ background: "none", border: "none", color: "var(--tx-dim)", fontSize: 11, cursor: "pointer", textDecoration: "underline", opacity: .7 }}>문제가 있었나요? 신고·차단</button>
          </p>
        </>
      ) : (
        <>
          {!c.freeBeta && (
          <div style={{ background: "#f6f6fb", borderRadius: 16, padding: "10px 15px", marginTop: 14 }}>
            <div className="hx-pay"><span>성사비 (1인)</span><b>{MATCH_CONFIG.PRICE.toLocaleString("ko-KR")}원</b></div>
            <div className="hx-pay" style={{ borderTop: "1px solid rgba(196,176,255,.2)" }}><span>나의 결제</span><b style={{ color: c.myPaid ? "#5DCAA5" : "var(--tx-dim)" }}>{c.myPaid ? "확인됨" : "대기"}</b></div>
            <div className="hx-pay" style={{ borderTop: "1px solid rgba(196,176,255,.2)" }}><span>상대의 결제</span><b style={{ color: c.otherPaid ? "#5DCAA5" : "var(--tx-dim)" }}>{c.otherPaid ? "확인됨" : "대기"}</b></div>
          </div>
          )}
          {!c.freeBeta && !c.myPaid && !payOpen && (
            <button className="hx-btn" style={{ marginTop: 12 }} onClick={() => { ev("match_fee_click"); setPayOpen(true); }}>
              무통장입금으로 성사비 결제하기
            </button>
          )}
          {!c.freeBeta && !c.myPaid && payOpen && (
            <div style={{ background: "rgba(139,108,255,.1)", border: "1px solid rgba(196,176,255,.28)", borderRadius: 16, padding: "13px 14px", marginTop: 12 }}>
              <p style={{ fontSize: 12, color: "#ff9db1", fontWeight: 700, marginBottom: 8 }}>입금 계좌</p>
              <p style={{ fontSize: 15, fontWeight: 700 }}>{BANK.NAME} {BANK.ACCOUNT}</p>
              <p className="hx-dim" style={{ marginTop: 2 }}>예금주 {BANK.HOLDER} · {MATCH_CONFIG.PRICE.toLocaleString("ko-KR")}원</p>
              <button className="hx-btn ghost" style={{ marginTop: 10, padding: "10px", fontSize: 13 }} onClick={() => copy(`${BANK.NAME} ${BANK.ACCOUNT}`, "acc")}>
                {copied === "acc" ? "복사되었어요" : "계좌번호 복사"}
              </button>
              <a className="hx-btn" style={{ marginTop: 8, padding: "10px", fontSize: 13, background: "#3182f6" }} href={tossLink(MATCH_CONFIG.PRICE)}
                onClick={(e) => { e.preventDefault(); try { window.location.href = tossLink(MATCH_CONFIG.PRICE); } catch (err) {} }}>토스로 3초 송금 (토스 앱 필요)</a>
              <p className="hx-dim" style={{ marginTop: 10, fontSize: 10.5, lineHeight: 1.6 }}>{LEGAL.REFUND}</p>
              <p className="hx-dim" style={{ marginTop: 10, lineHeight: 1.7 }}>
                입금자명은 <b style={{ color: "var(--tx)" }}>문답에 적으신 성함</b>으로 보내주세요.<br />
                확인 시간: 매일 오전 9시~밤 12시 (보통 1시간 이내) · 심야 입금은 다음 날 오전 9시부터 순차 처리돼요.<br />
                확인되면 위 표가 '확인됨'으로 바뀌고, 문자로도 알려드려요.
              </p>
            </div>
          )}
          {!c.myKakaoSet ? (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input className="hx-input" style={{ flex: 1 }} placeholder="상대에게 전할 내 카카오톡 아이디" value={kakao} onChange={(e) => setKakao(e.target.value)} />
              <button className="hx-btn" style={{ width: 84 }} disabled={busy || !kakao.trim()} onClick={() => saveKakao(c.id)}>등록</button>
            </div>
          ) : (
            <p className="hx-dim" style={{ textAlign: "center", marginTop: 12 }}>내 카카오톡 아이디 등록 완료 — {c.freeBeta ? "상대도 등록하면 바로" : "두 분의 결제가 확인되면"} 서로에게 공개돼요</p>
          )}
        </>
      )}
    </div>
  );

  // ───────── 홈 ─────────
  return (
    <main className="hx"><style>{css}</style>
      <div className="hx-in">
        <div className="hx-top">
          <span className="hx-logo"><span className="moon">月</span>紅緖堂 · 인연함</span>
          <span style={{ display: "flex", gap: 6 }}>
            {data.hasReport && <a className="hx-chip" href={`/r/${token}`}>내 감정서</a>}
            <button className="hx-chip" style={{ border: "none", cursor: "pointer", fontFamily: "inherit" }} onClick={() => setStep(1)}>프로필</button>
          </span>
        </div>

        {/* 히어로 — 새 인연 카드 */}
        {hero ? (
          !opened[hero.id] ? (
            <div className="hx-card" style={{ textAlign: "center" }}>
              <span className="hx-timer">자정까지 {timer}</span>
              <div style={{ display: "flex", justifyContent: "center", margin: "16px 0 12px" }}><CardBack /></div>
              <div className="hx-h1">오늘의 인연 카드가 도착했어요</div>
              <p className="hx-dim" style={{ marginTop: 4 }}>어떤 인연이 {data.name} 님을 기다리고 있을까요?</p>
              <button className="hx-btn" style={{ marginTop: 16 }} onClick={() => { ev("match_card_open"); setOpened((o) => ({ ...o, [hero.id]: true })); }}>카드 열어보기</button>
              <p className="hx-dim" style={{ marginTop: 10, fontSize: 11 }}>{MATCH_CONFIG.FREE_BETA ? "오픈 기념 — 성사되어도 성사비 0원" : `카드 열람·수락은 무료 · 성사 시에만 성사비 ${MATCH_CONFIG.PRICE.toLocaleString("ko-KR")}원`}</p>
            </div>
          ) : (
            <OpenCard c={hero} onAccept={() => respond(hero.id, true)} onDecline={(r) => respond(hero.id, false, r)} />
          )
        ) : cand ? (
          !opened.cand ? (
            <div className="hx-card" style={{ textAlign: "center" }}>
              <span className="hx-timer">자정까지 {timer}</span>
              <div style={{ display: "flex", justifyContent: "center", margin: "16px 0 12px" }}><CardBack /></div>
              <div className="hx-h1">홍서 아씨가 인연을 찾았어요</div>
              <p className="hx-dim" style={{ marginTop: 4 }}>{data.name} 님의 명반과 궁합이 가장 좋은 분이에요</p>
              <button className="hx-btn" style={{ marginTop: 16 }} onClick={() => { ev("match_card_open"); setOpened((o) => ({ ...o, cand: true })); }}>카드 열어보기</button>
              <p className="hx-dim" style={{ marginTop: 10, fontSize: 11 }}>{MATCH_CONFIG.FREE_BETA ? "오픈 기념 — 성사되어도 성사비 0원" : `카드 열람·수락은 무료 · 성사 시에만 성사비 ${MATCH_CONFIG.PRICE.toLocaleString("ko-KR")}원`}</p>
            </div>
          ) : (
            <OpenCard c={{ ...cand, id: "cand" }} onAccept={() => propose(cand.candidateId)} onDecline={(r) => skip(cand.candidateId, r)} />
          )
        ) : (
          <div className="hx-card" style={{ textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", margin: "6px 0 12px" }}><CardBack w={92} h={126} /></div>
            <div className="hx-h1">{data.dailyDone ? "오늘의 인연은 여기까지예요" : "홍서 아씨가 실을 고르고 있어요"}</div>
            <p className="hx-dim" style={{ marginTop: 6, lineHeight: 1.75 }}>
              {data.dailyDone
                ? <>인연 카드는 하루에 한 장 — 내일 새 카드가 도착해요</>
                : data.poolCount > 0
                  ? <>오늘 <b style={{ color: "var(--gold)" }}>{data.poolCount}개의 명반</b>을 {data.name} 님 명반에 대어봤어요.<br />아직 실이 팽팽해지는 짝을 못 찾았어요 — 억지로 잇지 않을게요.<br />맞는 실이 나타나면 바로 문자로 알려드려요.</>
                  : <>{data.name} 님의 명반과 닿는 인연이 나타나면<br />바로 문자로 알려드릴게요.</>}
            </p>
            {!prefsOpen ? (
              <button className="hx-btn ghost" style={{ marginTop: 14, padding: "10px", fontSize: 13 }} onClick={() => setPrefsOpen(true)}>⚙ 그동안 선호를 다듬어둘까요?</button>
            ) : (
              <div style={{ textAlign: "left", marginTop: 14 }}>
                <div className="hx-label">원하는 나이 범위</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input className="hx-input" type="tel" inputMode="numeric" placeholder="최소 (예: 25)" value={prefAgeMin} onChange={(e) => setPrefAgeMin(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))} />
                  <span className="hx-dim">~</span>
                  <input className="hx-input" type="tel" inputMode="numeric" placeholder="최대 (예: 35)" value={prefAgeMax} onChange={(e) => setPrefAgeMax(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))} />
                </div>
                <div className="hx-label">지역 (한 단어면 충분해요)</div>
                <input className="hx-input" placeholder="예: 서울, 부산, 경기" value={prefRegion} onChange={(e) => setPrefRegion(e.target.value)} maxLength={20} />
                <p className="hx-dim" style={{ marginTop: 8, fontSize: 11.5 }}>비워두면 명반 궁합만으로 골라드려요.</p>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="hx-btn ghost" style={{ flex: 1 }} onClick={() => setPrefsOpen(false)}>닫기</button>
                  <button className="hx-btn" style={{ flex: 2 }} disabled={busy} onClick={savePrefs}>선호 저장</button>
                </div>
              </div>
            )}
          </div>
        )}

        {data.monthMatched > 0 && (
          <div className="hx-banner">이번 달 홍서 아씨가 이은 인연 {data.monthMatched}쌍</div>
        )}

        {/* 투필러 교차 유도② — 감정서 없는 회원에게만, 닫기 가능 */}
        {!data.hasReport && !rbHide && (
          <div style={{ position: "relative", border: "1px solid rgba(255,212,121,.45)", borderRadius: 14, padding: "13px 34px 13px 15px", margin: "12px 0", background: "rgba(255,212,121,.06)" }}>
            <button onClick={() => { setRbHide(true); try { localStorage.setItem("hs_hide_rb", "1"); } catch (e) {} }}
              aria-label="닫기" style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", color: "#a89f7a", fontSize: 14, cursor: "pointer", padding: 2 }}>✕</button>
            <b style={{ fontSize: 13, color: "#8a6d1f" }}>이 궁합 풀이는 명반의 한 조각이에요</b>
            <p style={{ fontSize: 12, color: "#7d7457", margin: "4px 0 8px", lineHeight: 1.6 }}>재물·직업·대운까지 — 내 명반 전체가 궁금하다면</p>
            <a href="/reading" style={{ fontSize: 12.5, fontWeight: 700, color: "#8a6d1f", textDecoration: "none" }}>내 감정서 받아보기 →</a>
          </div>
        )}

        {/* 지난 인연 타임라인 */}
        {rest.length > 0 && (
          <>
            <div style={{ fontSize: 13.5, fontWeight: 700, margin: "22px 0 10px" }}>지난 인연 기록</div>
            <div className="hx-tl">
              {rest.map((c) => (
                <div key={c.id}>
                  <p className="hx-dim" style={{ fontSize: 11.5 }}>{new Date(c.createdAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} 인연 카드</p>
                  {c.matched ? (
                    <div style={{ marginTop: 8 }}><MatchedCard c={c} /></div>
                  ) : c.myAccept === false ? (
                    <p style={{ fontSize: 13, color: "var(--tx-dim)", marginTop: 4 }}>이번 인연은 넘겼어요</p>
                  ) : c.myAccept === true && c.otherAccept === false ? (
                    <div className="hx-card" style={{ padding: "14px 15px", marginTop: 8 }}>
                      <span className="hx-state" style={{ background: "rgba(139,108,255,.14)", color: "#c4b0ff", border: "1px solid rgba(196,176,255,.35)" }}>이번 실은 스쳤어요</span>
                      <p className="hx-dim" style={{ marginTop: 7, lineHeight: 1.7 }}>명반이 아닌 타이밍의 문제예요.<br />아씨가 내일 새 실을 걸어드릴게요.</p>
                    </div>
                  ) : c.myAccept === true ? (
                    <div className="hx-card" style={{ padding: "14px 15px", marginTop: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <AvatarCircle emoji={c.other.avatar} size={40} />
                        <div>
                          <span className="hx-state" style={{ background: "rgba(255,212,121,.14)", color: "var(--gold)", border: "1px solid rgba(255,212,121,.45)" }}>상대의 마음을 기다리는 중</span>
                          <p style={{ marginTop: 7, fontSize: 12, color: "var(--tx-dim)" }}>
                            <span style={{ color: "#5DCAA5" }}>실 걸어둠 ✓</span>
                            <span style={{ margin: "0 5px", opacity: .5 }}>─</span>
                            <span style={{ color: c.otherSeen ? "#5DCAA5" : "var(--tx-dim)" }}>상대 확인 {c.otherSeen ? "✓" : "···"}</span>
                            <span style={{ margin: "0 5px", opacity: .5 }}>─</span>
                            <span style={{ color: "var(--gold)" }}>응답 대기</span>
                          </p>
                          <p className="hx-dim" style={{ marginTop: 5 }}>응답이 오는 대로 바로 문자로 알려드려요<br />재촉하지 않는 게 예의랍니다 — 아씨가 지켜보고 있어요</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 8 }}>
                      {opened[c.id] ? <OpenCard c={c} onAccept={() => respond(c.id, true)} onDecline={(r) => respond(c.id, false, r)} /> : (
                        <button className="hx-btn ghost" style={{ width: "auto", padding: "9px 18px", fontSize: 13 }} onClick={() => setOpened((o) => ({ ...o, [c.id]: true }))}>카드 다시 보기</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <p className="hx-dim" style={{ textAlign: "center", marginTop: 34 }}>링크를 잃어버렸다면 안내 문자에 회신 — 다시 보내드려요<br />궁금한 점도 문자로 답해드려요 · © {new Date().getFullYear()} {CONFIG.BRAND}</p>
      </div>
    </main>
  );
}
