# 자미연 (紫微緣) — 자미두수 총운 디비 퍼널 (용용 골격 80% + 자미연 스킨 20%)

퍼널: 롱폼 랜딩(대운 훅→도대체 왜→황실→아직도 사주만?→170배→검증/후기) → 노인 문답 6단계(성별~고민) → 총운 무료 진단(명궁 공개+대운 해+봉인 4장) → 3단 패키지 결제 → 감정서 카톡 전달 → 紅線 매칭

## 상품 3단 (lib/content.js PRODUCTS)
1) 자미두수 총운 25,900 (6편) / 2) [인기] +평생 대운 정밀 49,900 (7편) / 3) 인생 책임 패키지 63,900 (8편)
- 각 상품별 결제링크: PRODUCTS[].url (비우면 CONFIG.PAYMENT_URL 공용)
- 고객이 상품을 고르면 리드의 quiz_hits에 티어(1/2/3) 저장 → admin [리포트 생성]이 티어에 맞는 편수로 자동 생성
- 問六 고민(선택)은 birth.concern에 저장 → 감정서 마지막 運 편이 고민에 직접 답함
- 후기: 실후기 5개 이상 확보 후 lib/content.js REVIEWS.enabled=true + items 채우기 (그 전엔 검증 블록이 대신 노출)
- 쿠폰: CONFIG.COUPONS = { "코드": 차감액 } 형태로 등록

## 1. Supabase — 신규라면 아래 전체, 기존 테이블이 있다면 ALTER 2줄만

