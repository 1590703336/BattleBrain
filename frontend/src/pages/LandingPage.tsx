import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { popIn } from '../utils/motion';

const topics = ['Breakup etiquette', 'Office roast war', 'Super Bowl aftermath', 'AI meme apocalypse'];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <section className="space-y-6 md:space-y-8">
      <motion.div {...popIn} className="space-y-5">
        <Badge text="LIVE ARENA DEMO" tone="lime" />
        <h1 className="max-w-4xl font-[var(--font-display)] text-4xl uppercase leading-tight tracking-[0.08em] md:text-6xl">
          Roast Fast.
          <br />
          Think Faster.
          <span className="block text-[var(--color-neon-cyan)]">BattleBrain Arena</span>
        </h1>
        <p className="max-w-2xl text-base text-[var(--color-text-secondary)] md:text-lg">
          Real-time wit battles with AI scoring. Land good strikes, avoid toxic hits, and collapse your rival HP before time runs out.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => navigate('/match')} className="min-w-40">
            Start Battle
          </Button>
          <Button variant="ghost" onClick={() => navigate('/result/demo')}>
            View Result Style
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="relative overflow-hidden">
          <h2 className="font-[var(--font-display)] text-xl tracking-[0.08em]">Trending Topics</h2>
          <ul className="mt-3 space-y-2">
            {topics.map((topic, idx) => (
              <li key={topic} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
                <span className="muted">#{idx + 1}</span>
                <span>{topic}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="font-[var(--font-display)] text-xl tracking-[0.08em]">Combat Loop</h2>
          <ol className="mt-3 space-y-3 text-sm text-white/85">
            <li>1. Enter queue and lock topic.</li>
            <li>2. Send short high-wit message.</li>
            <li>3. AI scores wit/relevance/toxicity.</li>
            <li>4. Damage resolves instantly with strike FX.</li>
            <li>5. Winner screen summarizes battle stats.</li>
          </ol>
        </Card>
      </div>
    </section>
  );
}
