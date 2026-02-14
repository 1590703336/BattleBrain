import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return <section className={`panel relative overflow-hidden p-4 md:p-6 ${className}`}>{children}</section>;
}
