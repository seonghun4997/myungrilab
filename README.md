# 흉살검사소 (凶煞檢査所) — 디비 퍼널

"무서운 건 살(煞)이 아닙니다. 맞는다는 겁니다."

퍼널: 영상 랜딩 → 디비 입력(이름/휴대폰) → 흉살 진단 20% → 발동 검증 → 결제 유도 → 관리자가 리포트 생성 → 카카오톡으로 링크 전달

## 1. Supabase 설정 (디비 저장소)

1) https://supabase.com 로그인 → New Project (이름: myungrilab)
2) 왼쪽 메뉴 SQL Editor → 아래 전체를 붙여넣고 Run:

```sql
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  phone text not null,
  birth jsonb not null,
  sal_names text[],
  sal_count int,
  quiz_hits int,
  paid boolean default false,
  report jsonb,
  token text unique
);
alter table leads enable row level security;
```

3) Settings → API 에서 두 값을 복사:
   - Project URL
   - service_role 키 (secret — 절대 외부 공개 금지)

## 2. Vercel 환경변수 (Settings → Environment Variables)

| Key | Value |
|---|---|
| ANTHROPIC_API_KEY | 기존 키 (이미 등록됨) |
| SUPABASE_URL | Supabase Project URL |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service_role 키 |
| ADMIN_KEY | 관리자 페이지 비밀번호 (직접 정하기, 예: 긴 랜덤 문자열) |

추가 후 Deployments → Redeploy 필수.

## 3. 판매 설정 — lib/content.js 에서 교체

- PRICE / PRICE_ORIGINAL : 판매가 / 정가
- PAYMENT_URL : 결제 링크 (스마트스토어 상품, 토스/카카오페이 송금링크 등)
- KAKAO_CHANNEL_URL : 카카오톡 채널 주소 (pf.kakao.com/...)
- DELIVERY_NOTE : 전달 안내 문구

## 4. 운영 흐름

1) 고객이 사이트에서 진단 → 디비 자동 저장
2) 고객이 결제 후 카카오톡 채널로 성함 전송
3) 사이트주소/admin 접속 → 관리자 키 입력 → 해당 고객 [결제 확인] 체크 → [리포트 생성] (30초)
4) [카톡 안내문 복사] → 카카오톡 채팅에 붙여넣어 전송 → 끝

## 5. 인트로 영상

public 폴더에 intro.mp4 (5~10초 루프, 10MB 이하) 업로드. 없으면 안개 폴백 화면.

## 측정 이벤트 (Vercel Analytics)

cta_start → lead_submitted → quiz_answer → cta_paywall → paywall_view → pay_click / kakao_click
