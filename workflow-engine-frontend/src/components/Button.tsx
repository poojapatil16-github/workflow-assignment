import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';

const variantClass: Record<Variant, string> = {
  primary:
    'bg-bg-info text-fg-primary border border-border-primary hover:opacity-90 disabled:opacity-50',
  ghost: 'bg-transparent text-fg-secondary border border-border-secondary hover:bg-bg-secondary',
  danger: 'bg-bg-danger text-fg-primary border border-border-primary hover:opacity-90',
};

export function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: Variant }) {
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition ${variantClass[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
