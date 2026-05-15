import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegister } from '@/hooks/useAuth';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ErrorAlert } from '@/components/Feedback';
import { getErrorMessage } from '@/api/client';
import type { RegisterBody } from '@/api/auth';

export function SignupPage() {
  const navigate = useNavigate();
  const register = useRegister();
  const [form, setForm] = useState<RegisterBody>({
    email: '',
    password: '',
    globalRole: 'USER',
    name: undefined,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await register.mutateAsync({
        ...form,
        name: form.name?.trim() ? form.name.trim() : undefined,
      });
      void navigate('/app');
    } catch {
      /* surfaced below */
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="ds-card w-full max-w-md">
        <h1 className="ds-title">Create account</h1>
        <p className="ds-muted mt-1">
          Sign up selects your platform role (ADMIN or USER). No tenant is granted until a platform ADMIN assigns CREATOR/APPROVER
          scopes.
        </p>
        <form className="ds-stack mt-5" onSubmit={onSubmit}>
          <label className="ds-stack gap-1">
            <span className="text-xs text-fg-secondary">Email</span>
            <Input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </label>
          <label className="ds-stack gap-1">
            <span className="text-xs text-fg-secondary">Display name (optional)</span>
            <Input value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value || undefined }))} />
          </label>
          <label className="ds-stack gap-1">
            <span className="text-xs text-fg-secondary">Password</span>
            <Input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={8}
            />
          </label>
          <label className="ds-stack gap-1">
            <span className="text-xs text-fg-secondary">Platform role</span>
            <select
              className="rounded-md border border-border-secondary bg-bg-secondary px-2 py-2 text-sm text-fg-primary"
              value={form.globalRole}
              onChange={(e) => setForm((f) => ({ ...f, globalRole: e.target.value as RegisterBody['globalRole'] }))}
            >
              <option value="USER">USER (standard)</option>
              <option value="ADMIN">ADMIN (full platform access)</option>
            </select>
          </label>
          {register.isError ? <ErrorAlert message={getErrorMessage(register.error)} /> : null}
          <Button type="submit" className="w-full" disabled={register.isPending}>
            {register.isPending ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
        <p className="ds-muted mt-4 text-center text-xs">
          Already have an account?{' '}
          <Link className="text-fg-secondary underline" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
