// ============================================================
// /api/section — 리포트 섹션 1개를 생성하는 서버 라우트
// 필요 환경변수: ANTHROPIC_API_KEY (Vercel → Settings → Environment Variables)
// ============================================================
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-6";

const COMMON_SYSTEM = `당신은 사주 살풀이 서비스 '흉살검사소'의 수석 풀이가입니다. 브랜드 태그라인은 "무서운 건 살(煞)이 아닙니다. 맞는다는 겁니다."입니다.

절대 원칙:
1. 아래 [명식 데이터]에 제공된 계산 결과만 사용합니다. 간지, 십성, 오행, 연도를 절대 새로 계산하거나 바꾸지 마세요. 데이터에 없는 간지를 언급하지 마세요.
2. 모든 해석에는 근거를 붙입니다. "일지에 편관이 앉아 있어", "2027년 세운이 일지와 충이라" 같은 식으로, 읽는 사람이 자기 명식에서 확인할 수 있게 씁니다.
3. 덕담과 두루뭉술한 위로는 금지합니다. 좋지 않은 것은 좋지 않다고 말하되, 반드시 대응 방향을 한 가지 이상 제시합니다.
4. 과장 금지: "반드시", "100%", "절대" 같은 단정은 쓰지 않습니다. 명리학은 흐름의 학문임을 전제로 씁니다.
5. 시주가 미상이면 시주 관련 단정을 피하고, 나머지 여섯 글자로 읽을 수 있는 것만 씁니다.

문체:
- 존댓말. 촛불 아래에서 낮은 목소리로 읽어주는 듯한, 긴장감 있고 단호한 어조. 감탄사와 이모지 금지.
- 공포는 사실에서만 나옵니다. 겁을 주기 위해 데이터에 없는 것을 지어내는 것을 금지합니다. 대신 데이터에 있는 것은 에두르지 않고 정면으로 말합니다.
- 반드시 각 섹션의 마지막은 "이 살을 다루는 법" — 실행 가능한 대응 1~2가지로 마무리합니다. 겁만 주고 끝내는 것을 금지합니다.
- 500~800자, 2~4개 문단. 마크다운 헤더(#) 금지, 강조는 **굵게**만 허용.
- 첫 문장은 인사말 없이 바로 본론으로 시작합니다.`;

const SECTION_PROMPTS = {
  sal: `[살 정밀 해부 — 검출된 살의 정체와 발동 조건]을 작성하세요.
다룰 것: [검출살] 목록의 각 살에 대해 — 이 사주에서 그 살이 구체적으로 어떤 모양으로 나타나는지(어느 기둥, 어떤 십성과 함께인지), 어떤 조건에서 발동하는지, 그리고 이 살을 무기로 바꾸는 법. 흉살이 없다면 그 의미를 정직하게 쓰고, 길신(천을귀인)이 있으면 살을 막는 구조로 설명하세요. [삼재] 정보가 있으면 삼재 기간을 명시하세요.`,
  overview: `[타고난 그릇 — 살을 품은 그릇]을 작성하세요.
다룰 것: 일간과 일주가 만드는 기질의 핵심, 오행 분포와 신강/신약이 말하는 에너지 구조, 이 그릇이 [검출살]의 살들을 담고 있다는 것이 어떤 의미인지 — 같은 살도 그릇에 따라 독이 되고 약이 됩니다. [직언] 항목을 자연스럽게 녹여 심화하세요.`,
  wealth: `[재물 — 새는 구멍과 채우는 길]을 작성하세요.
다룰 것: 원국에서 재성(편재/정재)의 유무와 위치가 말하는 돈의 그릇, 비겁·식상 구조가 만드는 버는 방식과 새는 경로(구멍), 향후 5년 세운 중 재성운이 오는 해가 있다면 그 연도를 명시. 재성이 없다면 없는 사주의 재물 전략을 정직하게 쓰세요.`,
  love: `[인연 — 붙는 살, 끊는 살]을 작성하세요.
다룰 것: 일지(배우자궁)에 앉은 십성이 말하는 인연의 모양, [검출살] 중 도화·원진·귀문이 있다면 그것이 관계에서 발동하는 방식(붙이는 살인지 끊는 살인지), 남성이면 재성·여성이면 관성의 상태로 보는 인연의 길, 향후 5년 중 일지와 합 또는 충이 되는 해가 있다면 그 연도를 인연의 변곡점으로 명시.`,
  years: `[향후 5년 — 발동 시간표]를 작성하세요.
다룰 것: [향후5년세운] 데이터의 각 연도를 순서대로, 연도별 1~3문장씩. 천간십성과 일지와의 관계(합/충)를 근거로 그 해의 주제와 발동 위험을 씁니다. 충이 있는 해는 살이 움직이는 해로 반드시 짚고, 그 해에 하지 말아야 할 결정 1가지를 명시하세요. [삼재] 기간이 향후 5년과 겹치면 반드시 언급하세요. 연도는 데이터에 있는 그대로 씁니다.`,
  daeun: `[다음 대운 — 판이 바뀌는 해]를 작성하세요.
다룰 것: [대운] 목록에서 현재 진행 중인 대운과 다음 대운을 구분하고, 다음 대운의 간지와 천간십성이 여는 10년의 큰 주제를 씁니다. 대운이 바뀌는 해([미래신호]의 다음대운시작 연도)를 명시하고, 판이 바뀌는 전환기 1~2년을 어떻게 건너야 하는지로 마무리하세요.`,
};

export async function POST(req) {
  try {
    const { sectionId, facts } = await req.json();
    if (!sectionId || !facts || !SECTION_PROMPTS[sectionId]) {
      return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "API 키가 설정되지 않았습니다. Vercel → Settings → Environment Variables에 ANTHROPIC_API_KEY를 추가하세요." },
        { status: 500 }
      );
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1100,
        system: COMMON_SYSTEM,
        messages: [
          {
            role: "user",
            content: `[명식 데이터]\n${JSON.stringify(facts, null, 1)}\n\n[작성 지시]\n${SECTION_PROMPTS[sectionId]}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Anthropic API error:", res.status, detail.slice(0, 300));
      return Response.json({ error: "풀이 생성에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 502 });
    }
    const data = await res.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!text) return Response.json({ error: "빈 응답이 반환되었습니다." }, { status: 502 });
    return Response.json({ text });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
