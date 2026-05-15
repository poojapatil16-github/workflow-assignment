import type { ReactNode } from 'react';

const tone: Record<string, string> = {
  default: 'border-border-secondary text-fg-secondary bg-bg-secondary',
  success: 'border-border-primary text-fg-primary bg-bg-success',
  warning: 'border-border-primary text-fg-primary bg-bg-warning',
  danger: 'border-border-primary text-fg-primary bg-bg-danger',
  info: 'border-border-primary text-fg-primary bg-bg-info',
};

export function Badge({ children, tone: t = 'default' }: { children: ReactNode; tone?: keyof typeof tone }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border ${tone[t]}`}>
      {children}
    </span>
  );
}
