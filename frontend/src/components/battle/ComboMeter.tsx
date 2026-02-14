import { motion } from 'framer-motion';

interface ComboMeterProps {
  combo: number;
}

export default function ComboMeter({ combo }: ComboMeterProps) {
  const active = combo > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: active ? 1 : 0.5, y: 0, scale: active ? [1, 1.03, 1] : 1 }}
      transition={{ duration: 0.25, repeat: active ? Infinity : 0, repeatDelay: 0.8 }}
      className={`rounded-2xl border px-4 py-3 ${
        active ? 'border-lime-300/40 bg-lime-300/10 text-lime-100' : 'border-white/12 bg-black/20 text-white/60'
      }`}
    >
      <div className="text-xs uppercase tracking-[0.1em]">Combo Chain</div>
      <div className="mt-1 font-[var(--font-display)] text-2xl tracking-[0.08em]">x{combo}</div>
    </motion.div>
  );
}
