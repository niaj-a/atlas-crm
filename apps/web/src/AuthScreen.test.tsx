import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import { createAppCache } from './apolloCache';
import App from './App';
import auth from './authSlice';
import { CUSTOMERS, LOGIN, REGISTER } from './graphql';
import type { RootState } from './store';

const authUser = {
  __typename: 'User' as const,
  id: '1',
  name: 'Ada',
  email: 'ada@example.com',
  role: 'sales',
};

function renderApp(mocks: MockedResponse[], preloaded?: Partial<RootState>) {
  const store = configureStore({
    reducer: { auth },
    preloadedState: {
      auth: preloaded?.auth ?? { token: null, user: null },
    },
  });

  return render(
    <Provider store={store}>
      <MockedProvider mocks={mocks} cache={createAppCache()}>
        <App />
      </MockedProvider>
    </Provider>,
  );
}

describe('AuthScreen', () => {
  it('signs in and shows the dashboard when login returns a session', async () => {
    renderApp([
      {
        request: {
          query: LOGIN,
