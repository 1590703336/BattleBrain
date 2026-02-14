import { motion } from 'framer-motion';

export interface HealthBarProps {
  value: number;
  max: number;
  state: 'me' | 'opponent';
}

function hpTone(percent: number) {
  if (percent > 0.55) {
    return 'var(--color-hp-high)';
  }
  if (percent > 0.25) {
    return 'var(--color-hp-mid)';
  }
  return 'var(--color-hp-low)';
}

export default function HealthBar({ value, max, state }: HealthBarProps) {
  const pct = Math.max(0, Math.min(1, value / max));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-white/70">
        <span>{state === 'me' ? 'You' : 'Opponent'}</span>
        <span>{value}/{max}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full border border-white/20 bg-black/35">
        <motion.div
          animate={{ width: `${pct * 100}%`, backgroundColor: hpTone(pct) }}
          transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
          className="h-full"
        />
      </div>
    </div>
  );
}
