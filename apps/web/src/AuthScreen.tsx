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
