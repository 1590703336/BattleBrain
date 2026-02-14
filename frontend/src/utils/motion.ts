export const motionTokens = {
  duration: {
    fast: 0.12,
    base: 0.22,
    impact: 0.38,
  },
  ease: [0.22, 0.61, 0.36, 1] as number[],
};

export const pageMotion = {
  initial: { opacity: 0, y: 14, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(3px)' },
  transition: {
    duration: motionTokens.duration.base,
    ease: motionTokens.ease,
  },
};

export const popIn = {
  initial: { opacity: 0, scale: 0.95, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  transition: {
    duration: motionTokens.duration.base,
    ease: motionTokens.ease,
  },
};
