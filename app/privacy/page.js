import { CONFIG } from "../../lib/content";

export const metadata = { title: `개인정보처리방침 — ${CONFIG.BRAND}` };

const S = { marginTop: 18 };

export default function Privacy() {
  return (
    <main className="wrap" style={{ paddingTop: 50, paddingBottom: 80, position: "relative", zIndex: 1 }}>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 6, color: "var(--tx)" }}>개인정보처리방침</h1>
      <p className="mono" style={{ fontSize: 11, color: "var(--tx-dim)", marginBottom: 20 }}>{CONFIG.BRAND}({CONFIG.BRAND_HANJA})</p>
      <div style={{ fontSize: 14, lineHeight: 2, color: "var(--tx)" }}>
        <p><b>1. 수집 항목</b><br />
        · 감정 서비스: 이름, 휴대폰 번호, 생년월일시, 성별<br />
        · 紅線 매칭 신청 시 추가: 아바타(이모지), 직업, 거주 지역, 관심사, 자기소개, (성사 시) 카카오톡 아이디</p>
        <p style={S}><b>2. 수집·이용 목적</b><br />
        · 자미두수 명반 산출 및 감정서 작성·전달(카카오톡)<br />
        · 紅線 매칭: 상대 소개(블라인드 프로필·궁합 감정 제공), 성사 시 카카오톡 아이디 상호 전달<br />
        · 서비스 관련 안내 및 문의 응대</p>
        <p style={S}><b>3. 보유 기간</b><br />수집일로부터 1년 또는 삭제 요청 시까지. 목적 달성 후 지체 없이 파기합니다.</p>
        <p style={S}><b>4. 제3자 제공</b><br />
        紅線 매칭 성사 시, 본인의 동의(수락) 하에 상대방에게 블라인드 프로필(아바타·나이·직업·지역·관심사·자기소개)과 카카오톡 아이디가 제공됩니다. 이름·휴대폰 번호는 상대방에게 제공되지 않습니다.</p>
        <p style={S}><b>5. 처리 위탁 및 국외 이전</b><br />
        서비스 운영을 위해 아래 업체에 처리를 위탁하며, 해당 서버는 국외에 위치할 수 있습니다.<br />
        · Supabase Inc.(데이터 보관) · Vercel Inc.(호스팅) · Anthropic PBC(감정문 생성 — 명반 계산값과 이름만 전달, 연락처 미전달)<br />
        이용자는 국외 이전을 원치 않을 경우 서비스 이용을 중단하고 삭제를 요청할 수 있습니다.</p>
        <p style={S}><b>6. 이용자의 권리</b><br />
        카카오톡 채널로 요청 시 열람·정정·삭제·처리정지가 가능하며 지체 없이 조치합니다. 동의를 거부할 수 있으나, 거부 시 감정 및 매칭 제공이 불가합니다.</p>
        <p style={S}><b>7. 연령 제한</b><br />본 서비스(특히 紅線 매칭)는 만 19세 이상만 이용할 수 있습니다.</p>
        <p style={S}><b>8. 광고성 정보 수신 (선택)</b><br />
        혜택·이벤트 등 광고성 정보 문자는 [선택] 수신 동의자에게만 발송합니다. 동의하지 않아도 서비스 이용에 제한이 없으며, 수신 동의는 안내 문자에 "수신거부"로 회신하거나 카카오톡 채널로 요청해 언제든 철회할 수 있습니다.</p>
        <p style={S}><b>9. 문의</b><br />개인정보 관련 문의: 카카오톡 채널 {CONFIG.BRAND}</p>
      </div>
    </main>
  );
}
