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
