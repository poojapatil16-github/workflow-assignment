import { useMemo, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useItem, useTransitionItem } from '@/hooks/useItems';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';
import { Spinner, ErrorAlert, SuccessAlert } from '@/components/Feedback';
import { getErrorMessage } from '@/api/client';
import { useTenantCapabilities } from '@/hooks/useTenantCapabilities';
import { useSlaBreaches, useEscalateItem } from '@/hooks/useSla';

type TransitionOut = {
  id: string;
  name: string;
  fromStateId: string;
  toStateId: string;
  requiresApproval?: boolean;
};

export function ItemDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { hasCreator } = useTenantCapabilities();
  const itemQ = useItem(id);
  const transitionMu = useTransitionItem(id);
  const slaQ = useSlaBreaches();
  const escalateMu = useEscalateItem();
  const [comment, setComment] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const item = itemQ.data;
  const status = (item as any)?.status as string | undefined;
  const isTerminal = status === 'APPROVED' || status === 'REJECTED' || status === 'COMPLETED';

  const breaches = useMemo(() => {
    if (!slaQ.data || !id) return [];
    return (slaQ.data as any[]).filter((b) => b.item.id === id);
  }, [slaQ.data, id]);

  const wfv = item?.workflowVersion as
    | { transitions?: TransitionOut[]; states?: { id: string; name: string; isTerminal?: boolean }[] }
    | undefined;

  const outgoing = useMemo(() => {
    if (!item || !wfv?.transitions || isTerminal) return [];
    return wfv.transitions.filter((t) => t.fromStateId === item.currentStateId);
  }, [item, wfv?.transitions, isTerminal]);

  const stateName = (sid: string) => wfv?.states?.find((s) => s.id === sid)?.name ?? sid.slice(0, 8);

  const recent = (item?.transitions as unknown[] | undefined) ?? [];

  return (
    <div>
      <PageHeader
        title={item?.title?.trim() ? String(item.title) : 'Item'}
        description={
          hasCreator
            ? 'Advance the item along a transition; the server verifies your version before moving.'
            : 'View item context — execute transitions requires CREATOR in this tenant.'
        }
        actions={
          <Link to="/app/items" className="text-sm text-fg-secondary underline">
            ← Items
          </Link>
        }
      />
      {itemQ.isLoading ? <Spinner /> : null}
      {itemQ.error ? <ErrorAlert message={getErrorMessage(itemQ.error)} /> : null}
      {item ? (
        <div className="ds-stack mt-4">
          <div className="ds-row flex-wrap">
            <Badge >clientVersion {item.version}</Badge>
            <Badge >
              {status ?? 'ACTIVE'}
            </Badge>
            <Badge >state: {(item.currentState as { name?: string } | undefined)?.name ?? '—'}</Badge>
            <Badge >{String((item.workflowVersion as { status?: string } | undefined)?.status ?? '')}</Badge>
          </div>

          {successMsg ? <SuccessAlert message={successMsg} /> : null}

          {breaches.length > 0 && (
            <Card title="SLA Breaches" >
              <ul className="ds-stack">
                {breaches.map((b, idx) => (
                  <li key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-red-600 font-medium">
                      SLA Breached: {b.rule.name} (Overdue by {b.overdueByMinutes} min)
                    </span>
                    <Button
                      
                      variant="ghost"
                      disabled={escalateMu.isPending}
                      onClick={async () => {
                        await escalateMu.mutateAsync({ itemId: id, slaRuleId: b.rule.id });
                        setSuccessMsg('Escalation email sent successfully');
                      }}
                    >
                      Escalate
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {isTerminal && (
            <Card>
              <div className="text-center py-4">
                <div className="text-lg font-bold text-fg-primary">Workflow Closed</div>
                <div className="text-sm text-fg-secondary">This item has reached a terminal state ({status}).</div>
              </div>
            </Card>
          )}

          {!isTerminal && (
            <Card title={hasCreator ? 'Available transitions (from current state)' : 'Outgoing transitions (view only)'}>
              {outgoing.length ? (
                <ul className="ds-stack">
                  {outgoing.map((t) => (
                    <li key={t.id} className="flex flex-col gap-2 rounded-md border border-border-tertiary p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-medium text-fg-primary">{t.name}</div>
                        <div className="ds-muted">
                          → {stateName(t.toStateId)}
                          {t.requiresApproval ? ' · approval' : ''}
                        </div>
                      </div>
                      {hasCreator ? (
                        <Button
                          type="button"
                          variant="primary"
                          disabled={transitionMu.isPending}
                          onClick={async () => {
                            const res = await transitionMu.mutateAsync({
                              body: {
                                transitionId: t.id,
                                clientVersion: item.version,
                                comment: comment.trim() || undefined,
                              },
                            });
                            if ((res as any).status === 'PENDING_APPROVAL') {
                              setSuccessMsg('Item sent for approval');
                            } else {
                              setSuccessMsg('Item moved to next step');
                            }
                            setComment('');
                          }}
                        >
                          Apply Transition
                        </Button>
                      ) : (
                        <span className="text-xs text-fg-tertiary">CREATOR role required</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ds-muted">No outgoing transitions from this state.</p>
              )}
              {hasCreator ? (
                <>
                  <label className="ds-stack mt-4 gap-1">
                    <span className="text-xs text-fg-secondary">Optional comment (all transitions)</span>
                    <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment" />
                  </label>
                  {transitionMu.isError ? <ErrorAlert message={getErrorMessage(transitionMu.error)} /> : null}
                </>
              ) : null}
            </Card>
          )}

          <Card title="Recent transitions (server)">
            <ul className="ds-stack text-sm">
              {recent.slice(0, 20).map((row, idx) => {
                const r = row as { id?: string; createdAt?: string; transitionId?: string };
                return (
                  <li key={r.id ?? `t-${idx}`} className="border-b border-border-tertiary py-2">
                    <span className="text-fg-primary">{String(r.createdAt ?? '')}</span>
                    <span className="ds-muted ml-2">{String(r.transitionId ?? r.id ?? '')}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
