import { AnimatePresence, motion } from 'framer-motion';

interface DebateCopilotProps {
  disabled: boolean;
  loading: boolean;
  suggestion: string;
  onGenerate: () => void;
}

export default function DebateCopilot({ disabled, loading, suggestion, onGenerate }: DebateCopilotProps) {
  return (
    <aside className="relative">
      <motion.button
        type="button"
        whileHover={disabled ? undefined : { y: -2, scale: 1.01 }}
        whileTap={disabled ? undefined : { scale: 0.98 }}
        onClick={onGenerate}
        disabled={disabled || loading}
        className="group relative w-full overflow-hidden rounded-2xl border border-cyan-300/35 bg-[radial-gradient(140%_120%_at_20%_0%,rgba(46,245,255,0.18),transparent_55%),linear-gradient(165deg,rgba(10,23,38,0.96),rgba(8,14,28,0.94))] p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        <motion.div
          className="pointer-events-none absolute -left-4 -top-4 h-24 w-24 rounded-full bg-cyan-300/20 blur-2xl"
          animate={loading ? { scale: [1, 1.24, 1], opacity: [0.4, 0.8, 0.4] } : { scale: [1, 1.08, 1], opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-200/60 bg-cyan-300/15">
            <motion.span
              className="absolute h-8 w-8 rounded-full border border-cyan-200/55"
              animate={{ rotate: loading ? 360 : 180 }}
              transition={{ duration: loading ? 1.2 : 4.5, repeat: Infinity, ease: 'linear' }}
            />
            <motion.span
              className="h-3 w-3 rounded-full bg-cyan-100 shadow-[0_0_16px_rgba(173,255,255,0.8)]"
              animate={{ scale: loading ? [1, 1.45, 1] : [1, 1.2, 1] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.13em] text-cyan-100/90">AI Wingman</p>
            <p className="mt-1 text-sm font-semibold text-white">{loading ? 'Synthesizing your next rebuttal...' : 'Tap to generate a debate answer'}</p>
          </div>
        </div>
      </motion.button>

      <AnimatePresence>
        {suggestion ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.22 }}
            className="mt-3 rounded-2xl border border-cyan-300/28 bg-black/30 p-3 text-xs leading-relaxed text-cyan-50/95"
          >
            <div className="mb-1 text-[10px] uppercase tracking-[0.12em] text-cyan-200/80">Draft Loaded</div>
            {suggestion}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </aside>
  );
}
