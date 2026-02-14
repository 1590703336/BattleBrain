interface BadgeProps {
  text: string;
  tone?: 'cyan' | 'lime' | 'rose';
}

const toneClass = {
  cyan: 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100',
  lime: 'border-lime-300/40 bg-lime-300/10 text-lime-100',
  rose: 'border-rose-300/40 bg-rose-300/10 text-rose-100',
};

export default function Badge({ text, tone = 'cyan' }: BadgeProps) {
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide ${toneClass[tone]}`}>{text}</span>;
}
