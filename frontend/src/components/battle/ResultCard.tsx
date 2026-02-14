import { motion } from 'framer-motion';
import Button from '../common/Button';
import Card from '../common/Card';

export interface ResultCardProps {
  winner: 'me' | 'opponent' | 'draw';
  stats: {
    myDamage: number;
    opponentDamage: number;
    messageCount: number;
    goodStrikes: number;
    toxicStrikes: number;
  };
  onReplay: () => void;
}

export default function ResultCard({ winner, stats, onReplay }: ResultCardProps) {
  const heading = winner === 'me' ? 'Victory' : winner === 'opponent' ? 'Defeat' : 'Draw';
  const tone = winner === 'me' ? 'text-lime-200' : winner === 'opponent' ? 'text-rose-200' : 'text-cyan-100';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card className="scanline">
        <h2 className={`font-[var(--font-display)] text-4xl tracking-[0.1em] ${tone}`}>{heading}</h2>
        <p className="mt-2 muted">Battle analysis synced. Your roast engine is getting sharper.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
          <StatBox label="Your DMG" value={stats.myDamage} />
          <StatBox label="Enemy DMG" value={stats.opponentDamage} />
          <StatBox label="Messages" value={stats.messageCount} />
          <StatBox label="Good" value={stats.goodStrikes} />
          <StatBox label="Toxic" value={stats.toxicStrikes} />
        </div>

        <Button onClick={onReplay} className="mt-6 w-full md:w-auto">
          Play Again
        </Button>
      </Card>
    </motion.div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/15 bg-black/25 px-3 py-3">
      <div className="text-xs uppercase tracking-[0.08em] text-white/55">{label}</div>
      <div className="mt-1 text-xl font-bold text-white">{value}</div>
    </div>
  );
}
