import type { ReactNode } from 'react';

export function Card({
  title,
  children,
  actions,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`ds-card ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3">
          {title ? <h2 className="ds-title">{title}</h2> : <span />}
          {actions}
        </div>
      )}
      <div className={title || actions ? 'ds-section' : ''}>{children}</div>
    </section>
  );
}
