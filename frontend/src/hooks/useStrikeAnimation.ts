import gsap from 'gsap';
import { RefObject, useCallback } from 'react';

export function useStrikeAnimation(arenaRef: RefObject<HTMLElement | null>, reducedMotion: boolean) {
  const triggerStrike = useCallback(
    (tone: 'good' | 'toxic') => {
      if (!arenaRef.current || reducedMotion) {
        return;
      }

      const intensity = tone === 'good' ? 8 : 12;
      const flash = tone === 'good' ? 'rgba(147,255,102,0.25)' : 'rgba(255,77,136,0.32)';

      const tl = gsap.timeline();
      tl.to(arenaRef.current, {
        x: -intensity,
        duration: 0.05,
      })
        .to(arenaRef.current, { x: intensity, duration: 0.05 })
        .to(arenaRef.current, { x: -intensity / 2, duration: 0.05 })
        .to(arenaRef.current, { x: 0, duration: 0.07 });

      tl.to(
        arenaRef.current,
        {
          boxShadow: `inset 0 0 0 2px ${flash}, 0 0 30px ${flash}`,
          duration: 0.08,
        },
        0
      ).to(arenaRef.current, { boxShadow: 'none', duration: 0.2 }, 0.12);
    },
    [arenaRef, reducedMotion]
  );

  return { triggerStrike };
}
