import { motion } from 'framer-motion';

interface ThemeBackdropProps {
  topic: string;
}

function themeFromTopic(topic: string) {
  const t = topic.toLowerCase();
  if (t.includes('startup') || t.includes('pitch')) {
    return {
      name: 'Hustle Burn',
      gradient: 'from-amber-500/20 via-orange-500/10 to-rose-500/20',
    };
  }

  if (t.includes('ex') || t.includes('breakup')) {
    return {
      name: 'Heartbreak Neon',
      gradient: 'from-rose-500/20 via-fuchsia-500/10 to-cyan-500/20',
    };
  }

  return {
    name: 'Glitch Core',
    gradient: 'from-cyan-500/20 via-blue-500/10 to-lime-500/20',
  };
}

export default function ThemeBackdrop({ topic }: ThemeBackdropProps) {
  const theme = themeFromTopic(topic);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/12 p-3">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${theme.gradient}`} />
      <div className="relative z-10 flex items-center justify-between text-xs uppercase tracking-[0.1em] text-white/70">
        <span>Arena Theme</span>
        <span>{theme.name}</span>
      </div>
      <div className="pointer-events-none absolute inset-0">
        {[...Array(8)].map((_, idx) => (
          <motion.span
            key={idx}
            className="absolute h-1.5 w-1.5 rounded-full bg-cyan-200/70"
            initial={{ opacity: 0.2, x: `${10 + idx * 11}%`, y: `${22 + (idx % 4) * 16}%` }}
            animate={{ opacity: [0.2, 1, 0.2], y: [`${22 + (idx % 4) * 16}%`, `${18 + (idx % 4) * 16}%`, `${22 + (idx % 4) * 16}%`] }}
            transition={{ duration: 2.2 + idx * 0.14, repeat: Infinity }}
          />
        ))}
      </div>
    </div>
  );
}
