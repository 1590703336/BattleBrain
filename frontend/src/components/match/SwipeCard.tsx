import { motion, PanInfo } from 'framer-motion';

interface MatchCandidate {
  id: string;
  name: string;
  level: number;
  humorStyle: string;
  bio: string;
}

interface SwipeCardProps {
  candidate: MatchCandidate;
  index: number;
  onSwipe: (direction: 'left' | 'right', candidate: MatchCandidate) => void;
}

const SWIPE_THRESHOLD = 120;

export default function SwipeCard({ candidate, index, onSwipe }: SwipeCardProps) {
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      onSwipe('right', candidate);
      return;
    }

    if (info.offset.x < -SWIPE_THRESHOLD) {
      onSwipe('left', candidate);
    }
  };

  return (
    <motion.article
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileDrag={{ rotate: 8, scale: 1.02 }}
      initial={{ opacity: 0, y: 26, scale: 0.96 }}
      animate={{ opacity: 1, y: index * 4, scale: 1 - index * 0.03 }}
      exit={{ opacity: 0, y: -24, x: 220 }}
      transition={{ duration: 0.25 }}
      className="panel absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ zIndex: 20 - index }}
    >
      <div className="p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-[var(--font-display)] text-2xl tracking-[0.08em]">{candidate.name}</h3>
            <p className="text-sm text-white/65">Level {candidate.level}</p>
          </div>
          <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs">{candidate.humorStyle}</span>
        </div>

        <p className="mt-5 rounded-2xl border border-white/12 bg-black/20 p-4 text-sm leading-relaxed text-white/80">{candidate.bio}</p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-xs uppercase tracking-[0.08em]">
          <div className="rounded-xl border border-rose-300/25 bg-rose-300/10 px-3 py-2 text-rose-100">Swipe Left Skip</div>
          <div className="rounded-xl border border-lime-300/25 bg-lime-300/10 px-3 py-2 text-lime-100">Swipe Right Match</div>
        </div>
      </div>
    </motion.article>
  );
}

export type { MatchCandidate };
