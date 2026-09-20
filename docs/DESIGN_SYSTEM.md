# Design System — Analytical Glass, not AI Slop

## Intent

Neural City Lab은 “AI 제품”처럼 보이기보다 **교통 운영 콘솔과 실험 분석 도구의 중간**처럼 보여야 한다.

시각적 주인공은 다음 순서다.

1. 도시/교통 상태
2. 선택된 교차로의 증거
3. 실험 지표
4. 제어 도구
5. 장식

장식이 1~4를 이기면 실패다.

## Glass usage

Apple의 material 가이드에서 착안해 glass는 계층 분리용으로만 사용한다.

### 허용
- top navigation / command bar
- inspector panel
- transient popover
- selected control group

### 금지
- 모든 KPI를 개별 glass card로 만들기
- canvas 자체를 유리판으로 만들기
- nested blur 3단 이상
- 배경에 의미 없는 빛 번짐을 깔아 blur를 강조하기

## Anti-slop blacklist

다음은 기본 디자인에서 금지한다.

- 보라→파랑 hero gradient
- 중앙에 거대한 “AI” 타이틀 + 반짝이는 orb
- floating blurred blobs
- 의미 없는 neon glow
- 모든 요소를 9999px pill로 처리
- 아이콘만 잔뜩 든 3×N 동일 크기 카드 그리드
- 섹션마다 gradient border
- chat bubble 스타일을 분석 UI에 사용
- “Intelligence / Optimize / Quantum” 같은 장식용 마케팅 카피
- ambient particle animation

## Shape language

- app shell radius: 20px 이하
- panel: 16px
- compact control: 10px
- button: 10px
- status chip만 full pill 허용
- 데이터 테이블/차트 영역은 더 직선적이고 작은 radius 사용

## Surface hierarchy

- Canvas/content plane: 가장 평평하고 어둡게
- Inspector: 반투명 regular glass
- Header: 얇은 glass
- Modal: 더 불투명한 glass

## Typography

- 시스템 UI stack. 외부 폰트 로딩 없음.
- 큰 마케팅 헤드라인 대신 12–24px 범위의 operational hierarchy.
- 숫자는 tabular-nums.
- metric 단위는 값보다 한 단계 낮은 대비.

## Color

UI chrome는 graphite/neutral. Accent는 teal 하나를 주 primary로 사용.

색은 의미가 있을 때만 사용:

- teal: active/selected/normal positive focus
- amber: caution/yellow phase
- red: blocked/error/red signal
- sky: informational data series

한 화면에서 accent가 서로 경쟁하지 않게 한다.

## Contrast

- normal text: WCAG AA 4.5:1 이상을 목표
- large text: 3:1 이상
- UI boundary / meaningful chart mark: 3:1 이상
- 반투명 surface 위 텍스트는 가장 나쁜 예상 background 기준으로 검토

## Motion

Motion verbs:
- vehicle moves
- queue grows/shrinks
- signal changes
- selection focuses

금지 motion:
- 카드가 계속 떠다님
- 배경이 숨 쉬듯 움직임
- 숫자가 목적 없이 반짝임

`prefers-reduced-motion`에서는 vehicle interpolation 외 비필수 transition을 제거한다.

## Transparency fallback

`backdrop-filter` 미지원 또는 reduced transparency 선호 시 opaque surface token으로 대체한다.

## Layout

Desktop 기본:

```text
┌ top command bar ──────────────────────────────┐
│                                               │
├───────────────────────────────┬───────────────┤
│                               │ inspector     │
│          city canvas          │ selected node │
│                               │ local metrics │
│                               │               │
├───────────────────────────────┴───────────────┤
│ status / core metrics                         │
└───────────────────────────────────────────────┘
```

주 canvas가 항상 가장 큰 면적을 갖는다.
