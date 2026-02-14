import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variantClass: Record<Variant, string> = {
  primary:
    'bg-[linear-gradient(120deg,var(--color-neon-cyan),#9bfff7)] text-black shadow-[var(--shadow-neon-cyan)] hover:brightness-110',
  ghost: 'border border-white/25 bg-white/5 text-white hover:bg-white/10',
  danger: 'bg-[linear-gradient(120deg,var(--color-neon-rose),#ff9aab)] text-black shadow-[var(--shadow-neon-rose)] hover:brightness-110',
};

export default function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold transition duration-[var(--motion-base)] [transition-timing-function:var(--motion-ease)] disabled:cursor-not-allowed disabled:opacity-60 ${variantClass[variant]} ${className}`}
    />
  );
}
