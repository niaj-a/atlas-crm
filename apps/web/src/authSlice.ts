import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AuthPayload, AuthState, User } from './types';

const SESSION_KEY = 'crm.session';

function isUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false;
  const user = value as Record<string, unknown>;
  return (
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    typeof user.role === 'string'
  );
}

export function loadPersistedSession(): AuthState {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return { token: null, user: null };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      localStorage.removeItem(SESSION_KEY);
      return { token: null, user: null };
    }
    const session = parsed as Record<string, unknown>;
    if (typeof session.token === 'string' && isUser(session.user)) {
      return { token: session.token, user: session.user };
    }
  } catch {
    // Corrupted storage should not break boot.
  }
  localStorage.removeItem(SESSION_KEY);
  return { token: null, user: null };
}

const initialState: AuthState = loadPersistedSession();

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<AuthPayload>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      localStorage.setItem(SESSION_KEY, JSON.stringify(action.payload));
    },
    logout(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem(SESSION_KEY);
    },
  },
});

export const { setSession, logout } = slice.actions;
export default slice.reducer;
