import type { ReactNode } from 'react';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-fg-secondary text-sm">
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-border-primary border-t-transparent"
        aria-hidden
      />
      {label ?? 'Loading…'}
    </div>
  );
}

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-border-primary bg-bg-danger px-3 py-2 text-sm text-fg-primary">
      {message}
    </div>
  );
}

export function SuccessAlert({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-green-500 bg-green-50 px-3 py-2 text-sm text-green-700">
      {message}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border-tertiary bg-bg-secondary px-4 py-8 text-center text-fg-secondary text-sm">
      <div className="font-medium text-fg-primary">{title}</div>
      {hint ? <div className="ds-muted mt-2">{hint}</div> : null}
    </div>
  );
}
