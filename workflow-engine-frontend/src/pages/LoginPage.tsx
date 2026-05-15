import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin } from '@/hooks/useAuth';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ErrorAlert } from '@/components/Feedback';
import { getErrorMessage } from '@/api/client';
import type { LoginBody } from '@/api/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const [form, setForm] = useState<LoginBody>({ email: '', password: '' });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login.mutateAsync(form);
      void navigate('/app');
    } catch (err) {
      /* surfaced below */
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="ds-card w-full max-w-md">
        <h1 className="ds-title">Sign in</h1>
        <p className="ds-muted mt-1">Use your account email and password.</p>
        <form className="ds-stack mt-5" onSubmit={onSubmit}>
          <label className="ds-stack gap-1">
            <span className="text-xs text-fg-secondary">Email</span>
            <Input
              type="email"
              autoComplete="username"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </label>
          <label className="ds-stack gap-1">
            <span className="text-xs text-fg-secondary">Password</span>
            <Input
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
            />
          </label>
          {login.isError ? <ErrorAlert message={getErrorMessage(login.error)} /> : null}
          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="ds-muted mt-4 text-center text-xs">
          New user?{' '}
          <Link className="text-fg-secondary underline" to="/signup">
            Sign up with ADMIN or USER
          </Link>
        </p>
      </div>
    </div>
  );
}
