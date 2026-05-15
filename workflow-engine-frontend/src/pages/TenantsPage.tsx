import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTenants, useCreateTenant } from '@/hooks/useTenants';
import { useTenantCapabilities } from '@/hooks/useTenantCapabilities';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Spinner, ErrorAlert } from '@/components/Feedback';
import { getErrorMessage } from '@/api/client';

export function TenantsPage() {
  const { data, isLoading, error } = useTenants();
  const create = useCreateTenant();
  const { isGlobalAdmin } = useTenantCapabilities();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  return (
    <div>
      <PageHeader
        title="Tenants"
        description={
          isGlobalAdmin
            ? 'Create organizations and assign CREATOR/APPROVER roles via Members.'
            : 'Organizations you belong to.'
        }
      />
      {isLoading ? <Spinner /> : null}
      {error ? <ErrorAlert message={getErrorMessage(error)} /> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        {isGlobalAdmin ? (
          <Card title="Create Tenant" className="lg:col-span-1">
            <form
              className="ds-stack"
              onSubmit={async (e) => {
                e.preventDefault();
                await create.mutateAsync({ name, slug });
                setName('');
                setSlug('');
              }}
            >
              <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
              <Input placeholder="slug-lowercase" value={slug} onChange={(e) => setSlug(e.target.value)} required />
              {create.isError ? <ErrorAlert message={getErrorMessage(create.error)} /> : null}
              <Button type="submit" disabled={create.isPending}>
                Create Tenant
              </Button>
            </form>
          </Card>
        ) : null}
        <Card title="Tenants you can reach" className={isGlobalAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <ul className="ds-stack">
            {data?.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-md border border-border-tertiary px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium text-fg-primary">{t.name}</div>
                  <div className="ds-muted">{t.slug}</div>
                </div>
                {isGlobalAdmin ? (
                  <Link className="text-xs text-fg-secondary underline" to={`/app/tenants/${t.id}/members`}>
                    Members →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
