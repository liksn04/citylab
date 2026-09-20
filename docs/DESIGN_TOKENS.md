# Design Token Specification

실제 구현 source of truth는 `src/styles/tokens.css`다. 이 문서는 의미와 사용 계약을 설명한다.

## Color primitives

| Token | Value | Use |
|---|---|---|
| `--ink-0` | `#070a0e` | deepest background |
| `--ink-50` | `#0b0f14` | app background |
| `--ink-100` | `#10161d` | content plane |
| `--ink-150` | `#151d26` | opaque fallback panel |
| `--text-1` | `#f4f7fa` | primary text |
| `--text-2` | `#bec7d1` | secondary |
| `--text-3` | `#8d98a5` | tertiary only |
| `--teal-400` | `#62d6c8` | primary accent |
| `--amber-400` | `#efb45d` | warning / yellow signal |
| `--red-400` | `#f06f72` | danger / red signal |
| `--sky-400` | `#80b7f4` | info / comparison series |

## Glass

| Token | Value |
|---|---|
| `--glass-thin-bg` | `rgb(16 22 29 / 0.58)` |
| `--glass-regular-bg` | `rgb(18 25 33 / 0.72)` |
| `--glass-thick-bg` | `rgb(20 27 36 / 0.88)` |
| `--glass-border` | `rgb(255 255 255 / 0.09)` |
| `--glass-highlight` | `rgb(255 255 255 / 0.055)` |
| `--blur-thin` | `10px` |
| `--blur-regular` | `18px` |
| `--blur-thick` | `28px` |

규칙: blur를 직접 숫자로 쓰지 말고 token만 사용.

## Radius

`6, 10, 14, 18, 20px`. `9999px`은 status chip만.

## Spacing

2 / 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 px.

## Typography

- `--font-ui`: system-ui stack
- `--font-mono`: ui-monospace stack
- 11px: micro annotation
- 12px: labels
- 14px: body/default control
- 16px: strong body
- 20px: section/title
- 24px: app title maximum

## Shadows

- `--shadow-panel`: only separation, not glow
- `--shadow-focus`: keyboard focus ring equivalent, semantic teal

No colored outer glow except signal lamp rendering on Canvas, where glow carries actual light-state meaning.

## Motion

- `--motion-fast`: 120ms
- `--motion-base`: 180ms
- `--motion-slow`: 260ms
- easing: cubic-bezier(0.2, 0.8, 0.2, 1)

No bounce/spring in analytical controls.


## Verified contrast against opaque fallback `#151d26`

계산된 대비:

- `text-1`: 15.81:1
- `text-2`: 9.94:1
- `text-3`: 5.80:1
- `teal-400`: 9.69:1
- `amber-400`: 9.19:1
- `red-400`: 5.84:1
- `sky-400`: 8.09:1

따라서 현재 semantic foreground들은 opaque fallback에서 normal-text AA 4.5:1을 넘는다. 반투명 glass에서는 실제 합성 배경이 달라질 수 있으므로 중요한 텍스트는 opaque-equivalent가 충분한 regular/thick surface에 둔다.
