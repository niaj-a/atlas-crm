import { FormEvent, useId, useState } from 'react';
import { useMutation } from '@apollo/client';
import { setSession } from './authSlice';
import { LOGIN, REGISTER } from './graphql';
import { useAppDispatch } from './store';
import type { LoginResult, RegisterResult } from './types';

export function AuthScreen() {
  const dispatch = useAppDispatch();
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const [login, loginState] = useMutation<LoginResult>(LOGIN);
  const [register, registerState] = useMutation<RegisterResult>(REGISTER);
  const busy = loginState.loading || registerState.loading;
  const apolloError = loginState.error ?? registerState.error;
  const errorMessage = formError ?? apolloError?.message ?? null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    try {
      if (mode === 'login') {
        const result = await login({
          variables: { input: { email: form.email, password: form.password } },
        });
        const payload = result.data?.login;
        if (!payload?.token || !payload.user) {
          setFormError('Sign in failed. Please try again.');
          return;
        }
        dispatch(setSession(payload));
        return;
      }

      const result = await register({ variables: { input: form } });
      const payload = result.data?.register;
      if (!payload?.token || !payload.user) {
        setFormError('Registration failed. Please try again.');
        return;
      }
      dispatch(setSession(payload));
    } catch {
      // Apollo surfaces GraphQL/network errors via mutation state.
    }
  }

  return (
    <main className="center">
      <section className="panel auth">
        <h1>Atlas CRM</h1>
        <p>Simple CRM for sales teams.</p>
        <form onSubmit={submit} noValidate>
          {mode === 'register' && (
            <div className="field">
              <label htmlFor={nameId}>Name</label>
              <input
                id={nameId}
                name="name"
                autoComplete="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          )}
          <div className="field">
            <label htmlFor={emailId}>Email</label>
            <input
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor={passwordId}>Password</label>
            <input
              id={passwordId}
              name="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button type="submit" disabled={busy} aria-busy={busy}>
            {busy
              ? mode === 'login'
                ? 'Signing in…'
                : 'Creating account…'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>
        <div className="status" role="status" aria-live="polite">
          {busy && (
            <p className="muted">{mode === 'login' ? 'Signing in…' : 'Creating account…'}</p>
          )}
        </div>
        <div role="alert" aria-live="assertive">
          {errorMessage && <p className="error">{errorMessage}</p>}
        </div>
        <button
          type="button"
          className="link"
          onClick={() => {
            setFormError(null);
            setMode(mode === 'login' ? 'register' : 'login');
          }}
        >
          {mode === 'login' ? 'Need an account?' : 'Already registered?'}
        </button>
      </section>
    </main>
  );
}
