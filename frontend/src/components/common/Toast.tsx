import { AnimatePresence, motion } from 'framer-motion';

interface ToastProps {
  message: string;
  visible: boolean;
}

export default function Toast({ message, visible }: ToastProps) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 left-1/2 z-[var(--z-toast)] -translate-x-1/2 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-sm text-white backdrop-blur"
        >
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
