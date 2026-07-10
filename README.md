# 흉살검사소 (凶煞檢査所) — 공포×검증 사주 퍼널

"무서운 건 살(煞)이 아닙니다. 맞는다는 겁니다." — 무료 흉살 검사 → 살 발동 검증 → 정식 살풀이(AI 생성)

## 배포 (GitHub + Vercel)

1. 이 폴더 안의 내용물을 GitHub 새 저장소에 Upload files로 업로드
   (app, lib, public, package.json 등이 저장소 최상단에 오도록)
2. Vercel → Add New Project → 저장소 Import → Deploy
3. Vercel 프로젝트 → Settings → Environment Variables에 추가:
   - `ANTHROPIC_API_KEY` : console.anthropic.com 에서 발급한 API 키
   (추가 후 Deployments에서 Redeploy 한 번)
4. Vercel 프로젝트 → Analytics 탭 활성화 (이벤트 집계)

## 수정 위치

- 브랜드명 / 태그라인 / 알림 신청 링크(CTA_URL) / 문구 → `lib/content.js`
- 리포트 말투·원칙·섹션 지시문 → `app/api/section/route.js`
- 리포트 섹션 구성 → `lib/report.js`
- 디자인 색상 → `app/globals.css` 상단 :root

## 비용 안내

정식 풀이 1회 생성 = API 호출 6회 (섹션당 1회, claude-sonnet-4-6).
1회 리포트당 대략 100~200원 수준. 베타 테스트 트래픽에서는 부담 없는 규모입니다.

## 측정 이벤트 (Vercel Analytics → Events)

cta_start → input_submitted → quiz_answer(hit 여부) → cta_teaser →
cta_report / cta_signup → report_start → report_complete → cta_signup_after_report
