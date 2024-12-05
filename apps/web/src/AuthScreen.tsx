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
