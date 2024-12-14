import { beforeEach, describe, expect, it } from 'vitest';
import reducer, { loadPersistedSession, logout, setSession } from './authSlice';

const session = {
  token: 'jwt-token',
  user: { id: '1', name: 'Ada', email: 'ada@example.com', role: 'sales' },
};

describe('authSlice', () => {
  beforeEach(() => localStorage.clear());

  it('stores and clears an authenticated session', () => {
    const authenticated = reducer({ token: null, user: null }, setSession(session));
    expect(authenticated.token).toBe('jwt-token');
    expect(localStorage.getItem('crm.session')).toContain('jwt-token');
    expect(reducer(authenticated, logout())).toEqual({ token: null, user: null });
    expect(localStorage.getItem('crm.session')).toBeNull();
  });

  it('hydrates a valid persisted session', () => {
    localStorage.setItem('crm.session', JSON.stringify(session));
    expect(loadPersistedSession()).toEqual(session);
  });

  it('clears corrupted persisted session data', () => {
    localStorage.setItem('crm.session', '{not-json');
    expect(loadPersistedSession()).toEqual({ token: null, user: null });
    expect(localStorage.getItem('crm.session')).toBeNull();
  });

  it('rejects persisted sessions with an incomplete user', () => {
    localStorage.setItem('crm.session', JSON.stringify({ token: 'x', user: { email: 'a@b.com' } }));
    expect(loadPersistedSession()).toEqual({ token: null, user: null });
    expect(localStorage.getItem('crm.session')).toBeNull();
  });
});
