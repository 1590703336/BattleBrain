# BattleBrain Frontend QA Checklist

## Viewports
- [ ] 375x812 (mobile)
- [ ] 768x1024 (tablet)
- [ ] 1280x720 (laptop)
- [ ] 1440x900 (desktop)

## Acceptance Scenarios
- [ ] Landing hero animation finishes in <= 2s without visible jank.
- [ ] Battle message flow remains readable after 10 consecutive stress hits.
- [ ] HP transitions from 100 to 0 with matching color thresholds.
- [ ] Result page key content appears within 300ms after navigation.
- [ ] Mobile input area remains usable when virtual keyboard appears.
- [ ] With reduced-motion enabled, all interactions still function.

## Manual Demo Flow
- [ ] Open `/` and click `Start Battle`.
- [ ] Send at least 5 messages and trigger `10x Stress` once.
- [ ] Confirm damage bursts/arena impact are visible.
- [ ] Let timer run or HP reach zero to auto-jump `/result/demo`.
- [ ] Click `Play Again` to restart loop.
