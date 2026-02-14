import { InputHTMLAttributes } from 'react';

export default function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-white/20 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-[var(--color-neon-cyan)] focus:shadow-[var(--shadow-neon-cyan)]"
    />
  );
}
