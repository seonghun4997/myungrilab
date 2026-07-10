import { CONFIG } from "../../lib/content";

export const metadata = { title: `개인정보 수집·이용 안내 — ${CONFIG.BRAND}` };

export default function Privacy() {
  return (
    <main className="wrap" style={{ paddingTop: 50, paddingBottom: 80 }}>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 20, color: "var(--ash)" }}>개인정보 수집·이용 안내</h1>
      <div style={{ fontSize: 14, lineHeight: 2, color: "var(--ash)" }}>
        <p><b>1. 수집 항목</b><br />이름, 휴대폰 번호, 생년월일시, 성별, 출생 지역</p>
        <p style={{ marginTop: 14 }}><b>2. 수집 목적</b><br />사주 풀이 결과 산출, 유료 리포트 전달(카카오톡), 서비스 관련 안내</p>
        <p style={{ marginTop: 14 }}><b>3. 보유 기간</b><br />수집일로부터 1년 또는 삭제 요청 시까지</p>
        <p style={{ marginTop: 14 }}><b>4. 동의 거부 권리</b><br />동의를 거부할 수 있으나, 거부 시 진단 결과 및 리포트 제공이 불가합니다.</p>
        <p style={{ marginTop: 14 }}><b>5. 삭제 요청</b><br />카카오톡 채널로 요청 시 지체 없이 파기합니다.</p>
      </div>
    </main>
  );
}
