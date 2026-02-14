# BattleBrain Visual Baseline (Neon Arena)

## Direction
- Theme: Esports neon arena
- Mood: high contrast, high speed, controlled chaos
- Core fonts: Orbitron (display), Manrope (body)

## Token Source of Truth
- Colors/radius/shadow/spacing/motion/z-index:
  - `src/styles/tokens.css`
- Motion tokens:
  - `fast=120ms`
  - `base=220ms`
  - `impact=380ms`
  - `ease=cubic-bezier(0.22,0.61,0.36,1)`

## Component Rules
- `Button`: gradient neon or ghost style, strong hover contrast
- `Card`: glass panel with layered gradient and border glow
- `Input`: dark field, cyan focus ring
- `Badge`: compact status chips for timer/live/topic states
- `HealthBar`: smooth width transition + hp color thresholds
- `Toast`: bottom floating feedback for cooldown/errors

## Motion Layering
- Framer Motion:
  - route/page transitions
  - message enter transitions
  - hp interpolation
- GSAP:
  - arena impact shake
  - strike flash
  - floating damage burst support

## Accessibility
- If user sets `prefers-reduced-motion: reduce`, major motion is reduced and CSS animations are disabled.
