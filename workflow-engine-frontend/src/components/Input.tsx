import type { InputHTMLAttributes } from 'react';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-border-secondary bg-bg-secondary px-3 py-2 text-sm text-fg-primary outline-none focus:border-border-primary ${className}`}
    />
  );
}
