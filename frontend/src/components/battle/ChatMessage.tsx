import { motion } from 'framer-motion';
import { StrikeType } from '../../types/socket';

export interface ChatMessageProps {
  role: 'me' | 'opponent' | 'system';
  strikeType: StrikeType;
  scores: {
    wit: number;
    relevance: number;
    toxicity: number;
  };
  text: string;
  ts: number;
}

function strikeTone(strikeType: StrikeType) {
  if (strikeType === 'good') {
    return 'border-lime-300/45 bg-lime-200/8 shadow-[var(--shadow-neon-lime)]';
  }

  if (strikeType === 'toxic') {
    return 'border-rose-300/40 bg-rose-200/8 shadow-[var(--shadow-neon-rose)]';
  }

  return 'border-cyan-300/25 bg-cyan-200/5';
}

export default function ChatMessage({ role, strikeType, scores, text, ts }: ChatMessageProps) {
  const align = role === 'me' ? 'items-end' : role === 'system' ? 'items-center' : 'items-start';

  return (
    <motion.article
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.16 }}
      className={`flex ${align}`}
    >
      <div className={`max-w-[90%] rounded-2xl border px-3 py-2 text-sm md:max-w-[75%] ${strikeTone(strikeType)}`}>
        <div className="mb-1 text-xs uppercase tracking-[0.12em] text-white/65">
          {role === 'me' ? 'You' : role === 'opponent' ? 'Opponent' : 'System'} • {new Date(ts).toLocaleTimeString()}
        </div>
        <p className="whitespace-pre-wrap break-words leading-relaxed">{text}</p>
        {role !== 'system' ? (
          <div className="mt-2 flex gap-3 text-[11px] text-white/65">
            <span>Wit {scores.wit}</span>
            <span>Rel {scores.relevance}</span>
            <span>Tox {scores.toxicity}</span>
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}
