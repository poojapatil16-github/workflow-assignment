import type { ReactNode } from 'react';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-fg-primary">{title}</h1>
        {description ? <p className="ds-muted mt-1 max-w-2xl">{description}</p> : null}
      </div>
      {actions}
    </header>
  );
}
