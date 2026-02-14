import { motion } from 'framer-motion';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Card from '../common/Card';

interface QueueScreenProps {
  queueStatus: 'idle' | 'searching' | 'found';
  etaSec: number;
  statusText: string;
  onCancel: () => void;
}

export default function QueueScreen({ queueStatus, etaSec, statusText, onCancel }: QueueScreenProps) {
  const searching = queueStatus === 'searching';

  return (
    <Card className="relative overflow-hidden p-6 md:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(46,245,255,0.15)_0%,transparent_60%)]" />
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="relative mb-5 flex h-40 w-40 items-center justify-center">
          {[0, 1, 2].map((ring) => (
            <motion.div
              key={ring}
              initial={{ opacity: 0.6, scale: 0.6 }}
              animate={{ opacity: searching ? [0.8, 0.15, 0.8] : 0.5, scale: searching ? [0.65, 1.15, 0.65] : 0.8 }}
              transition={{ duration: 2.2, delay: ring * 0.24, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute rounded-full border border-cyan-300/35"
              style={{ width: 92 + ring * 34, height: 92 + ring * 34 }}
            />
          ))}
          <motion.div
            animate={{ scale: searching ? [1, 1.08, 1] : 1, rotate: searching ? [0, 4, -4, 0] : 0 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="rounded-full border border-white/20 bg-black/35 px-4 py-2 text-sm font-semibold tracking-[0.08em]"
          >
            MATCH
          </motion.div>
        </div>

        <Badge text={queueStatus === 'found' ? 'Opponent Found' : 'Searching'} tone={queueStatus === 'found' ? 'lime' : 'cyan'} />
        <h2 className="mt-3 font-[var(--font-display)] text-2xl tracking-[0.08em] md:text-3xl">
          {queueStatus === 'found' ? 'Locking Arena' : 'Finding Your Opponent'}
        </h2>
        <p className="mt-2 max-w-xl text-sm text-white/70 md:text-base">{statusText}</p>

        <div className="mt-5 flex items-center gap-3">
          <Badge text={`ETA ${Math.max(0, etaSec)}s`} tone="cyan" />
          <Button variant="ghost" onClick={onCancel}>
            Cancel Queue
          </Button>
        </div>
      </div>
    </Card>
  );
}
