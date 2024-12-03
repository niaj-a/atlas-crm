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
            login: {
              __typename: 'AuthPayload',
              token: 'jwt-token',
              user: authUser,
            },
          },
        },
      },
      {
        request: { query: CUSTOMERS },
        result: { data: { customers: [] } },
      },
    ]);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Customers')).toBeInTheDocument();
    });
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
  });

  it('shows an accessible error when login payload is missing', async () => {
    renderApp([
      {
        request: {
          query: LOGIN,
          variables: { input: { email: 'ada@example.com', password: 'secret' } },
        },
        result: { data: { login: null } },
      },
    ]);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