신규 (SQL Editor → Run):
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
  token text unique,
  intro text,
  match_optin boolean default false,
  viewed_at timestamptz
);
alter table leads enable row level security;
```

기존 테이블 사용 중이면 (紅線 매칭용 — 아래 전체 실행):
```sql
alter table leads add column if not exists intro text;
alter table leads add column if not exists match_optin boolean default false;
alter table leads add column if not exists profile jsonb;
alter table leads add column if not exists viewed_at timestamptz; -- 리포트 최초 열람 시각 (v14)
alter table leads add column if not exists rating int; -- 감정서 별점 1~5 (v15)

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  lead_a uuid references leads(id),
  lead_b uuid references leads(id),
  note text,
  a_accept boolean,
  b_accept boolean,
  a_paid boolean default false,
  b_paid boolean default false,
  kakao_a text,
  kakao_b text,
  status text default 'proposed'
);
alter table matches enable row level security;
```
(신규 설치라면 위 leads 생성 SQL에 profile jsonb 컬럼을 추가하고 matches까지 함께 실행)

## 2. Vercel 환경변수 (기존과 동일 — 변경 없음)

ANTHROPIC_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ADMIN_KEY

## 3. 판매 설정 — lib/content.js

PRICE(33,000) / PRICE_ORIGINAL(165,000) / PAYMENT_URL / KAKAO_CHANNEL_URL 교체

## 4. 운영 흐름

1) 고객 진단 → 디비 자동 저장 (admin에 명궁·부처궁·인연해 표시)
2) 결제 + 카톡으로 성함 수신 → /admin → [결제 확인] 체크 → [리포트 생성] → [카톡 안내문 복사] → 전송
3) 紅線 매칭 (이제 시스템으로 돌아갑니다):
   - 신청자는 결제 페이지에서 프로필(아바타·직업·지역·관심사·소개) 작성 → 전용 인연함 링크(/m/토큰) 발급
   - admin에서 紅線신청자 2명 체크 → [궁합 확인] (부처궁↔명궁 대조 + 삼합, 天緣/良緣/可緣/淡緣) → [인연 카드 발송]
   - A/B 인연함 링크 복사 → 각자에게 카톡 전송 ("월하노인이 연을 물어왔습니다")
   - 각자 인연함에서 블라인드 프로필+궁합 감정 보고 수락/거절 → 양측 수락 시 성사
   - 성사비 결제(MATCH_CONFIG.PRICE, 1인당) → admin에서 A/B 성사비 체크 → 두 사람 모두 확인되면 서로의 카톡 아이디 자동 공개
   - 성사비 결제 링크: lib/content.js의 MATCH_CONFIG.PAYMENT_URL 교체

## 5. 히어로 이미지

기본은 코드로 그린 밤하늘·달·산수. `public/hero.jpg` 세로 이미지를 넣으면 배경 교체 가능(선택).

## 확장 로드맵

궁합 정밀 감정(2인 명반) → 재회 감정 → 매칭 자동화(궁합 점수) → (별도 라인) 살풀이/자녀사주 퍼널 재활용 (git 이력 v6/v8 보존)

## 자미두수 엔진 (lib/ziwei.js)

음력 변환 → 명궁/신궁 → 오행국(납음) → 자미성 배치(고전 구결 검증) → 14주성 + 보조성 → 사화 → 12궁 → 대한. 검증: 자미 5국 앵커 일치, 갑년 사화 정통 배치, 300 랜덤 스모크 0오류.


## 런칭 전 체크리스트 (5인 관점 감사 반영)

### 법률
- [ ] 사업자등록 + 통신판매업 신고 → lib/content.js의 CONFIG.BUSINESS_INFO 채우기 (푸터에 자동 표기)
- [ ] 가격 표시: 정가 165,000원에 실판매 이력이 없으면 "할인" 표기는 기만광고 소지 — 초기에는 프로모션가 각주(적용됨)로 방어하되, 가급적 정가 판매 이력을 만들거나 정가 표기 제거 검토
- [ ] 紅線 매칭이 "결혼중개"로 해석될 경우 국내결혼중개업 신고 대상(결혼중개업법) — "교제 주선"으로 운영하되 개업 전 구청/법률 상담 1회 권장
- [ ] 개인정보처리방침(/privacy): 국외이전·위탁·매칭 제3자 제공 반영 완료 — 실제 운영과 달라지면 갱신
- 적용됨: 만 19세 확인 문구, 미성년 매칭 차단, 카운트다운 만료 후 리셋 제거

### 퍼포먼스 마케팅
- [ ] Meta 픽셀: Vercel 환경변수 NEXT_PUBLIC_META_PIXEL_ID 추가 → 자동 주입 (PageView + Lead/InitiateCheckout/ViewContent 표준 이벤트 발화)
- 적용됨: UTM 자동 저장 → 리드의 birth.utm에 기록 (admin/Supabase에서 소재별 전환 확인)
- 적용됨: OG 메타태그 (광고 링크 미리보기)
- 이벤트 퍼널: cta_start → gender_set → birth_set → time_set → phone_set → name_set → lead_submitted → diag_view → cta_pay_page → pay_view → pay_click / kakao_click / match_apply

### 운영
- 적용됨: 주문코드 — 결제 페이지에 6자리 코드 노출, 고객이 카톡으로 보내면 admin의 리드 token 앞 6자리와 대조
- 적용됨: "지난 감정 다시 보기" — 재방문 시 히어로에서 바로 진단 복원


## 고객 여정 계측 지도 (v14)

| 여정 단계 | 지표 | 보는 곳 |
|---|---|---|
| 광고 노출→클릭 | CTR / CPC | Meta 광고관리자 (UTM은 리드에 저장) |
| 랜딩 도착 | 방문수 | Vercel Analytics |
| 스크롤 생존 | sec_why → sec_royal → sec_ask → sec_170x → sec_proof → sec_final | Vercel Analytics |
| CTA 클릭 | cta_start | Vercel Analytics |
| 문답 단계별 이탈 | step_1~6 (+ gender/birth/time/phone/name/concern_set) | Vercel Analytics |
| 디비 제출 | lead_submitted | Vercel Analytics + /admin 깔때기 |
| 무료 진단 열람 | diag_view | Vercel Analytics |
| 결제 페이지 도달 | cta_pay_page → pay_view | Vercel Analytics |
| 결제 버튼 | pay_click / kakao_click (+ product_select 티어) | Vercel Analytics + Meta(InitiateCheckout) |
| 실결제 | /admin 결제 확인 체크 | /admin 깔때기 |
| 리포트 전달 | 리포트 생성 수 (token) | /admin 깔때기 |
| 리포트 열람 | report_view + viewed_at | Vercel Analytics + /admin 깔때기 |
| 리포트 속 소개팅 | report_match_view(섹션 도달) / report_match_click(신청 클릭) | Vercel Analytics |
| 매칭 신청 | match_apply / match_optin | /admin 깔때기 |
| 인연 카드 발송 | matches 생성 | /admin 깔때기 |
| 인연함 열람·응답 | matchbox_view / match_accept / match_decline | Vercel Analytics |
| 매칭 성사 | 양측 수락 | /admin 깔때기 |
| 성사비 결제 | match_fee_click → 양측 성사비 체크 | Vercel Analytics + /admin 깔때기 |
| 아이디 공유 | match_kakao_set → 상호 공개 | /admin 깔때기 |


## v15 감정서 구조 (용용 골격 이식)
序(명반 그리드) + 13장 + 월하노인의 편지. 티어별: 총운 7장 / 인기 12장 / 패키지 15장 전권.
모든 위젯 수치(성향·욕구·부의그릇·직장인vs사업가·건강·희소도·운흐름·주의연도·유월)는 lib/scores.js에서 명반 배치로부터 결정론적으로 계산 — LLM은 해설만 담당.
8장 연애운의 '운명의 상대 카드' 바로 아래 紅線 매칭 CTA, 편지 뒤 별점(leads.rating) 수집.
구버전(v13 이하) 리포트는 report.__v 부재로 판별해 기존 형식 그대로 렌더.
