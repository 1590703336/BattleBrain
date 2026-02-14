import gsap from 'gsap';
import { RefObject, useCallback } from 'react';

export function useStrikeAnimation(arenaRef: RefObject<HTMLElement | null>, reducedMotion: boolean) {
  const triggerStrike = useCallback(
    (tone: 'good' | 'toxic' | 'neutral') => {
      if (!arenaRef.current || reducedMotion) {
        return;
      }

      const intensity = tone === 'good' ? 8 : tone === 'toxic' ? 12 : 6;
      const flash =
        tone === 'good' ? 'rgba(147,255,102,0.25)' : tone === 'toxic' ? 'rgba(255,77,136,0.34)' : 'rgba(46,245,255,0.22)';

      const host = arenaRef.current;

      const tl = gsap.timeline();
      tl.to(host, {
        x: -intensity,
        duration: 0.05,
      })
        .to(host, { x: intensity, duration: 0.05 })
        .to(host, { x: -intensity / 2, duration: 0.05 })
        .to(host, { x: 0, duration: 0.07 });

      tl.to(
        host,
        {
          boxShadow: `inset 0 0 0 2px ${flash}, 0 0 30px ${flash}`,
          duration: 0.08,
        },
        0
      ).to(host, { boxShadow: 'none', duration: 0.2 }, 0.12);

      const burstCount = tone === 'good' ? 14 : tone === 'toxic' ? 12 : 8;
      for (let i = 0; i < burstCount; i += 1) {
        const particle = document.createElement('span');
        particle.style.position = 'absolute';
        particle.style.left = `${50 + (Math.random() * 26 - 13)}%`;
        particle.style.top = `${36 + (Math.random() * 20 - 10)}%`;
        particle.style.width = `${tone === 'good' ? 6 : 5}px`;
        particle.style.height = particle.style.width;
        particle.style.borderRadius = '999px';
        particle.style.pointerEvents = 'none';
        particle.style.background =
          tone === 'good' ? 'rgba(147,255,102,0.92)' : tone === 'toxic' ? 'rgba(255,77,136,0.92)' : 'rgba(46,245,255,0.85)';
        particle.style.zIndex = '40';
        host.appendChild(particle);

        gsap.fromTo(
          particle,
          { opacity: 1, scale: 0.8, x: 0, y: 0 },
          {
            opacity: 0,
            scale: 0.1,
            x: Math.cos((Math.PI * 2 * i) / burstCount) * (tone === 'good' ? 58 : 46),
            y: Math.sin((Math.PI * 2 * i) / burstCount) * (tone === 'good' ? 58 : 46),
            duration: 0.42,
            ease: 'power2.out',
            onComplete: () => {
              particle.remove();
            },
          }
        );
      }
    },
    [arenaRef, reducedMotion]
  );

  return { triggerStrike };
}
