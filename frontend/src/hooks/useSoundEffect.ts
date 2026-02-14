import { useEffect, useRef } from 'react';
import { Howler } from 'howler';

export function useSoundEffect(enabled = true) {
  const active = useRef(enabled);

  useEffect(() => {
    active.current = enabled;
  }, [enabled]);

  const beep = (frequency: number, duration = 0.12, gain = 0.03) => {
    if (!active.current) {
      return;
    }

    const ctx = Howler.ctx;
    if (!ctx) {
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
  };

  return {
    playStrike: (tone: 'good' | 'toxic' | 'neutral') => {
      if (tone === 'good') {
        beep(840, 0.1, 0.035);
        return;
      }
      if (tone === 'toxic') {
        beep(220, 0.15, 0.04);
        return;
      }
      beep(520, 0.08, 0.02);
    },
    playVictory: () => {
      beep(740, 0.09, 0.03);
      setTimeout(() => beep(980, 0.12, 0.03), 90);
    },
    playDefeat: () => {
      beep(280, 0.12, 0.035);
      setTimeout(() => beep(180, 0.2, 0.04), 120);
    },
    playUiTap: () => beep(620, 0.06, 0.02),
  };
}
