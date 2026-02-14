import { useCallback, useEffect, useRef, useState } from 'react';
import { Howler } from 'howler';

export function useSoundEffect(enabled = true) {
  const active = useRef(enabled);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    active.current = enabled;
    Howler.volume(enabled ? 0.9 : 0);
  }, [enabled]);

  const unlockAudio = useCallback(async () => {
    if (!active.current) {
      return false;
    }

    const ctx = Howler.ctx;
    if (!ctx) {
      return false;
    }

    if (ctx.state !== 'running') {
      await ctx.resume();
    }

    setUnlocked(ctx.state === 'running');
    return ctx.state === 'running';
  }, []);

  useEffect(() => {
    const handler = () => {
      void unlockAudio();
    };

    window.addEventListener('pointerdown', handler, { passive: true });
    window.addEventListener('keydown', handler);

    return () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [unlockAudio]);

  const beep = useCallback(
    (frequency: number, duration = 0.12, gain = 0.07) => {
      if (!active.current) {
        return;
      }

      const ctx = Howler.ctx;
      if (!ctx || ctx.state !== 'running') {
        return;
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = frequency;
      gainNode.gain.value = gain;

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + duration);
    },
    []
  );

  return {
    unlocked,
    unlockAudio,
    playStrike: (tone: 'good' | 'toxic' | 'neutral') => {
      if (tone === 'good') {
        beep(840, 0.1, 0.08);
        return;
      }
      if (tone === 'toxic') {
        beep(210, 0.16, 0.1);
        return;
      }
      beep(520, 0.09, 0.06);
    },
    playVictory: () => {
      beep(740, 0.1, 0.08);
      setTimeout(() => beep(980, 0.12, 0.08), 90);
    },
    playDefeat: () => {
      beep(260, 0.12, 0.09);
      setTimeout(() => beep(170, 0.22, 0.1), 120);
    },
    playUiTap: () => beep(620, 0.07, 0.06),
  };
}
